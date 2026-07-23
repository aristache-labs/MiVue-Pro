/**
 * Camera wall-clock from MJPEG TimeStamp components — no UTC/timezone conversion.
 */

export const CAMERA_CLOCK_COMPONENT_KEYS = {
  year: "Camera.Preview.MJPEG.TimeStamp.year",
  month: "Camera.Preview.MJPEG.TimeStamp.month",
  day: "Camera.Preview.MJPEG.TimeStamp.day",
  hour: "Camera.Preview.MJPEG.TimeStamp.hour",
  minute: "Camera.Preview.MJPEG.TimeStamp.minute",
  second: "Camera.Preview.MJPEG.TimeStamp.second",
} as const;

export const CAMERA_CLOCK_WILDCARD = "Camera.Preview.MJPEG.TimeStamp.*";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type CameraClockParts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

function parseIntStrict(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim();
  if (!/^-?\d+$/u.test(t)) return undefined;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : undefined;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

export function isValidCameraClockParts(parts: CameraClockParts): boolean {
  if (parts.year < 2000 || parts.year > 2100) return false;
  if (parts.month < 1 || parts.month > 12) return false;
  if (parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) return false;
  if (parts.hour < 0 || parts.hour > 23) return false;
  if (parts.minute < 0 || parts.minute > 59) return false;
  if (parts.second < 0 || parts.second > 59) return false;
  return true;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `23 Jul 2026 · 19:26:15` — wall-clock components only. */
export function formatCameraClockParts(parts: CameraClockParts): string {
  return `${parts.day} ${MONTHS_SHORT[parts.month - 1]} ${parts.year} · ${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

/** Aggregate strings the camera may report under the wildcard key. */
export function parseCameraClockAggregate(raw: string): CameraClockParts | undefined {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/u.exec(raw.trim()) ??
    /^(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/u.exec(raw.trim());
  if (!m) return undefined;
  const parts: CameraClockParts = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
    second: Number(m[6]),
  };
  return isValidCameraClockParts(parts) ? parts : undefined;
}

export function readCameraClockParts(
  properties: Readonly<Record<string, string>>,
): CameraClockParts | undefined {
  const year = parseIntStrict(properties[CAMERA_CLOCK_COMPONENT_KEYS.year]);
  const month = parseIntStrict(properties[CAMERA_CLOCK_COMPONENT_KEYS.month]);
  const day = parseIntStrict(properties[CAMERA_CLOCK_COMPONENT_KEYS.day]);
  const hour = parseIntStrict(properties[CAMERA_CLOCK_COMPONENT_KEYS.hour]);
  const minute = parseIntStrict(properties[CAMERA_CLOCK_COMPONENT_KEYS.minute]);
  const second = parseIntStrict(properties[CAMERA_CLOCK_COMPONENT_KEYS.second]);

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    return undefined;
  }

  const parts: CameraClockParts = { year, month, day, hour, minute, second };
  return isValidCameraClockParts(parts) ? parts : undefined;
}

/**
 * Full camera clock label, or em dash when incomplete/invalid.
 * Never returns a single component (e.g. only seconds).
 */
export function formatCameraClockDisplay(
  properties: Readonly<Record<string, string>>,
): string {
  const fromParts = readCameraClockParts(properties);
  if (fromParts) return formatCameraClockParts(fromParts);

  const aggregate =
    properties[CAMERA_CLOCK_WILDCARD] ??
    properties["Camera.Preview.MJPEG.TimeStamp"];
  if (typeof aggregate === "string" && aggregate.length > 0) {
    const parsed = parseCameraClockAggregate(aggregate);
    if (parsed) return formatCameraClockParts(parsed);
  }

  return "—";
}
