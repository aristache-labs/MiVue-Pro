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

/** Properties fetched for dashboard “Administrare cameră” (get; skip on 7xx). */
export const READABLE_CAMERA_PROPERTIES = Object.freeze([
  "broadcast",
  "Camera.Menu.UIMode",
  "Camera.Menu.VideoRes",
  "Camera.Menu.GSensor",
  "Camera.Menu.HDR",
  "Camera.Menu.EV",
  "Camera.Menu.LCDPower",
  "Camera.Preview.Source.1.Camid",
  "Vendor.DeviceInfo.1080P",
  "Vendor.DeviceInfo.LiveView",
  "Vendor.DeviceInfo.SupportMjpegStream",
] as const);

/**
 * Properties allowed for action=set when MIVUE_ALLOW_MUTATE=1.
 * UIMode PLAYBACK/VIDEO confirmed on 866; others are candidates from live get values.
 */
export const SETTABLE_PROPERTIES = Object.freeze([
  "Camera.Menu.UIMode",
  "Camera.Menu.VideoRes",
  "Camera.Menu.GSensor",
  "Camera.Menu.HDR",
  "Camera.Menu.EV",
  "Camera.Menu.LCDPower",
] as const);

/** Dropdown values per settable property. */
export const SETTABLE_PROPERTY_VALUES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "Camera.Menu.UIMode": Object.freeze(["VIDEO", "PLAYBACK"]),
  "Camera.Menu.VideoRes": Object.freeze(["1080P60", "1080P30", "720P60", "720P30"]),
  "Camera.Menu.GSensor": Object.freeze(["OFF", "LEVEL1", "LEVEL2", "LEVEL3"]),
  "Camera.Menu.HDR": Object.freeze(["ON", "OFF"]),
  "Camera.Menu.EV": Object.freeze(["EV-2", "EV-1", "EV0", "EV+1", "EV+2"]),
  "Camera.Menu.LCDPower": Object.freeze(["OFF", "30SEC", "1MIN", "3MIN", "ALWAYS"]),
});

/** Short labels for settings UI. */
export const CAMERA_PROPERTY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  broadcast: "Broadcast",
  "Camera.Menu.UIMode": "Mod UI",
  "Camera.Menu.VideoRes": "Rezoluție",
  "Camera.Menu.GSensor": "G-Sensor",
  "Camera.Menu.HDR": "HDR",
  "Camera.Menu.EV": "Expunere (EV)",
  "Camera.Menu.LCDPower": "Ecran LCD",
  "Camera.Preview.Source.1.Camid": "Cameră activă",
  "Vendor.DeviceInfo.1080P": "1080P device",
  "Vendor.DeviceInfo.LiveView": "Live view",
  "Vendor.DeviceInfo.SupportMjpegStream": "MJPEG stream",
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
