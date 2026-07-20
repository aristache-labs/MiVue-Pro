/**
 * Library date/time display + search index — always en-GB, never device locale.
 * Uses local calendar components from camera metadata (no UTC day shift).
 */

export const RECORDING_UI_LOCALE = "en-GB";

const MONTHS_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

const MONTHS_LONG = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const WEEKDAYS_LONG = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type RecordingInstant = {
  readonly year: number;
  readonly month: number; // 1–12
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

export type RecordingSearchable = {
  readonly name: string;
  readonly recordedAt: string;
  readonly category?: string;
};

/** Parse camera-local `YYYY-MM-DD HH:mm:ss` / ISO-like strings without UTC shift. */
export function parseRecordingInstant(recordedAt: string): RecordingInstant | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/u.exec(recordedAt.trim());
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? "0");
  if (
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined;
  }
  return { year, month, day, hour, minute, second };
}

export function isValidRecordingInstant(v: RecordingInstant | undefined): v is RecordingInstant {
  return v !== undefined;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function weekdayIndex(year: number, month: number, day: number): number {
  // Noon local Date avoids DST edge for weekday lookup.
  return new Date(year, month - 1, day, 12, 0, 0, 0).getDay();
}

/** `19 Jul 2026` */
export function formatRecordingDate(recordedAt: string): string {
  const p = parseRecordingInstant(recordedAt);
  if (!p) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recordingDateTime] invalid date", recordedAt.slice(0, 32));
    }
    return "Choose a valid date";
  }
  return `${p.day} ${MONTHS_SHORT[p.month - 1]!.replace(/^./u, (c) => c.toUpperCase())} ${p.year}`;
}

/** `14:43` (24h) */
export function formatRecordingTime(recordedAt: string): string {
  const p = parseRecordingInstant(recordedAt);
  if (!p) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recordingDateTime] invalid time", recordedAt.slice(0, 32));
    }
    return "Choose a valid time";
  }
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** Card line: `19 Jul 2026 · 14:43` */
export function formatRecordingDateTime(recordedAt: string): string {
  const p = parseRecordingInstant(recordedAt);
  if (!p) {
    const date = recordedAt.slice(0, 10);
    const time = recordedAt.slice(11, 16);
    return time ? `${date} · ${time}` : date || "Choose a valid date";
  }
  return `${formatRecordingDate(recordedAt)} · ${formatRecordingTime(recordedAt)}`;
}

/** Section separator: `SUNDAY, 19 JULY 2026` */
export function formatDateSeparator(recordedAtOrDayKey: string): string {
  const dayKey = recordedAtOrDayKey.length === 10 ? recordedAtOrDayKey : recordedAtOrDayKey.slice(0, 10);
  const p =
    parseRecordingInstant(`${dayKey} 12:00:00`) ??
    parseRecordingInstant(recordedAtOrDayKey);
  if (!p) return "UNKNOWN DATE";
  const wd = WEEKDAYS_LONG[weekdayIndex(p.year, p.month, p.day)]!.toUpperCase();
  const mon = MONTHS_LONG[p.month - 1]!.toUpperCase();
  return `${wd}, ${p.day} ${mon} ${p.year}`;
}

/** `19 Jul–22 Jul 2026` or `19 Jul 2026` when same day */
export function formatDateRange(fromDayKey: string, toDayKey: string): string {
  const a = parseRecordingInstant(`${fromDayKey} 12:00:00`);
  const b = parseRecordingInstant(`${toDayKey} 12:00:00`);
  if (!a || !b) return "Choose a valid date";
  const aLabel = formatRecordingDate(`${fromDayKey} 12:00:00`);
  const bLabel = formatRecordingDate(`${toDayKey} 12:00:00`);
  if (fromDayKey === toDayKey) return aLabel;
  if (a.year === b.year) {
    const aShort = `${a.day} ${MONTHS_SHORT[a.month - 1]!.replace(/^./u, (c) => c.toUpperCase())}`;
    const bShort = `${b.day} ${MONTHS_SHORT[b.month - 1]!.replace(/^./u, (c) => c.toUpperCase())}`;
    return `${aShort}–${bShort} ${a.year}`;
  }
  return `${aLabel}–${bLabel}`;
}

/** `14:00–18:30` */
export function formatTimeRange(fromHhmm: string, toHhmm: string): string {
  const from = /^(\d{1,2}):(\d{2})$/u.exec(fromHhmm.trim());
  const to = /^(\d{1,2}):(\d{2})$/u.exec(toHhmm.trim());
  if (!from || !to) return "Choose a valid time";
  const fh = Number(from[1]);
  const fm = Number(from[2]);
  const th = Number(to[1]);
  const tm = Number(to[2]);
  if (fh > 23 || fm > 59 || th > 23 || tm > 59) return "Choose a valid time";
  return `${pad2(fh)}:${pad2(fm)}–${pad2(th)}:${pad2(tm)}`;
}

function normalizeSearchText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[./\-_:]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Build a single normalized search blob for one recording.
 * Forms exist only for matching — not shown in UI.
 */
export function buildRecordingSearchIndex(recording: RecordingSearchable): string {
  const name = recording.name.toLowerCase();
  const base = name.replace(/\.[^.]+$/u, "");
  const extMatch = /\.([^.]+)$/u.exec(name);
  const ext = extMatch?.[1] ?? "";
  const numericBits = name.match(/\d+/gu) ?? [];

  const parts = new Set<string>();
  parts.add(name);
  parts.add(base);
  if (ext) {
    parts.add(ext);
    parts.add(`.${ext}`);
  }
  for (const bit of numericBits) parts.add(bit);

  if (recording.category) {
    const cat = recording.category.toLowerCase();
    parts.add(cat);
    if (cat === "photo") {
      parts.add("photos");
      parts.add("image");
    }
  }

  const p = parseRecordingInstant(recording.recordedAt);
  if (p) {
    const y = String(p.year);
    const mm = pad2(p.month);
    const dd = pad2(p.day);
    const hh = pad2(p.hour);
    const mi = pad2(p.minute);
    const short = MONTHS_SHORT[p.month - 1]!;
    const long = MONTHS_LONG[p.month - 1]!;
    const dayNum = String(p.day);

    parts.add(`${y}-${mm}-${dd}`);
    parts.add(`${dd}/${mm}/${y}`);
    parts.add(`${dd}-${mm}-${y}`);
    parts.add(`${dd}.${mm}.${y}`);
    parts.add(`${dd}${mm}${y}`);
    parts.add(`${dayNum} ${short} ${y}`);
    parts.add(`${dayNum} ${long} ${y}`);
    parts.add(`${short} ${dayNum} ${y}`);
    parts.add(`${long} ${dayNum} ${y}`);
    parts.add(`${dayNum} ${short}`);
    parts.add(`${dayNum} ${long}`);
    parts.add(`${hh}:${mi}`);
    parts.add(`${hh}.${mi}`);
    parts.add(`${hh}${mi}`);
    parts.add(hh); // hour bucket 14:00–14:59
    parts.add(`${hh} ${mi}`);
  }

  return normalizeSearchText([...parts].join(" "));
}

/** AND-token match against a prebuilt index blob. */
export function matchesRecordingSearchIndex(index: string, query: string): boolean {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) => index.includes(token));
}

export function matchesRecordingSearch(recording: RecordingSearchable, query: string): boolean {
  return matchesRecordingSearchIndex(buildRecordingSearchIndex(recording), query);
}

/** Module cache: rebuild index map only when the files array identity changes. */
let cachedFilesRef: readonly RecordingSearchable[] | null = null;
let cachedIndexMap: Map<string, string> | null = null;

export function getRecordingSearchIndexMap(
  files: readonly RecordingSearchable[],
): ReadonlyMap<string, string> {
  if (files === cachedFilesRef && cachedIndexMap) return cachedIndexMap;
  const map = new Map<string, string>();
  for (const file of files) {
    const key = file.name;
    if (!map.has(key)) map.set(key, buildRecordingSearchIndex(file));
  }
  cachedFilesRef = files;
  cachedIndexMap = map;
  return map;
}

/** Test helper — clear memoization between cases. */
export function clearRecordingSearchIndexCache(): void {
  cachedFilesRef = null;
  cachedIndexMap = null;
}
