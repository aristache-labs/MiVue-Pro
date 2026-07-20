import {
  formatSectionHeading,
  formatCountLabel,
} from "@/components/local/localLibrarySections";
import {
  isValidDayKey,
  minutesInTimeRange,
  parseMinutesOfDay,
  type DateFilterMode,
  type MediaTypeFilter,
  type RecordingCategory,
  type TimeFilterMode,
} from "@/components/local/localLibraryFilters";
import type { FileCategory, RemoteFile } from "@/packages/parsers/src/index";

export type CategoryFilter = "all" | Exclude<FileCategory, "unknown">;

export type CameraLibrarySort =
  | "newest"
  | "oldest"
  | "nameAsc"
  | "nameDesc"
  | "largest"
  | "smallest"
  | "longest"
  | "shortest";

export const CAMERA_SORT_OPTIONS: readonly { id: CameraLibrarySort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "nameAsc", label: "Name A–Z" },
  { id: "nameDesc", label: "Name Z–A" },
  { id: "largest", label: "Largest first" },
  { id: "smallest", label: "Smallest first" },
  { id: "longest", label: "Longest first" },
  { id: "shortest", label: "Shortest first" },
];

export type DownloadedFilter = "any" | "downloaded" | "not_downloaded";

export interface CameraLibraryFilters {
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
  readonly downloaded: DownloadedFilter;
  readonly durationMinSec?: number;
  readonly durationMaxSec?: number;
}

export const EMPTY_CAMERA_FILTERS: CameraLibraryFilters = {
  dateMode: "any",
  timeMode: "any",
  categories: [],
  mediaTypes: [],
  downloaded: "any",
};

export interface CategoryCounts {
  readonly all: number;
  readonly normal: number;
  readonly event: number;
  readonly parking: number;
  readonly photo: number;
}

export interface CameraLibrarySection {
  readonly key: string;
  readonly title: string;
  readonly count: number;
  readonly countLabel: string;
  readonly dayKey: string;
  readonly data: readonly RemoteFile[];
}

export interface CameraFilterChip {
  readonly id: string;
  readonly label: string;
  readonly group: "date" | "time" | "category" | "media" | "downloaded" | "duration";
}

export type CameraLinkState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "unstable"
  | "connection_lost";

/** Production Camera Library must never surface demo/dev chrome. */
export const PRODUCTION_LIBRARY_FORBIDDEN_UI = Object.freeze([
  "Demo Mode",
  "Toggle Demo Mode",
  "Live · Expo Go",
  "Fetch probe OK",
  "HTTP/1.0",
  "gateway",
] as const);

export function formatMediaSizeMbGb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export function dayKeyFromRemote(file: RemoteFile): string {
  const key = file.recordedAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/u.test(key) ? key : "unknown";
}

export function minutesFromRemote(file: RemoteFile): number | undefined {
  const time = file.recordedAt.slice(11, 16);
  return parseMinutesOfDay(time);
}

export function mediaTypeFromRemote(file: RemoteFile): MediaTypeFilter | "other" {
  if (file.category === "photo") return "image";
  if (/\.(mp4|mov|m4v)$/iu.test(file.name)) return "video";
  if (/\.(jpe?g|png|webp)$/iu.test(file.name)) return "image";
  return "other";
}

export function countCategories(files: readonly RemoteFile[]): CategoryCounts {
  let normal = 0;
  let event = 0;
  let parking = 0;
  let photo = 0;
  for (const file of files) {
    if (file.category === "normal") normal += 1;
    else if (file.category === "event") event += 1;
    else if (file.category === "parking") parking += 1;
    else if (file.category === "photo") photo += 1;
  }
  return { all: files.length, normal, event, parking, photo };
}

export function isDateBasedSort(sort: CameraLibrarySort): boolean {
  return sort === "newest" || sort === "oldest";
}

export function compareRemoteFiles(a: RemoteFile, b: RemoteFile, sort: CameraLibrarySort): number {
  switch (sort) {
    case "nameAsc":
      return a.name.localeCompare(b.name);
    case "nameDesc":
      return b.name.localeCompare(a.name);
    case "largest":
      return b.sizeBytes - a.sizeBytes;
    case "smallest":
      return a.sizeBytes - b.sizeBytes;
    case "longest":
      return (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0);
    case "shortest":
      return (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0);
    case "oldest": {
      const ta = Date.parse(a.recordedAt.replace(" ", "T"));
      const tb = Date.parse(b.recordedAt.replace(" ", "T"));
      return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
    }
    case "newest":
    default: {
      const ta = Date.parse(a.recordedAt.replace(" ", "T"));
      const tb = Date.parse(b.recordedAt.replace(" ", "T"));
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    }
  }
}

export function isCameraFiltersEmpty(filters: CameraLibraryFilters): boolean {
  return (
    filters.dateMode === "any" &&
    filters.timeMode === "any" &&
    filters.categories.length === 0 &&
    filters.mediaTypes.length === 0 &&
    filters.downloaded === "any" &&
    filters.durationMinSec === undefined &&
    filters.durationMaxSec === undefined
  );
}

export function countCameraFilterGroups(filters: CameraLibraryFilters): number {
  let n = 0;
  if (filters.dateMode !== "any") n += 1;
  if (filters.timeMode !== "any") n += 1;
  if (filters.categories.length > 0) n += 1;
  if (filters.mediaTypes.length > 0) n += 1;
  if (filters.downloaded !== "any") n += 1;
  if (filters.durationMinSec !== undefined || filters.durationMaxSec !== undefined) n += 1;
  return n;
}

function dayInInclusiveRange(dayKey: string, start: string, end: string): boolean {
  return dayKey >= start && dayKey <= end;
}

export function remoteMatchesFilters(
  file: RemoteFile,
  filters: CameraLibraryFilters,
  downloadedNames: ReadonlySet<string>,
): boolean {
  const dayKey = dayKeyFromRemote(file);

  if (filters.dateMode === "single") {
    if (dayKey === "unknown" || !isValidDayKey(filters.singleDay)) return false;
    if (dayKey !== filters.singleDay) return false;
  } else if (filters.dateMode === "range") {
    if (dayKey === "unknown") return false;
    const start = filters.rangeStart;
    const end = filters.rangeEnd;
    if (!isValidDayKey(start) || !isValidDayKey(end)) return false;
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    if (!dayInInclusiveRange(dayKey, lo, hi)) return false;
  }

  if (filters.timeMode !== "any") {
    const minutes = minutesFromRemote(file);
    if (minutes === undefined) return false;
    if (filters.timeMode === "single") {
      const t = parseMinutesOfDay(filters.singleTime);
      if (t === undefined || minutes !== t) return false;
    } else {
      const from = parseMinutesOfDay(filters.timeFrom);
      const to = parseMinutesOfDay(filters.timeTo);
      if (from === undefined || to === undefined) return false;
      if (!minutesInTimeRange(minutes, from, to)) return false;
    }
  }

  if (filters.categories.length > 0) {
    if (!filters.categories.includes(file.category as RecordingCategory)) return false;
  }

  if (filters.mediaTypes.length > 0) {
    const mt = mediaTypeFromRemote(file);
    if (mt === "other" || !filters.mediaTypes.includes(mt)) return false;
  }

  if (filters.downloaded === "downloaded" && !downloadedNames.has(file.name)) return false;
  if (filters.downloaded === "not_downloaded" && downloadedNames.has(file.name)) return false;

  const dur = file.durationSeconds;
  if (filters.durationMinSec !== undefined) {
    if (dur === undefined || dur < filters.durationMinSec) return false;
  }
  if (filters.durationMaxSec !== undefined) {
    if (dur === undefined || dur > filters.durationMaxSec) return false;
  }

  return true;
}

export function matchesSearch(file: RemoteFile, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (file.name.toLowerCase().includes(q)) return true;
  if (file.recordedAt.toLowerCase().includes(q)) return true;
  if (file.category.toLowerCase().includes(q)) return true;
  return false;
}

export function filterAndSortRemoteFiles(options: {
  readonly files: readonly RemoteFile[];
  readonly category: CategoryFilter;
  readonly search: string;
  readonly filters: CameraLibraryFilters;
  readonly sort: CameraLibrarySort;
  readonly downloadedNames: ReadonlySet<string>;
}): RemoteFile[] {
  const { files, category, search, filters, sort, downloadedNames } = options;
  const out: RemoteFile[] = [];
  for (const file of files) {
    if (category !== "all" && file.category !== category) continue;
    if (!matchesSearch(file, search)) continue;
    if (!remoteMatchesFilters(file, filters, downloadedNames)) continue;
    out.push(file);
  }
  out.sort((a, b) => compareRemoteFiles(a, b, sort));
  return out;
}

export function buildCameraLibrarySections(
  files: readonly RemoteFile[],
  sort: CameraLibrarySort,
): CameraLibrarySection[] {
  if (!isDateBasedSort(sort)) {
    return [
      {
        key: "all",
        dayKey: "all",
        title: CAMERA_SORT_OPTIONS.find((o) => o.id === sort)?.label.toUpperCase() ?? "RESULTS",
        count: files.length,
        countLabel: formatCountLabel(files.length),
        data: files,
      },
    ];
  }

  const map = new Map<string, RemoteFile[]>();
  for (const file of files) {
    const key = dayKeyFromRemote(file);
    const list = map.get(key);
    if (list) list.push(file);
    else map.set(key, [file]);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return sort === "oldest" ? a.localeCompare(b) : b.localeCompare(a);
  });

  return keys.map((key) => {
    const data = map.get(key) ?? [];
    return {
      key,
      dayKey: key,
      title: key === "unknown" ? "UNKNOWN DATE" : formatSectionHeading(key),
      count: data.length,
      countLabel: formatCountLabel(data.length),
      data,
    };
  });
}

function formatDayChip(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function buildCameraFilterChips(filters: CameraLibraryFilters): CameraFilterChip[] {
  const chips: CameraFilterChip[] = [];
  if (filters.dateMode === "single" && filters.singleDay) {
    chips.push({ id: "date", group: "date", label: formatDayChip(filters.singleDay) });
  } else if (filters.dateMode === "range" && filters.rangeStart && filters.rangeEnd) {
    chips.push({
      id: "date",
      group: "date",
      label: `${formatDayChip(filters.rangeStart)}–${formatDayChip(filters.rangeEnd)}`,
    });
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
  if (filters.downloaded === "downloaded") {
    chips.push({ id: "downloaded", group: "downloaded", label: "Downloaded" });
  } else if (filters.downloaded === "not_downloaded") {
    chips.push({ id: "downloaded", group: "downloaded", label: "Not downloaded" });
  }
  if (filters.durationMinSec !== undefined || filters.durationMaxSec !== undefined) {
    const min = filters.durationMinSec ?? 0;
    const max = filters.durationMaxSec ?? "∞";
    chips.push({ id: "duration", group: "duration", label: `${min}s–${max}s` });
  }
  return chips;
}

export function clearCameraFilterGroup(
  filters: CameraLibraryFilters,
  chipId: string,
): CameraLibraryFilters {
  if (chipId === "date") {
    return {
      ...filters,
      dateMode: "any",
      singleDay: undefined,
      rangeStart: undefined,
      rangeEnd: undefined,
    };
  }
  if (chipId === "time") {
    return {
      ...filters,
      timeMode: "any",
      singleTime: undefined,
      timeFrom: undefined,
      timeTo: undefined,
    };
  }
  if (chipId.startsWith("cat-")) {
    const cat = chipId.slice(4) as RecordingCategory;
    return { ...filters, categories: filters.categories.filter((c) => c !== cat) };
  }
  if (chipId.startsWith("media-")) {
    const mt = chipId.slice(6) as MediaTypeFilter;
    return { ...filters, mediaTypes: filters.mediaTypes.filter((m) => m !== mt) };
  }
  if (chipId === "downloaded") {
    return { ...filters, downloaded: "any" };
  }
  if (chipId === "duration") {
    return { ...filters, durationMinSec: undefined, durationMaxSec: undefined };
  }
  return filters;
}

export function sumRemoteBytes(files: readonly RemoteFile[]): number {
  let total = 0;
  for (const f of files) total += f.sizeBytes > 0 ? f.sizeBytes : 0;
  return total;
}

export function librarySubtitle(options: {
  readonly linkState: CameraLinkState;
  readonly totalCount: number;
  readonly filteredCount: number;
  readonly hasActiveFilters: boolean;
}): string {
  const { linkState, totalCount, filteredCount, hasActiveFilters } = options;
  if (linkState === "connecting") return "Connecting to camera…";
  if (linkState === "idle" || linkState === "disconnected") return "Camera not connected";
  if (linkState === "connection_lost") {
    if (totalCount > 0 && hasActiveFilters) return `${filteredCount} of ${totalCount} recordings`;
    if (totalCount > 0) return `${totalCount} recordings on camera`;
    return "Camera not connected";
  }
  // connected or unstable — show counts when we have a list
  if (linkState === "unstable" || linkState === "connected") {
    if (hasActiveFilters || filteredCount !== totalCount) {
      return `${filteredCount} of ${totalCount} recordings`;
    }
    return `${totalCount} recordings on camera`;
  }
  return "Camera not connected";
}

export function libraryEmptyInstruction(linkState: CameraLinkState): string | undefined {
  if (linkState === "idle" || linkState === "disconnected" || linkState === "connection_lost") {
    return "Connect to the camera Wi-Fi to view recordings.";
  }
  return undefined;
}

export function formatRemoteDateTime(recordedAt: string): string {
  const iso = recordedAt.includes("T") ? recordedAt : recordedAt.replace(" ", "T");
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) {
    const date = recordedAt.slice(0, 10);
    const time = recordedAt.slice(11, 16);
    return time ? `${date} · ${time}` : date;
  }
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}

/** Sanitize diagnostics — never include secrets or full sensitive URLs. */
export function sanitizeDiagnosticLine(line: string): string {
  return line
    .replace(/(api[_-]?key|secret|token|password|authorization)\s*[:=]\s*\S+/giu, "$1=[redacted]")
    .replace(/Bearer\s+\S+/giu, "Bearer [redacted]")
    .replace(/([A-Za-z]:\\|\/Users\/|\/home\/)[^\s]+/gu, "[path]");
}

export function friendlyConnectionError(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = sanitizeDiagnosticLine(raw).toLowerCase();
  if (s.includes("timeout") || s.includes("timed out")) {
    return "The camera did not respond in time. Check Wi‑Fi and try again.";
  }
  if (s.includes("private ipv4") || s.includes("host must")) {
    return "Set a valid camera IP in Settings, then try again.";
  }
  if (s.includes("network") || s.includes("econnrefused") || s.includes("failed to fetch")) {
    return "Laneory cannot reach the camera. Join the camera Wi‑Fi and try again.";
  }
  return "Could not connect to the camera. Try again.";
}
