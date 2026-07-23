import type { FileCategory, RemoteFile } from "@/packages/parsers/src/index";
import {
  isValidDayKey,
  minutesInTimeRange,
  parseMinutesOfDay,
  type DateFilterMode,
  type MediaTypeFilter,
  type TimeFilterMode,
} from "@/components/local/localLibraryFilters";
import {
  formatDateRange,
  formatDateSeparator,
  formatRecordingDate,
  formatRecordingDateTime,
  formatTimeRange,
  getRecordingSearchIndexMap,
  matchesRecordingSearch,
  matchesRecordingSearchIndex,
  RECORDING_UI_LOCALE,
} from "@/components/media/recordingDateTime";

/** App UI copy is English — Camera Library uses this locale consistently. */
export const CAMERA_UI_LOCALE = RECORDING_UI_LOCALE;

export function formatCameraSectionHeading(dayKey: string): string {
  if (dayKey === "unknown" || dayKey === "all") return "UNKNOWN DATE";
  return formatDateSeparator(dayKey);
}

export function formatCameraCountLabel(count: number): string {
  return count === 1 ? "1 file" : `${count} files`;
}

export type CategoryFilter = "all" | Exclude<FileCategory, "unknown">;

export type CameraLibrarySort =
  | "newest"
  | "oldest"
  | "largest"
  | "smallest"
  | "longest"
  | "shortest";

export const CAMERA_SORT_OPTIONS: readonly { id: CameraLibrarySort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "largest", label: "Largest first" },
  { id: "smallest", label: "Smallest first" },
  { id: "longest", label: "Longest first" },
  { id: "shortest", label: "Shortest first" },
];

export type CameraFilterCategory = "normal" | "parking" | "event" | "photo";

export type DownloadedFilter = "any" | "downloaded" | "not_downloaded" | "in_queue";

export interface CameraLibraryFilters {
  readonly dateMode: DateFilterMode;
  readonly singleDay?: string;
  readonly rangeStart?: string;
  readonly rangeEnd?: string;
  readonly timeMode: TimeFilterMode;
  readonly singleTime?: string;
  readonly timeFrom?: string;
  readonly timeTo?: string;
  /** Multi-select only when main category scope is All. */
  readonly categories: readonly CameraFilterCategory[];
  readonly mediaTypes: readonly MediaTypeFilter[];
  readonly downloaded: DownloadedFilter;
  readonly durationMinSec?: number;
  readonly durationMaxSec?: number;
  readonly sizeMinBytes?: number;
  readonly sizeMaxBytes?: number;
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

/** FlatList row for Camera Library — section metadata travels with each file. */
export interface CameraLibraryFileRow {
  readonly key: string;
  readonly sectionKey: string;
  readonly sectionTitle: string;
  readonly sectionCountLabel: string;
  readonly file: RemoteFile;
}

export interface CameraFilterChip {
  readonly id: string;
  readonly label: string;
  readonly group: "date" | "time" | "category" | "media" | "downloaded" | "duration" | "size";
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

export function formatCountAbbrev(count: number): { readonly display: string; readonly a11y: string } {
  const a11y = String(count);
  if (count < 1000) return { display: a11y, a11y };
  if (count < 10_000) {
    const k = (count / 1000).toFixed(1).replace(/\.0$/u, "");
    return { display: `${k}K`, a11y };
  }
  const k = (count / 1000).toFixed(1).replace(/\.0$/u, "");
  return { display: `${k}K`, a11y };
}

export function formatMediaSizeMbGb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export function cameraSortOptionsForCategory(
  category: CategoryFilter,
): readonly { id: CameraLibrarySort; label: string }[] {
  if (category === "photo") {
    return CAMERA_SORT_OPTIONS.filter((o) => o.id !== "longest" && o.id !== "shortest");
  }
  return CAMERA_SORT_OPTIONS;
}

/** Drop filter fields that conflict with the main category chip. */
export function sanitizeFiltersForCategoryScope(
  filters: CameraLibraryFilters,
  category: CategoryFilter,
): CameraLibraryFilters {
  if (category === "all") return filters;
  let next: CameraLibraryFilters = {
    ...filters,
    categories: [],
    mediaTypes: [],
  };
  if (category === "photo") {
    next = {
      ...next,
      durationMinSec: undefined,
      durationMaxSec: undefined,
    };
  }
  return next;
}

export function showCategorySectionInFilters(category: CategoryFilter): boolean {
  return category === "all";
}

/** Why Show X results should stay disabled — undefined means draft is valid. */
export function cameraFilterDraftIssue(filters: CameraLibraryFilters): string | undefined {
  if (filters.dateMode === "single" && !isValidDayKey(filters.singleDay)) {
    return "Choose a day.";
  }
  if (filters.dateMode === "range") {
    if (!isValidDayKey(filters.rangeStart) || !isValidDayKey(filters.rangeEnd)) {
      return "Choose a start and end date.";
    }
    if (filters.rangeStart! > filters.rangeEnd!) {
      return "From must be on or before To.";
    }
  }
  if (filters.timeMode === "single" && parseMinutesOfDay(filters.singleTime) === undefined) {
    return "Choose a time.";
  }
  if (filters.timeMode === "range") {
    if (
      parseMinutesOfDay(filters.timeFrom) === undefined ||
      parseMinutesOfDay(filters.timeTo) === undefined
    ) {
      return "Choose From and To times.";
    }
  }
  return undefined;
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
    filters.durationMaxSec === undefined &&
    filters.sizeMinBytes === undefined &&
    filters.sizeMaxBytes === undefined
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
  if (filters.sizeMinBytes !== undefined || filters.sizeMaxBytes !== undefined) n += 1;
  return n;
}

function dayInInclusiveRange(dayKey: string, start: string, end: string): boolean {
  return dayKey >= start && dayKey <= end;
}

export function remoteMatchesFilters(
  file: RemoteFile,
  filters: CameraLibraryFilters,
  downloadedNames: ReadonlySet<string>,
  queuedNames: ReadonlySet<string> = new Set(),
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
    if (!filters.categories.includes(file.category as CameraFilterCategory)) return false;
  }

  if (filters.mediaTypes.length > 0) {
    const mt = mediaTypeFromRemote(file);
    if (mt === "other" || !filters.mediaTypes.includes(mt)) return false;
  }

  if (filters.downloaded === "downloaded" && !downloadedNames.has(file.name)) return false;
  if (filters.downloaded === "not_downloaded" && downloadedNames.has(file.name)) return false;
  if (filters.downloaded === "in_queue" && !queuedNames.has(file.name)) return false;

  const dur = file.durationSeconds;
  if (filters.durationMinSec !== undefined) {
    if (dur === undefined || dur < filters.durationMinSec) return false;
  }
  if (filters.durationMaxSec !== undefined) {
    if (dur === undefined || dur > filters.durationMaxSec) return false;
  }

  if (filters.sizeMinBytes !== undefined && file.sizeBytes < filters.sizeMinBytes) return false;
  if (filters.sizeMaxBytes !== undefined && file.sizeBytes > filters.sizeMaxBytes) return false;

  return true;
}

/** Local AND-token search over name, category, date, and time — no camera I/O. */
export function matchesSearch(file: RemoteFile, query: string): boolean {
  return matchesRecordingSearch(file, query);
}

export function filterAndSortRemoteFiles(options: {
  readonly files: readonly RemoteFile[];
  readonly category: CategoryFilter;
  readonly search: string;
  readonly filters: CameraLibraryFilters;
  readonly sort: CameraLibrarySort;
  readonly downloadedNames: ReadonlySet<string>;
  readonly queuedNames?: ReadonlySet<string>;
}): RemoteFile[] {
  const {
    files,
    category,
    search,
    filters,
    sort,
    downloadedNames,
    queuedNames = new Set(),
  } = options;
  const scoped = sanitizeFiltersForCategoryScope(filters, category);
  const searchIndex = getRecordingSearchIndexMap(files);
  const out: RemoteFile[] = [];
  for (const file of files) {
    if (category !== "all" && file.category !== category) continue;
    if (!matchesRecordingSearchIndex(searchIndex.get(file.name) ?? "", search)) continue;
    if (!remoteMatchesFilters(file, scoped, downloadedNames, queuedNames)) continue;
    out.push(file);
  }
  out.sort((a, b) => compareRemoteFiles(a, b, sort));
  return out;
}

export function countFilteredRemoteFiles(options: {
  readonly files: readonly RemoteFile[];
  readonly category: CategoryFilter;
  readonly search: string;
  readonly filters: CameraLibraryFilters;
  readonly downloadedNames: ReadonlySet<string>;
  readonly queuedNames?: ReadonlySet<string>;
}): number {
  return filterAndSortRemoteFiles({
    ...options,
    sort: "newest",
    queuedNames: options.queuedNames,
  }).length;
}

export function buildCameraLibrarySections(
  files: readonly RemoteFile[],
  sort: CameraLibrarySort,
): CameraLibrarySection[] {
  if (!isDateBasedSort(sort)) {
    const flatKey = `all-${sort}`;
    return [
      {
        key: flatKey,
        dayKey: flatKey,
        title: CAMERA_SORT_OPTIONS.find((o) => o.id === sort)?.label.toUpperCase() ?? "RESULTS",
        count: files.length,
        countLabel: formatCameraCountLabel(files.length),
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
      title: key === "unknown" ? "UNKNOWN DATE" : formatCameraSectionHeading(key),
      count: data.length,
      countLabel: formatCameraCountLabel(data.length),
      data,
    };
  });
}

/**
 * Flatten sections into file rows for FlatList.
 * Avoids SectionList sticky-header virtualization bugs on iOS.
 */
export function buildCameraLibraryFileRows(
  sections: readonly CameraLibrarySection[],
): CameraLibraryFileRow[] {
  const rows: CameraLibraryFileRow[] = [];
  for (const section of sections) {
    for (const file of section.data) {
      rows.push({
        key: file.path,
        sectionKey: section.key,
        sectionTitle: section.title,
        sectionCountLabel: section.countLabel,
        file,
      });
    }
  }
  return rows;
}

export function buildCameraFilterChips(filters: CameraLibraryFilters): CameraFilterChip[] {
  const chips: CameraFilterChip[] = [];
  if (filters.dateMode === "single" && filters.singleDay) {
    chips.push({
      id: "date",
      group: "date",
      label: formatRecordingDate(`${filters.singleDay} 12:00:00`),
    });
  } else if (filters.dateMode === "range" && filters.rangeStart && filters.rangeEnd) {
    chips.push({
      id: "date",
      group: "date",
      label: formatDateRange(filters.rangeStart, filters.rangeEnd),
    });
  }
  if (filters.timeMode === "single" && filters.singleTime) {
    chips.push({ id: "time", group: "time", label: filters.singleTime });
  } else if (filters.timeMode === "range" && filters.timeFrom && filters.timeTo) {
    chips.push({
      id: "time",
      group: "time",
      label: formatTimeRange(filters.timeFrom, filters.timeTo),
    });
  }
  for (const cat of filters.categories) {
    const label =
      cat === "normal"
        ? "Normal"
        : cat === "parking"
          ? "Parking"
          : cat === "event"
            ? "Event"
            : "Photos";
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
  } else if (filters.downloaded === "in_queue") {
    chips.push({ id: "downloaded", group: "downloaded", label: "In queue" });
  }
  if (filters.durationMinSec !== undefined || filters.durationMaxSec !== undefined) {
    if (filters.durationMaxSec === 60 && filters.durationMinSec === undefined) {
      chips.push({ id: "duration", group: "duration", label: "Under 1 min" });
    } else if (filters.durationMinSec === 60 && filters.durationMaxSec === 300) {
      chips.push({ id: "duration", group: "duration", label: "1–5 min" });
    } else if (filters.durationMinSec === 300 && filters.durationMaxSec === undefined) {
      chips.push({ id: "duration", group: "duration", label: "Over 5 min" });
    } else {
      const min = filters.durationMinSec ?? 0;
      const max = filters.durationMaxSec ?? "∞";
      chips.push({ id: "duration", group: "duration", label: `${min}s–${max}s` });
    }
  }
  if (filters.sizeMinBytes !== undefined || filters.sizeMaxBytes !== undefined) {
    const mb100 = 100 * 1024 * 1024;
    const mb300 = 300 * 1024 * 1024;
    if (filters.sizeMaxBytes === mb100 && filters.sizeMinBytes === undefined) {
      chips.push({ id: "size", group: "size", label: "Under 100 MB" });
    } else if (filters.sizeMinBytes === mb100 && filters.sizeMaxBytes === mb300) {
      chips.push({ id: "size", group: "size", label: "100–300 MB" });
    } else if (filters.sizeMinBytes === mb300 && filters.sizeMaxBytes === undefined) {
      chips.push({ id: "size", group: "size", label: "Over 300 MB" });
    } else {
      chips.push({ id: "size", group: "size", label: "Size" });
    }
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
    const cat = chipId.slice(4) as CameraFilterCategory;
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
  if (chipId === "size") {
    return { ...filters, sizeMinBytes: undefined, sizeMaxBytes: undefined };
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
  if (linkState === "connection_lost") return "Connection lost";
  // connected or unstable — show counts only for a live remote session
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

export type LibraryEmptyPresentation = {
  readonly icon: "cloud-offline-outline" | "folder-open-outline";
  readonly title: string;
  readonly subtitle: string;
  readonly actionLabel?: "Connect camera" | "Reconnect";
};

/** Primary empty-state copy for the Library list (not the instruction-as-title). */
export function libraryEmptyPresentation(
  linkState: CameraLinkState,
): LibraryEmptyPresentation | undefined {
  if (linkState === "connecting") return undefined;
  if (linkState === "idle" || linkState === "disconnected") {
    return {
      icon: "cloud-offline-outline",
      title: "Camera not connected",
      subtitle: "Connect to the camera Wi-Fi, then refresh to view recordings.",
      actionLabel: "Connect camera",
    };
  }
  if (linkState === "connection_lost") {
    return {
      icon: "cloud-offline-outline",
      title: "Camera connection lost",
      subtitle: "Reconnect to the camera Wi-Fi and try again.",
      actionLabel: "Reconnect",
    };
  }
  if (linkState === "connected" || linkState === "unstable") {
    return {
      icon: "folder-open-outline",
      title: "No recordings found",
      subtitle: "No supported recordings are currently available on the camera.",
    };
  }
  return undefined;
}

export function formatRemoteDateTime(recordedAt: string): string {
  return formatRecordingDateTime(recordedAt);
}

export function formatCameraTimestamp(iso: string): string {
  return formatRecordingDateTime(iso.includes("T") ? iso.replace("T", " ") : iso);
}

/** Visible UI must never leak Expo Router group names. */
export const FORBIDDEN_ROUTE_UI_STRINGS = Object.freeze(["(tabs)", "(stack)", "+not-found"] as const);

/** Stack back label for Connection help — never a route group name. */
export const CONNECTION_HELP_BACK_TITLE = "Back";

/**
 * Connected success toast/banner is intentionally never shown —
 * status lives in the header icon, subtitle, and connection sheet.
 */
export const SHOW_CONNECTED_SUCCESS_BANNER = false;

export const CAMERA_REFRESH_IN_PROGRESS = "A refresh is already in progress.";

export function containsForbiddenRouteUi(text: string): boolean {
  return FORBIDDEN_ROUTE_UI_STRINGS.some((s) => text.includes(s));
}

export function canStartCameraRefresh(inflight: boolean): boolean {
  return !inflight;
}

/**
 * Compact unavailable strip — disabled when the list empty-state is the primary message.
 * Kept for callers; always false so Library does not stack duplicate disconnect chrome.
 */
export function shouldShowCameraUnavailableBanner(
  _linkState: CameraLinkState,
  _fileCount: number,
): boolean {
  return false;
}

/** Filters/search only when a live remote session is valid — never because stale files remain. */
export function isCameraLibraryInteractive(linkState: CameraLinkState): boolean {
  return linkState === "connected" || linkState === "unstable";
}

/** Generation token so stale list/refresh responses cannot repopulate after disconnect. */
export function bumpCameraSessionGeneration(current: number): number {
  return current + 1;
}

export function isCameraSessionCurrent(requestGeneration: number, currentGeneration: number): boolean {
  return requestGeneration === currentGeneration;
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
  if (s.includes("connection lost")) {
    return "Camera disconnected. Rejoin the camera Wi‑Fi, then try again.";
  }
  if (s.includes("private ipv4") || s.includes("host must")) {
    return "Set a valid camera IP in Settings, then try again.";
  }
  if (s.includes("network") || s.includes("econnrefused") || s.includes("failed to fetch")) {
    return "Laneory cannot reach the camera. Join the camera Wi‑Fi and try again.";
  }
  return "Could not connect to the camera. Try again.";
}
