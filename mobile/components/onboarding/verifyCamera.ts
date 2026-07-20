import { isPrivateIpv4 } from "../../packages/camera-transport/src/index";
import type { Transport } from "../../packages/camera-transport/src/index";
import { CameraClient } from "../../packages/protocol/src/index";
import { ProtocolParseError } from "../../packages/parsers/src/index";

import type { CameraProfile, VerifyResult, VerifyUiState } from "./onboardingTypes";

export const VERIFY_IN_PROGRESS = "A camera check is already in progress.";

export function canStartVerify(inflight: boolean): boolean {
  return !inflight;
}

/** Reject captive portals / HTML login pages before protocol parse. */
export function looksLikeHtmlOrCaptivePortal(raw: string): boolean {
  const sample = raw.slice(0, 800).toLowerCase();
  return (
    sample.includes("<!doctype") ||
    sample.includes("<html") ||
    sample.includes("<head") ||
    /<\s*title[^>]*>\s*(login|sign in|wifi|gateway)/i.test(sample) ||
    sample.includes("captive") ||
    sample.includes("hotspot-detect")
  );
}

export function classifyVerifyError(message: string): Exclude<
  VerifyUiState,
  "idle" | "waitingForWifi" | "checking" | "connected" | "needsModelConfirm"
> {
  const m = message.toLowerCase();
  if (
    m.includes("local network") ||
    m.includes("permission") ||
    m.includes("denied") ||
    m.includes("not authorized")
  ) {
    return "permissionDenied";
  }
  if (m.includes("timeout") || m.includes("timed out") || m.includes("aborted")) {
    return "timedOut";
  }
  if (m.includes("private ipv4") || m.includes("wrong network") || m.includes("host must")) {
    return "wrongNetwork";
  }
  if (
    m.includes("invalid camera") ||
    m.includes("html") ||
    m.includes("captive") ||
    m.includes("protocol") ||
    m.includes("rejected property") ||
    m.includes("config response")
  ) {
    return "invalidCameraResponse";
  }
  return "cameraUnreachable";
}

export function shouldConfirmModelMismatch(options: {
  readonly profile: CameraProfile;
  readonly serverHeader?: string;
  readonly propertyKeys: readonly string[];
}): boolean {
  if (options.profile.id !== "mivue-866") return false;
  const server = (options.serverHeader ?? "").toLowerCase();
  const hasAit = server.includes("ait") || server.includes("multimedia");
  const hasCameraKeys = options.propertyKeys.some(
    (k) => k.startsWith("Camera.") || k.startsWith("Vendor."),
  );
  // Unexpected if we got OK status but neither AIT-ish server nor camera property keys.
  if (!hasAit && !hasCameraKeys && options.propertyKeys.length === 0) return true;
  return false;
}

export type VerifyDeps = {
  readonly createTransport: (host: string, timeoutMs: number) => Transport;
  readonly timeoutMs?: number;
};

let verifyInflight = false;

/** Test helper — reset single-flight gate. */
export function __resetVerifyGateForTests(): void {
  verifyInflight = false;
}

export async function verifyCameraConnection(options: {
  readonly host: string;
  readonly profile: CameraProfile;
  readonly signal?: AbortSignal;
  readonly deps: VerifyDeps;
}): Promise<VerifyResult> {
  if (!canStartVerify(verifyInflight)) {
    return { ok: false, state: "cameraUnreachable", error: VERIFY_IN_PROGRESS };
  }

  const host = options.host.trim();
  if (!isPrivateIpv4(host)) {
    return {
      ok: false,
      state: "wrongNetwork",
      error: "Host must be a private IPv4 address (e.g. 192.72.1.1).",
    };
  }

  verifyInflight = true;
  const timeoutMs = options.deps.timeoutMs ?? 12_000;
  try {
    if (options.signal?.aborted) {
      return { ok: false, state: "timedOut", error: "Cancelled." };
    }

    const transport = options.deps.createTransport(host, timeoutMs);
    const client = new CameraClient({ host, httpPort: 80, rtspPort: 554 }, transport);

    // Peek raw via status; CameraClient already parses — also guard HTML on thrown parse.
    const status = await client.getStatus(options.signal);
    const rawJoined = Object.entries(status.properties)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    if (looksLikeHtmlOrCaptivePortal(status.raw) || looksLikeHtmlOrCaptivePortal(rawJoined)) {
      return { ok: false, state: "invalidCameraResponse", error: "Unexpected HTML response." };
    }

    const propertyKeys = Object.keys(status.properties);
    const needsModelConfirm = shouldConfirmModelMismatch({
      profile: options.profile,
      propertyKeys,
      // Server header not always on ConfigResponse — optional confirm path stays conservative.
    });

    return {
      ok: true,
      host,
      detectedModelHint: options.profile.displayName,
      needsModelConfirm,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof ProtocolParseError || looksLikeHtmlOrCaptivePortal(message)) {
      return { ok: false, state: "invalidCameraResponse", error: message };
    }
    if (options.signal?.aborted) {
      return { ok: false, state: "timedOut", error: "Cancelled." };
    }
    return { ok: false, state: classifyVerifyError(message), error: message };
  } finally {
    verifyInflight = false;
  }
}
