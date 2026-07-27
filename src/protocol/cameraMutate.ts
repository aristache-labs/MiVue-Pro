import { MiVueProtocolError } from "./errors.js";
import type { Transport, TransportRequest, TransportResponse } from "../transport/types.js";
import { TransportError } from "../transport/types.js";
import { parseConfigResponse } from "./parser.js";
import type { ConfigResponse } from "./types.js";

export interface CgiProbeResult {
  readonly action: string;
  readonly path: string;
  readonly statusCode: number;
  readonly bodyText: string;
  readonly parsed?: ConfigResponse;
}

export interface ProbeCgiOptions {
  readonly signal?: AbortSignal;
  /** Mutating CGI must pass `"mutation"` so transport never retries. */
  readonly retryPolicy?: TransportRequest["retryPolicy"];
  /** When true: HTTP 2xx + CGI code 0 + message OK required. */
  readonly requireCgiSuccess?: boolean;
}

/** Properties fetched for dashboard “Administrare cameră” (get; skip on 7xx). */
export const READABLE_CAMERA_PROPERTIES = Object.freeze([
  "broadcast",
  "Camera.Menu.Flicker",
  "Camera.Menu.EV",
  "Camera.Menu.RtcGps",
  "Camera.Menu.RtcTimezone",
  "Camera.Menu.RtcDaylight",
  "Camera.Preview.MJPEG.TimeStamp.*",
  "Camera.Preview.Source.1.Camid",
] as const);

/**
 * Properties allowed for action=set when MIVUE_ALLOW_MUTATE=1 / requireAllowlist.
 * Frequency, EV, Date&Time (mode / timezone / DST) — no VideoRes / GSensor / HDR / LCD.
 */
export const SETTABLE_PROPERTIES = Object.freeze([
  "Camera.Menu.Flicker",
  "Camera.Menu.EV",
  "Camera.Menu.RtcGps",
  "Camera.Menu.RtcTimezone",
  "Camera.Menu.RtcDaylight",
] as const);

/**
 * Wire names for CGI set (official app uses leaf forms).
 * Allowlist / UI keep Camera.Menu.* so get values match.
 */
export const SET_PROPERTY_WIRE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  "Camera.Menu.Flicker": "Flicker",
  "Camera.Menu.EV": "EV",
  "Camera.Menu.RtcGps": "RtcGps",
  "Camera.Menu.RtcTimezone": "RtcTimezone",
  "Camera.Menu.RtcDaylight": "RtcDaylight",
});

/** Official menu List.RtcTimezone (whole-hour offsets; UI shows GMT ±HH:00). */
export const RTC_TIMEZONE_VALUES = Object.freeze([
  "M12",
  "M11",
  "M10",
  "M09",
  "M08",
  "M07",
  "M06",
  "M05",
  "M04",
  "M03",
  "M02",
  "M01",
  "Z00",
  "P01",
  "P02",
  "P03",
  "P04",
  "P05",
  "P06",
  "P07",
  "P08",
  "P09",
  "P10",
  "P11",
  "P12",
] as const);

/** Dropdown values per settable property (CGI wire tokens). */
export const SETTABLE_PROPERTY_VALUES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "Camera.Menu.Flicker": Object.freeze(["50Hz", "60Hz"]),
  "Camera.Menu.EV": Object.freeze([
    "EVN100",
    "EVN067",
    "EVN033",
    "EV0",
    "EVP033",
    "EVP067",
    "EVP100",
  ]),
  "Camera.Menu.RtcGps": Object.freeze(["USEGPS", "MANUAL"]),
  "Camera.Menu.RtcTimezone": RTC_TIMEZONE_VALUES,
  "Camera.Menu.RtcDaylight": Object.freeze(["OFF", "P1HR", "P30MIN", "M1HR", "M30MIN"]),
});

/** UI labels matching official MiVue Pro screens (value → display). */
export const SETTABLE_VALUE_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  "Camera.Menu.EV": Object.freeze({
    EVN100: "-1.0",
    EVN067: "-0.67",
    EVN033: "-0.33",
    EV0: "0.0",
    EVP033: "+0.33",
    EVP067: "+0.67",
    EVP100: "+1.0",
  }),
  "Camera.Menu.RtcGps": Object.freeze({
    USEGPS: "GPS",
    MANUAL: "Manual (Sync Time with Phone)",
  }),
  "Camera.Menu.RtcTimezone": Object.freeze(
    Object.fromEntries(
      RTC_TIMEZONE_VALUES.map((token) => {
        if (token === "Z00") return [token, "GMT +00:00"];
        const sign = token.startsWith("M") ? "-" : "+";
        const hours = token.slice(1);
        return [token, `GMT ${sign}${hours}:00`];
      }),
    ),
  ),
  "Camera.Menu.RtcDaylight": Object.freeze({
    OFF: "off",
    P1HR: "(+) 1 hour",
    P30MIN: "(+) 30 min",
    M1HR: "(-) 1 hour",
    M30MIN: "(-) 30 min",
  }),
});

/** Short labels for settings UI. */
export const CAMERA_PROPERTY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  broadcast: "Broadcast",
  "Camera.Menu.Flicker": "Frequency",
  "Camera.Menu.EV": "EV",
  "Camera.Menu.RtcGps": "Date & Time",
  "Camera.Menu.RtcTimezone": "Time Zone",
  "Camera.Menu.RtcDaylight": "Daylight Saving Time",
  "Camera.Preview.MJPEG.TimeStamp.*": "Camera clock",
  "Camera.Preview.Source.1.Camid": "Cameră activă",
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

export function isForbiddenSetProperty(property: string): boolean {
  const leaf = property.includes(".") ? property.slice(property.lastIndexOf(".") + 1) : property;
  return leaf.toUpperCase() === "HDR" || property.toUpperCase().includes("CAMERA.MENU.HDR");
}

/**
 * Strict success for mutating CGI: HTTP 2xx, parsable body, code === 0, message OK.
 */
export function assertCgiMutationSuccess(
  statusCode: number,
  bodyText: string,
  parsed: ConfigResponse | undefined,
): asserts parsed is ConfigResponse {
  if (statusCode < 200 || statusCode >= 300) {
    throw new MiVueProtocolError(`Camera returned HTTP ${statusCode}`, statusCode);
  }
  if (parsed === undefined) {
    const preview = truncateBody(bodyText, 120);
    throw new MiVueProtocolError(
      preview.length === 0
        ? "CGI response empty or unparseable"
        : `CGI response unparseable: ${preview}`,
    );
  }
  if (parsed.code !== 0) {
    throw new MiVueProtocolError(`CGI ${parsed.code} ${parsed.message}`, statusCode);
  }
  if (parsed.message.toUpperCase() !== "OK") {
    throw new MiVueProtocolError(`CGI success message not OK: ${parsed.message}`, statusCode);
  }
}

function normalizeProbeOptions(
  signalOrOptions?: AbortSignal | ProbeCgiOptions,
): ProbeCgiOptions {
  if (signalOrOptions instanceof AbortSignal) {
    return { signal: signalOrOptions };
  }
  return signalOrOptions ?? {};
}

export async function probeCgi(
  transport: Transport,
  action: string,
  params: Readonly<Record<string, string>>,
  signalOrOptions?: AbortSignal | ProbeCgiOptions,
): Promise<CgiProbeResult> {
  const options = normalizeProbeOptions(signalOrOptions);
  const path = buildCgiPath(action, params);
  const response = await transport.request({
    method: "GET",
    path,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.retryPolicy === undefined ? {} : { retryPolicy: options.retryPolicy }),
  });
  const bodyText = decodeBody(response);
  let parsed: ConfigResponse | undefined;
  try {
    parsed = parseConfigResponse(bodyText);
  } catch {
    parsed = undefined;
  }
  const result: CgiProbeResult = {
    action,
    path,
    statusCode: response.statusCode,
    bodyText: truncateBody(bodyText),
    ...(parsed === undefined ? {} : { parsed }),
  };
  if (options.requireCgiSuccess) {
    assertCgiMutationSuccess(result.statusCode, bodyText, parsed);
  }
  return result;
}

function mutationTransportError(error: TransportError): MiVueProtocolError {
  const detail = error.causeCode ?? error.message;
  return new MiVueProtocolError(
    `Mutation result unknown after transport error (${detail}): `
      + "the camera may have applied the change; the command will not be retried automatically.",
  );
}

async function mutateCgi(
  transport: Transport,
  action: "set" | "del",
  params: Readonly<Record<string, string>>,
  signal?: AbortSignal,
): Promise<CgiProbeResult> {
  try {
    return await probeCgi(transport, action, params, {
      ...(signal === undefined ? {} : { signal }),
      retryPolicy: "mutation",
      requireCgiSuccess: true,
    });
  } catch (error) {
    if (error instanceof TransportError) {
      throw mutationTransportError(error);
    }
    throw error;
  }
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
  if (isForbiddenSetProperty(property)) {
    throw new MiVueProtocolError(`Property ${property} is forbidden for set (HDR crashes MiVue 866 CGI)`);
  }
  if (options?.requireAllowlist && !(SETTABLE_PROPERTIES as readonly string[]).includes(property)) {
    throw new MiVueProtocolError(`Property ${property} nu e în allowlist`);
  }
  const wireProperty = SET_PROPERTY_WIRE_NAMES[property] ?? property;
  return mutateCgi(transport, "set", { property: wireProperty, value }, options?.signal);
}

export async function deleteRemoteFile(
  transport: Transport,
  remotePath: string,
  signal?: AbortSignal,
): Promise<CgiProbeResult> {
  assertRemoteSdPath(remotePath);
  return mutateCgi(transport, "del", { property: remotePath }, signal);
}

/** Wire SET for SD format — apk-observed (`CameraCommand.commandFormatSDCard`). */
export const FORMAT_SD_WIRE_PROPERTY = "SD0";
export const FORMAT_SD_WIRE_VALUE = "format";
/** Status GET for pre/post checks — camera-confirmed READY on MiVue 866. */
export const FORMAT_SD_STATUS_PROPERTY = "Camera.Menu.SD0";

export type FormatSdCardOutcome = "success" | "failed" | "unknown";

export interface FormatSdCardResult extends CgiProbeResult {
  readonly outcome: FormatSdCardOutcome;
  readonly preStatus?: string;
  readonly postStatus?: string;
}

function sdStatusFromParsed(parsed: ConfigResponse | undefined): string | undefined {
  if (parsed === undefined) return undefined;
  const raw =
    parsed.properties[FORMAT_SD_STATUS_PROPERTY] ??
    parsed.properties[FORMAT_SD_WIRE_PROPERTY] ??
    Object.values(parsed.properties)[0];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isSdCardStatusReadyForFormat(status: string | undefined): boolean {
  return status?.trim().toUpperCase() === "READY";
}

/**
 * Destructive SD format. Never retries. Pre-requires Camera.Menu.SD0=READY.
 */
export async function formatSdCard(
  transport: Transport,
  signal?: AbortSignal,
): Promise<FormatSdCardResult> {
  const pre = await probeCgi(transport, "get", { property: FORMAT_SD_STATUS_PROPERTY }, signal);
  const preStatus = sdStatusFromParsed(pre.parsed);
  if (pre.parsed === undefined || pre.parsed.code !== 0) {
    throw new MiVueProtocolError(
      pre.parsed?.code === 703
        ? "Camera.Menu.SD0 unsupported (703) — format not sent"
        : "Could not read Camera.Menu.SD0 before format — format not sent",
    );
  }
  if (!isSdCardStatusReadyForFormat(preStatus)) {
    throw new MiVueProtocolError(
      `SD card not READY (status: ${preStatus ?? "unknown"}) — format not sent`,
    );
  }

  let setResult: CgiProbeResult | undefined;
  let transportDetail: string | undefined;
  try {
    setResult = await mutateCgi(
      transport,
      "set",
      { property: FORMAT_SD_WIRE_PROPERTY, value: FORMAT_SD_WIRE_VALUE },
      signal,
    );
  } catch (error) {
    if (error instanceof TransportError) {
      // Ambiguous: camera may still be formatting. Never retry SET; re-read status.
      transportDetail = error.causeCode ?? error.message;
    } else if (
      error instanceof MiVueProtocolError &&
      /Mutation result unknown after transport error/i.test(error.message)
    ) {
      transportDetail = error.message;
    } else {
      throw error;
    }
  }

  const path = buildCgiPath("set", {
    property: FORMAT_SD_WIRE_PROPERTY,
    value: FORMAT_SD_WIRE_VALUE,
  });
  const post = await probeCgi(transport, "get", { property: FORMAT_SD_STATUS_PROPERTY }, signal);
  const postStatus = sdStatusFromParsed(post.parsed);

  if (setResult === undefined) {
    let outcome: FormatSdCardOutcome = "unknown";
    if (post.parsed !== undefined && post.parsed.code === 0) {
      // READY after timeout is still ambiguous (format may not have started, or finished).
      outcome = "unknown";
    }
    return {
      action: "set",
      path,
      statusCode: post.statusCode,
      bodyText: truncateBody(
        `SET timed out/unknown (${transportDetail ?? "transport error"}); post-check only. ` +
          "Do not retry automatically — verify on camera / list files.",
      ),
      outcome,
      ...(preStatus === undefined ? {} : { preStatus }),
      ...(postStatus === undefined ? {} : { postStatus }),
      ...(post.parsed === undefined ? {} : { parsed: post.parsed }),
    };
  }

  let outcome: FormatSdCardOutcome = "unknown";
  if (post.parsed !== undefined && post.parsed.code === 0) {
    outcome = isSdCardStatusReadyForFormat(postStatus) ? "success" : "failed";
  }

  return {
    ...setResult,
    outcome,
    ...(preStatus === undefined ? {} : { preStatus }),
    ...(postStatus === undefined ? {} : { postStatus }),
  };
}

function decodeBody(response: TransportResponse): string {
  return new TextDecoder().decode(response.body);
}
