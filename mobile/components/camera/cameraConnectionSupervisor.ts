/**
 * Camera connection supervisor — stale-while-revalidate health checks.
 * Pure helpers + a short GET status probe. Never lists files or settings.
 */

import { isPrivateIpv4, type Transport } from "@/packages/camera-transport/src/index";
import { CameraClient } from "@/packages/protocol/src/index";
import { ProtocolParseError } from "@/packages/parsers/src/index";

import { looksLikeHtmlOrCaptivePortal } from "@/components/onboarding/verifyCamera";
import type { CameraLinkState } from "@/components/camera/cameraLibraryModel";

/** Foreground resume debounce before a silent health check (800–1200 ms). */
export const FOREGROUND_VERIFY_DEBOUNCE_MS = 1_000;
/** Skip a new verify if the last success is newer than this. */
export const VERIFY_SKIP_IF_RECENT_MS = 5_000;
/** Short health-check transport timeout. */
export const CAMERA_HEALTH_TIMEOUT_MS = 2_500;
/** Retry after first consecutive failure while keeping files. */
export const VERIFY_RETRY_AFTER_FIRST_FAILURE_MS = 1_750;
/** Periodic health check while AppState is active and linked. */
export const ACTIVE_POLL_INTERVAL_MS = 12_000;
/** Failures before clearing the remote library / showing disconnected. */
export const MAX_VERIFY_FAILURES_BEFORE_CLEAR = 2;

const RECONNECT_BACKOFF_MS = Object.freeze([2_000, 5_000, 10_000, 20_000, 30_000]);

export function isAppForegroundResume(
  prev: string | null | undefined,
  next: string | null | undefined,
): boolean {
  if (next !== "active") return false;
  return prev === "background" || prev === "inactive" || prev === "unknown" || prev === "extension";
}

export function shouldSkipVerifyBecauseRecent(
  lastVerifiedAtMs: number | undefined,
  nowMs: number,
  windowMs = VERIFY_SKIP_IF_RECENT_MS,
): boolean {
  if (lastVerifiedAtMs === undefined) return false;
  return nowMs - lastVerifiedAtMs < windowMs;
}

export type HealthCheckBusyGate = {
  readonly verifyInflight: boolean;
  readonly refreshInflight: boolean;
  readonly settingApplyInflight: boolean;
  readonly hasActiveDownload: boolean;
};

/** Skip starting a health check when another camera op owns the link. */
export function isBusyForHealthCheck(gate: HealthCheckBusyGate): boolean {
  return (
    gate.verifyInflight ||
    gate.refreshInflight ||
    gate.settingApplyInflight ||
    gate.hasActiveDownload
  );
}

export function linkStateAfterVerifyFailure(consecutiveFailures: number): CameraLinkState {
  if (consecutiveFailures >= MAX_VERIFY_FAILURES_BEFORE_CLEAR) return "connection_lost";
  return "unstable";
}

export function shouldClearLibraryAfterFailures(consecutiveFailures: number): boolean {
  return consecutiveFailures >= MAX_VERIFY_FAILURES_BEFORE_CLEAR;
}

/** Backoff for automatic full reconnect while disconnected (caps at 30s). */
export function nextReconnectBackoffMs(attemptIndex: number): number {
  const i = Math.max(0, Math.min(attemptIndex, RECONNECT_BACKOFF_MS.length - 1));
  return RECONNECT_BACKOFF_MS[i]!;
}

export function shouldRunActiveHealthPoll(input: {
  readonly appState: string;
  readonly demoMode: boolean;
  readonly linkState: CameraLinkState;
}): boolean {
  if (input.demoMode) return false;
  if (input.appState !== "active") return false;
  return input.linkState === "connected" || input.linkState === "unstable";
}

export function shouldRunDisconnectedReconnect(input: {
  readonly appState: string;
  readonly demoMode: boolean;
  readonly linkState: CameraLinkState;
}): boolean {
  if (input.demoMode) return false;
  if (input.appState !== "active") return false;
  return input.linkState === "disconnected" || input.linkState === "connection_lost";
}

/**
 * Accept a Config.cgi status body as camera-like (not captive portal / HTML).
 * Empty `status=` is valid on MiVue 866.
 */
export function isCameraLikeStatusResponse(input: {
  readonly raw: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly code: number;
  readonly message: string;
}): boolean {
  if (input.code !== 0) return false;
  if (input.message.toUpperCase() !== "OK") return false;
  if (looksLikeHtmlOrCaptivePortal(input.raw)) return false;
  const joined = Object.entries(input.properties)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  if (looksLikeHtmlOrCaptivePortal(joined)) return false;
  return true;
}

export type VerifyCameraReachabilityResult =
  | {
      readonly ok: true;
      readonly host: string;
      readonly properties: Readonly<Record<string, string>>;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export type VerifyCameraReachabilityDeps = {
  readonly createTransport: (host: string, timeoutMs: number) => Transport;
  readonly timeoutMs?: number;
};

let reachabilityInflight = false;

/** Test helper — reset module single-flight gate. */
export function __resetReachabilityGateForTests(): void {
  reachabilityInflight = false;
}

/**
 * Silent health check: GET status only. Does not list files, fetch settings,
 * or touch Queue transport. Caller applies session/host guards before mutating UI.
 */
export async function verifyCameraReachability(options: {
  readonly host: string;
  readonly signal?: AbortSignal;
  readonly deps: VerifyCameraReachabilityDeps;
}): Promise<VerifyCameraReachabilityResult> {
  if (reachabilityInflight) {
    return { ok: false, error: "A camera health check is already in progress." };
  }

  const host = options.host.trim();
  if (!isPrivateIpv4(host)) {
    return { ok: false, error: "Host must be a private IPv4 address (e.g. 192.72.1.1)." };
  }

  reachabilityInflight = true;
  const timeoutMs = options.deps.timeoutMs ?? CAMERA_HEALTH_TIMEOUT_MS;
  try {
    if (options.signal?.aborted) {
      return { ok: false, error: "Cancelled." };
    }
    const transport = options.deps.createTransport(host, timeoutMs);
    const client = new CameraClient({ host, httpPort: 80, rtspPort: 554 }, transport);
    const status = await client.getStatus(options.signal);
    if (
      !isCameraLikeStatusResponse({
        raw: status.raw,
        properties: status.properties,
        code: status.code,
        message: status.message,
      })
    ) {
      return { ok: false, error: "Unexpected camera response." };
    }
    return { ok: true, host, properties: status.properties };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof ProtocolParseError || looksLikeHtmlOrCaptivePortal(message)) {
      return { ok: false, error: message };
    }
    return { ok: false, error: message };
  } finally {
    reachabilityInflight = false;
  }
}
