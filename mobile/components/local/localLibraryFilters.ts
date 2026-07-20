import { parseRecordedParts } from "@/components/mediaMeta";
import type { LocalMediaFile } from "@/context/DemoModeContext";
import type { FileCategory } from "@/packages/parsers/src/index";

export type DateFilterMode = "any" | "single" | "range";
export type TimeFilterMode = "any" | "single" | "range";

/** Recording categories exposed in the filter sheet (extensible). */
export const RECORDING_CATEGORIES = ["normal", "parking", "event"] as const;
export type RecordingCategory = (typeof RECORDING_CATEGORIES)[number];

export const MEDIA_TYPES = ["video", "image"] as const;
export type MediaTypeFilter = (typeof MEDIA_TYPES)[number];

export interface LocalLibraryFilters {
  readonly dateMode: DateFilterMode;
  readonly singleDay?: string;
  readonly rangeStart?: string;
  readonly rangeEnd?: string;
  readonly timeMode: TimeFilterMode;
  readonly singleTime?: string;
  readonly timeFrom?: string;
  readonly timeTo?: string;
  readonly categories: readonly RecordingCategory[];
  readonly mediaTypes: readonly MediaTypeFilter[];
}

export const EMPTY_FILTERS: LocalLibraryFilters = {
  dateMode: "any",
  timeMode: "any",
  categories: [],
  mediaTypes: [],
};

export interface NormalizedLocalFile {
  readonly file: LocalMediaFile;
  readonly dayKey: string;
  readonly minutesOfDay: number | undefined;
  readonly category: FileCategory;
  readonly mediaType: "video" | "image" | "other";
}

export interface FilterChip {
  readonly id: string;
  readonly label: string;
  readonly group: "date" | "time" | "category" | "media";
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/u;

export function isValidDayKey(value: string | undefined): value is string {
  if (!value || !DAY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseMinutesOfDay(hhmm: string | undefined): number | undefined {
  if (!hhmm) return undefined;
  const m = TIME_RE.exec(hhmm);
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesFromName(name: string): number | undefined {
  const parts = parseRecordedParts(name);
  if (!parts) return undefined;
  const [hh, mm] = parts.time.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return undefined;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
  return hh * 60 + mm;
}

export function normalizeLocalFile(
  file: LocalMediaFile,
  categoryByName?: ReadonlyMap<string, FileCategory>,
): NormalizedLocalFile {
  const parts = parseRecordedParts(file.name);
  const dayKey = parts ? parts.isoLocal.slice(0, 10) : "unknown";
  const mediaType =
    file.kind === "video" ? "video" : file.kind === "image" ? "image" : "other";
  const fromMap = categoryByName?.get(file.name);
  const category: FileCategory =
    mediaType === "image" ? "photo" : (fromMap ?? "unknown");
  return {
    file,
    dayKey,
    minutesOfDay: minutesFromName(file.name),
    category,
    mediaType,
  };
}

export function normalizeLocalFiles(
  files: readonly LocalMediaFile[],
  categoryByName?: ReadonlyMap<string, FileCategory>,
): NormalizedLocalFile[] {
  return files.map((f) => normalizeLocalFile(f, categoryByName));
}

function dayInInclusiveRange(dayKey: string, start: string, end: string): boolean {
  return dayKey >= start && dayKey <= end;
}

/** Inclusive time range; supports overnight when from > to (e.g. 22:00–06:00). */
export function minutesInTimeRange(minutes: number, from: number, to: number): boolean {
  if (from === to) return minutes === from;
  if (from < to) return minutes >= from && minutes <= to;
  return minutes >= from || minutes <= to;
}

export function fileMatchesFilters(
  item: NormalizedLocalFile,
  filters: LocalLibraryFilters,
): boolean {
  // Date
  if (filters.dateMode === "single") {
    if (item.dayKey === "unknown") return false;
    if (!isValidDayKey(filters.singleDay)) return false;
    if (item.dayKey !== filters.singleDay) return false;
  } else if (filters.dateMode === "range") {
    if (item.dayKey === "unknown") return false;
    const start = filters.rangeStart;
    const end = filters.rangeEnd;
    if (!isValidDayKey(start) || !isValidDayKey(end)) return false;
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    if (!dayInInclusiveRange(item.dayKey, lo, hi)) return false;
  }
  // unknown day only when date is Any

  // Time
  if (filters.timeMode !== "any") {
    if (item.minutesOfDay === undefined) return false;
    if (filters.timeMode === "single") {
      const t = parseMinutesOfDay(filters.singleTime);
      if (t === undefined) return false;
      if (item.minutesOfDay !== t) return false;
    } else {
      const from = parseMinutesOfDay(filters.timeFrom);
      const to = parseMinutesOfDay(filters.timeTo);
      if (from === undefined || to === undefined) return false;
      if (!minutesInTimeRange(item.minutesOfDay, from, to)) return false;
    }
  }

  // Recording category — empty = Any; OR within group
  if (filters.categories.length > 0) {
    if (!filters.categories.includes(item.category as RecordingCategory)) return false;
  }

  // Media type — empty = Any; OR within group
  if (filters.mediaTypes.length > 0) {
    if (item.mediaType === "other") return false;
    if (!filters.mediaTypes.includes(item.mediaType)) return false;
  }

  return true;
}

export function filterNormalizedFiles(
  items: readonly NormalizedLocalFile[],
  filters: LocalLibraryFilters,
): NormalizedLocalFile[] {
  if (isFiltersEmpty(filters)) return [...items];
  return items.filter((item) => fileMatchesFilters(item, filters));
}

export function isFiltersEmpty(filters: LocalLibraryFilters): boolean {
  return (
    filters.dateMode === "any" &&
    filters.timeMode === "any" &&
    filters.categories.length === 0 &&
    filters.mediaTypes.length === 0
  );
}

/** Count of active filter *groups* for the Filter badge. */
export function countActiveFilterGroups(filters: LocalLibraryFilters): number {
  let n = 0;
  if (filters.dateMode !== "any") n += 1;
  if (filters.timeMode !== "any") n += 1;
  if (filters.categories.length > 0) n += 1;
  if (filters.mediaTypes.length > 0) n += 1;
  return n;
}

function formatDayChip(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return day;
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
}

export function buildFilterChips(filters: LocalLibraryFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.dateMode === "single" && filters.singleDay) {
    chips.push({ id: "date", group: "date", label: formatDayChip(filters.singleDay) });
  } else if (filters.dateMode === "range" && filters.rangeStart && filters.rangeEnd) {
    const a = formatDayChip(filters.rangeStart);
    const b = formatDayChip(filters.rangeEnd);
    chips.push({ id: "date", group: "date", label: `${a}–${b}` });
  }
  if (filters.timeMode === "single" && filters.singleTime) {
    chips.push({ id: "time", group: "time", label: filters.singleTime });
  } else if (filters.timeMode === "range" && filters.timeFrom && filters.timeTo) {
    chips.push({
      id: "time",
      group: "time",
      label: `${filters.timeFrom}–${filters.timeTo}`,
    });
  }
  for (const cat of filters.categories) {
    const label = cat === "normal" ? "Normal" : cat === "parking" ? "Parking" : "Event";
    chips.push({ id: `cat-${cat}`, group: "category", label });
  }
  for (const mt of filters.mediaTypes) {
    chips.push({
      id: `media-${mt}`,
      group: "media",
      label: mt === "video" ? "Videos" : "Photos",
    });
  }
  return chips;
}

export function clearFilterGroup(
  filters: LocalLibraryFilters,
  chipId: string,
): LocalLibraryFilters {
  if (chipId === "date") {
    return { ...filters, dateMode: "any", singleDay: undefined, rangeStart: undefined, rangeEnd: undefined };
  }
  if (chipId === "time") {
    return { ...filters, timeMode: "any", singleTime: undefined, timeFrom: undefined, timeTo: undefined };
  }
  if (chipId.startsWith("cat-")) {
    const cat = chipId.slice(4) as RecordingCategory;
    return { ...filters, categories: filters.categories.filter((c) => c !== cat) };
  }
  if (chipId.startsWith("media-")) {
    const mt = chipId.slice(6) as MediaTypeFilter;
    return { ...filters, mediaTypes: filters.mediaTypes.filter((m) => m !== mt) };
  }
  return filters;
}

export function formatResultsSummary(count: number, totalBytes: number): string {
  const gb = totalBytes / (1024 * 1024 * 1024);
  const size =
    gb >= 0.1
      ? `${gb.toFixed(1).replace(".", ",")} GB`
      : `${(totalBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  return `${count} results · ${size}`;
}

export function formatSelectionSize(totalBytes: number): string {
  const gb = totalBytes / (1024 * 1024 * 1024);
  if (gb >= 0.1) return `${gb.toFixed(1).replace(".", ",")} GB`;
  return `${(totalBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function sumBytes(files: readonly LocalMediaFile[]): number {
  let total = 0;
  for (const f of files) total += f.sizeBytes > 0 ? f.sizeBytes : 0;
  return total;
}

/** Date presets relative to a local "today" YYYY-MM-DD. */
export function datePreset(
  kind: "today" | "yesterday" | "last7" | "thisMonth",
  todayKey: string,
): Partial<LocalLibraryFilters> {
  if (!isValidDayKey(todayKey)) return { dateMode: "any" };
  const today = new Date(`${todayKey}T12:00:00`);
  if (kind === "today") {
    return { dateMode: "single", singleDay: todayKey };
  }
  if (kind === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const key = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    return { dateMode: "single", singleDay: key };
  }
  if (kind === "last7") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    return { dateMode: "range", rangeStart: startKey, rangeEnd: todayKey };
  }
  const startKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  return { dateMode: "range", rangeStart: startKey, rangeEnd: todayKey };
}

export const TIME_PRESETS = {
  morning: { timeFrom: "06:00", timeTo: "12:00" },
  afternoon: { timeFrom: "12:00", timeTo: "18:00" },
  evening: { timeFrom: "18:00", timeTo: "22:00" },
  night: { timeFrom: "22:00", timeTo: "06:00" },
} as const;

export function localTodayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function pruneSelectionToUris(
  selected: ReadonlySet<string>,
  visibleUris: readonly string[],
): Set<string> {
  const allowed = new Set(visibleUris);
  const next = new Set<string>();
  for (const uri of selected) {
    if (allowed.has(uri)) next.add(uri);
  }
  return next;
}

export function filtersEqual(a: LocalLibraryFilters, b: LocalLibraryFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
