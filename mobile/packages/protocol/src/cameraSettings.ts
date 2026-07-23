import type { Transport } from "../../camera-transport/src/index";
import { parseConfigResponse, type ConfigResponse } from "../../parsers/src/index";
import { CameraProtocolError } from "./errors";

export type CameraSettingKey =
  | "frequency"
  | "ev"
  | "dateTimeMode"
  | "timeZone"
  | "daylightSaving";

export type FrequencyValue = "50Hz" | "60Hz";
export type EvValue =
  | "EVN100"
  | "EVN067"
  | "EVN033"
  | "EV0"
  | "EVP033"
  | "EVP067"
  | "EVP100";
export type DateTimeModeValue = "USEGPS" | "MANUAL";
export type DaylightSavingValue = "OFF" | "P1HR" | "P30MIN" | "M1HR" | "M30MIN";

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

export type TimeZoneValue = (typeof RTC_TIMEZONE_VALUES)[number];

export type CameraSettingValueMap = {
  frequency: FrequencyValue;
  ev: EvValue;
  dateTimeMode: DateTimeModeValue;
  timeZone: TimeZoneValue;
  daylightSaving: DaylightSavingValue;
};

/** Canonical Camera.Menu.* property for each setting key. */
export const CAMERA_SETTING_PROPERTY: Readonly<Record<CameraSettingKey, string>> = Object.freeze({
  frequency: "Camera.Menu.Flicker",
  ev: "Camera.Menu.EV",
  dateTimeMode: "Camera.Menu.RtcGps",
  timeZone: "Camera.Menu.RtcTimezone",
  daylightSaving: "Camera.Menu.RtcDaylight",
});

/** Wire leaf names used by action=set. */
export const CAMERA_SETTING_WIRE: Readonly<Record<CameraSettingKey, string>> = Object.freeze({
  frequency: "Flicker",
  ev: "EV",
  dateTimeMode: "RtcGps",
  timeZone: "RtcTimezone",
  daylightSaving: "RtcDaylight",
});

export const CAMERA_SETTING_VALUES: {
  readonly [K in CameraSettingKey]: readonly CameraSettingValueMap[K][];
} = Object.freeze({
  frequency: Object.freeze(["50Hz", "60Hz"] as const),
  ev: Object.freeze([
    "EVN100",
    "EVN067",
    "EVN033",
    "EV0",
    "EVP033",
    "EVP067",
    "EVP100",
  ] as const),
  dateTimeMode: Object.freeze(["USEGPS", "MANUAL"] as const),
  timeZone: RTC_TIMEZONE_VALUES,
  daylightSaving: Object.freeze(["OFF", "P1HR", "P30MIN", "M1HR", "M30MIN"] as const),
});

export const CAMERA_SETTING_TITLE: Readonly<Record<CameraSettingKey, string>> = Object.freeze({
  frequency: "Frequency",
  ev: "EV",
  dateTimeMode: "Date & Time",
  timeZone: "Time Zone",
  daylightSaving: "Daylight Saving Time",
});

const EV_LABELS: Readonly<Record<EvValue, string>> = Object.freeze({
  EVN100: "-1.0",
  EVN067: "-0.67",
  EVN033: "-0.33",
  EV0: "0.0",
  EVP033: "+0.33",
  EVP067: "+0.67",
  EVP100: "+1.0",
});

const DST_LABELS: Readonly<Record<DaylightSavingValue, string>> = Object.freeze({
  OFF: "Off",
  P1HR: "+1 hour",
  P30MIN: "+30 minutes",
  M1HR: "-1 hour",
  M30MIN: "-30 minutes",
});

export const CAMERA_SETTINGS_KEYS = Object.freeze(
  Object.keys(CAMERA_SETTING_PROPERTY) as CameraSettingKey[],
);

/** Optional read-only camera clock property (never mutated). */
export const CAMERA_CLOCK_PROPERTY = "Camera.Preview.MJPEG.TimeStamp.*";

export function truncateBody(text: string, max = 120): string {
  const normalized = text.replaceAll("\r", "").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

export function buildCgiPath(action: string, params: Readonly<Record<string, string>>): string {
  const query = new URLSearchParams({ action, ...params });
  return `/cgi-bin/Config.cgi?${query.toString()}`;
}

export function isCameraSettingKey(value: string): value is CameraSettingKey {
  return (CAMERA_SETTINGS_KEYS as readonly string[]).includes(value);
}

export function isAllowedCameraSettingValue<K extends CameraSettingKey>(
  key: K,
  value: string,
): value is CameraSettingValueMap[K] {
  return (CAMERA_SETTING_VALUES[key] as readonly string[]).includes(value);
}

export function formatTimeZoneLabel(token: string): string {
  if (token === "Z00") return "GMT +00:00";
  if (/^M\d{2}$/.test(token)) return `GMT -${token.slice(1)}:00`;
  if (/^P\d{2}$/.test(token)) return `GMT +${token.slice(1)}:00`;
  return token;
}

export function formatCameraSettingValue(key: CameraSettingKey, raw: string): string {
  switch (key) {
    case "frequency":
      return raw;
    case "ev":
      return EV_LABELS[raw as EvValue] ?? raw;
    case "dateTimeMode":
      if (raw === "USEGPS") return "GPS";
      if (raw === "MANUAL") return "Manual";
      return raw;
    case "timeZone":
      return formatTimeZoneLabel(raw);
    case "daylightSaving":
      return DST_LABELS[raw as DaylightSavingValue] ?? raw;
    default:
      return raw;
  }
}

export function buildSetCameraSettingPath<K extends CameraSettingKey>(
  key: K,
  value: CameraSettingValueMap[K],
): string {
  if (!isCameraSettingKey(key)) {
    throw new CameraProtocolError("Unsupported camera setting");
  }
  if (!isAllowedCameraSettingValue(key, value)) {
    throw new CameraProtocolError(`Unsupported value for ${CAMERA_SETTING_TITLE[key]}`);
  }
  return buildCgiPath("set", {
    property: CAMERA_SETTING_WIRE[key],
    value,
  });
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
    throw new CameraProtocolError(`Camera returned HTTP ${statusCode}`, statusCode);
  }
  if (parsed === undefined) {
    const preview = truncateBody(bodyText, 120);
    throw new CameraProtocolError(
      preview.length === 0
        ? "CGI response empty or unparseable"
        : `CGI response unparseable: ${preview}`,
    );
  }
  if (parsed.code !== 0) {
    throw new CameraProtocolError(`CGI ${parsed.code} ${parsed.message}`, statusCode);
  }
  if (parsed.message.toUpperCase() !== "OK") {
    throw new CameraProtocolError(`CGI success message not OK: ${parsed.message}`, statusCode);
  }
}

export function parseMutationBody(body: Uint8Array): {
  readonly bodyText: string;
  readonly parsed: ConfigResponse | undefined;
} {
  const bodyText = new TextDecoder().decode(body);
  try {
    return { bodyText, parsed: parseConfigResponse(bodyText) };
  } catch {
    return { bodyText, parsed: undefined };
  }
}

export const CAMERA_SETTING_VERIFY_FAILED =
  "Camera did not confirm the new setting. Refresh and try again.";

export interface ApplyCameraSettingResult {
  readonly key: CameraSettingKey;
  readonly value: string;
  readonly property: string;
  readonly properties: Readonly<Record<string, string>>;
}

/**
 * One-shot mutation + read verification. Never retries. Never sends a second set.
 */
export async function applyCameraSetting<K extends CameraSettingKey>(
  transport: Transport,
  key: K,
  value: CameraSettingValueMap[K],
  options?: { readonly signal?: AbortSignal },
): Promise<ApplyCameraSettingResult> {
  const path = buildSetCameraSettingPath(key, value);
  const property = CAMERA_SETTING_PROPERTY[key];

  let response;
  try {
    response = await transport.request({
      method: "GET",
      path,
      retryPolicy: "mutation",
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CameraProtocolError(
      `Camera setting could not be applied (not retried): ${truncateBody(message, 160)}`,
    );
  }

  const { bodyText, parsed } = parseMutationBody(response.body);
  assertCgiMutationSuccess(response.statusCode, bodyText, parsed);

  const verified = await verifyCameraSetting(transport, key, value, options);
  if (!verified.ok) {
    throw new CameraProtocolError(CAMERA_SETTING_VERIFY_FAILED);
  }

  return {
    key,
    value,
    property,
    properties: verified.properties,
  };
}

export async function verifyCameraSetting<K extends CameraSettingKey>(
  transport: Transport,
  key: K,
  expected: CameraSettingValueMap[K],
  options?: { readonly signal?: AbortSignal },
): Promise<{ readonly ok: boolean; readonly properties: Readonly<Record<string, string>> }> {
  const property = CAMERA_SETTING_PROPERTY[key];
  const query = new URLSearchParams({ action: "get", property });
  const response = await transport.request({
    method: "GET",
    path: `/cgi-bin/Config.cgi?${query.toString()}`,
    ...(options?.signal === undefined ? {} : { signal: options.signal }),
  });
  const { bodyText, parsed } = parseMutationBody(response.body);
  if (response.statusCode < 200 || response.statusCode >= 300 || parsed === undefined) {
    return { ok: false, properties: {} };
  }
  if (parsed.code !== 0 || parsed.message.toUpperCase() !== "OK") {
    return { ok: false, properties: parsed.properties };
  }
  const reported =
    parsed.properties[property] ??
    parsed.properties[CAMERA_SETTING_WIRE[key]] ??
    Object.values(parsed.properties)[0];
  return {
    ok: reported === expected,
    properties: {
      ...parsed.properties,
      ...(reported !== undefined ? { [property]: reported } : {}),
    },
  };
}

/** Read-only fetch of the five allowlisted setting properties. */
export async function fetchCameraSettingProperties(
  transport: Transport,
  options?: { readonly signal?: AbortSignal },
): Promise<Readonly<Record<string, string>>> {
  const out: Record<string, string> = {};
  for (const key of CAMERA_SETTINGS_KEYS) {
    const property = CAMERA_SETTING_PROPERTY[key];
    try {
      const query = new URLSearchParams({ action: "get", property });
      const response = await transport.request({
        method: "GET",
        path: `/cgi-bin/Config.cgi?${query.toString()}`,
        ...(options?.signal === undefined ? {} : { signal: options.signal }),
      });
      const { parsed } = parseMutationBody(response.body);
      if (!parsed || parsed.code !== 0) continue;
      const value =
        parsed.properties[property] ??
        parsed.properties[CAMERA_SETTING_WIRE[key]] ??
        Object.values(parsed.properties)[0];
      if (typeof value === "string" && value.length > 0) {
        out[property] = value;
      }
    } catch {
      // Intermittent firmware errors — leave property absent
    }
  }
  try {
    const query = new URLSearchParams({ action: "get", property: CAMERA_CLOCK_PROPERTY });
    const response = await transport.request({
      method: "GET",
      path: `/cgi-bin/Config.cgi?${query.toString()}`,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
    const { parsed } = parseMutationBody(response.body);
    if (parsed && parsed.code === 0) {
      const clock =
        parsed.properties[CAMERA_CLOCK_PROPERTY] ?? Object.values(parsed.properties)[0];
      if (typeof clock === "string" && clock.length > 0) {
        out[CAMERA_CLOCK_PROPERTY] = clock;
      }
    }
  } catch {
    // optional
  }
  return out;
}

export function cameraSettingConfirmMessage(
  key: CameraSettingKey,
  fromRaw: string,
  toRaw: string,
): string {
  const title = CAMERA_SETTING_TITLE[key];
  const from = formatCameraSettingValue(key, fromRaw);
  const to = formatCameraSettingValue(key, toRaw);
  let message = `Change ${title} from ${from} to ${to}?`;
  if (key === "dateTimeMode") {
    message +=
      " Manual changes the camera’s date/time source mode. It does not automatically set the clock from this phone.";
  }
  return message;
}

export function cameraSettingSuccessMessage(key: CameraSettingKey, raw: string): string {
  return `${CAMERA_SETTING_TITLE[key]} changed to ${formatCameraSettingValue(key, raw)}`;
}
