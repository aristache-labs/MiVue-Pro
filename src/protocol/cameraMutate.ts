import { MiVueProtocolError } from "./errors.js";
import type { Transport, TransportResponse } from "../transport/types.js";
import { parseConfigResponse } from "./parser.js";
import type { ConfigResponse } from "./types.js";

export interface CgiProbeResult {
  readonly action: string;
  readonly path: string;
  readonly statusCode: number;
  readonly bodyText: string;
  readonly parsed?: ConfigResponse;
}

/**
 * Properties allowed for action=set when MIVUE_ALLOW_MUTATE=1.
 * Live MiVue 866: UIMode=PLAYBACK → 0 OK; MENU/UNKNOWN → 701 Illegal Parameter.
 */
export const SETTABLE_PROPERTIES = Object.freeze([
  "Camera.Menu.UIMode",
] as const);

/** Known-good values per settable property (866 live). */
export const SETTABLE_PROPERTY_VALUES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "Camera.Menu.UIMode": Object.freeze(["PLAYBACK"]),
});

/** @deprecated use SETTABLE_PROPERTIES */
export const CONFIRMED_SET_PROPERTIES = SETTABLE_PROPERTIES;

export function assertRemoteSdPath(remotePath: string): void {
  if (!remotePath.startsWith("/SD/") || remotePath.includes("..") || /[\r\n]/.test(remotePath)) {
    throw new MiVueProtocolError(
      remotePath.includes("...")
        ? "Cale invalidă: folosește un path real, ex. /SD/Parking/F/PARK….MP4 (nu /SD/...)"
        : "Unsafe remote file path",
    );
  }
}

export function isMutateAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MIVUE_ALLOW_MUTATE === "1";
}

export function assertMutateAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (!isMutateAllowed(env)) {
    throw new MiVueProtocolError("Mutate dezactivat: setează MIVUE_ALLOW_MUTATE=1");
  }
}

export function truncateBody(text: string, max = 400): string {
  const normalized = text.replaceAll("\r", "").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

export function buildCgiPath(action: string, params: Readonly<Record<string, string>>): string {
  const query = new URLSearchParams({ action, ...params });
  return `/cgi-bin/Config.cgi?${query.toString()}`;
}

export async function probeCgi(
  transport: Transport,
  action: string,
  params: Readonly<Record<string, string>>,
  signal?: AbortSignal,
): Promise<CgiProbeResult> {
  const path = buildCgiPath(action, params);
  const response = await transport.request({
    method: "GET",
    path,
    ...(signal === undefined ? {} : { signal }),
  });
  const bodyText = decodeBody(response);
  let parsed: ConfigResponse | undefined;
  try {
    parsed = parseConfigResponse(bodyText);
  } catch {
    parsed = undefined;
  }
  return {
    action,
    path,
    statusCode: response.statusCode,
    bodyText: truncateBody(bodyText),
    ...(parsed === undefined ? {} : { parsed }),
  };
}

export async function setCameraProperty(
  transport: Transport,
  property: string,
  value: string,
  options?: { signal?: AbortSignal; requireAllowlist?: boolean },
): Promise<CgiProbeResult> {
  if (!property || /[\r\n&=]/.test(property)) {
    throw new MiVueProtocolError("Property invalidă");
  }
  if (/[\r\n]/.test(value)) {
    throw new MiVueProtocolError("Value invalidă");
  }
  if (options?.requireAllowlist && !(SETTABLE_PROPERTIES as readonly string[]).includes(property)) {
    throw new MiVueProtocolError(`Property ${property} nu e în allowlist`);
  }
  return probeCgi(transport, "set", { property, value }, options?.signal);
}

export async function deleteRemoteFile(
  transport: Transport,
  remotePath: string,
  signal?: AbortSignal,
): Promise<CgiProbeResult> {
  assertRemoteSdPath(remotePath);
  return probeCgi(transport, "del", { property: remotePath }, signal);
}

function decodeBody(response: TransportResponse): string {
  return new TextDecoder().decode(response.body);
}
