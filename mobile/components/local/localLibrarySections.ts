import { parseRecordedParts } from "@/components/mediaMeta";
import {
  CAMERA_SORT_OPTIONS,
  isDateBasedSort,
  type CameraLibrarySort,
} from "@/components/camera/cameraLibraryModel";
import {
  formatDateSeparator,
  formatRecordingDateTime,
} from "@/components/media/recordingDateTime";
import type { LocalMediaFile } from "@/context/DemoModeContext";

export interface LocalLibrarySection {
  readonly key: string;
  readonly title: string;
  readonly count: number;
  readonly countLabel: string;
  readonly dayKey: string;
  readonly data: readonly LocalMediaFile[];
}

/** FlatList row — section metadata travels with each local file. */
export interface LocalLibraryFileRow {
  readonly key: string;
  readonly sectionKey: string;
  readonly sectionTitle: string;
  readonly sectionCountLabel: string;
  readonly file: LocalMediaFile;
}

/**
 * Sticky date UX for Local Library (FlatList overlay — not native SectionList sticky).
 * Kept for shared contracts / Local action density tests.
 */
export const LOCAL_LIBRARY_STICKY_HEADERS = true;

/** Bottom inset so the last card clears the tab bar (+ home indicator). */
export const LOCAL_LIBRARY_LIST_BOTTOM_PADDING = 96;

/** Share / Delete visual hit box (already ≥44). */
export const LOCAL_ACTION_HIT = 44;

export function dayKeyFromName(name: string): string {
  const parts = parseRecordedParts(name);
  if (!parts) return "unknown";
  return parts.isoLocal.slice(0, 10);
}

export function formatSectionHeading(dayKey: string): string {
  if (dayKey === "unknown") return "UNKNOWN DATE";
  return formatDateSeparator(dayKey);
}

export function formatCountLabel(count: number): string {
  return count === 1 ? "1 file" : `${count} files`;
}

/** Compact card line: `19 Jul 2026 · 13:50` (en-GB). */
export function formatCompactDateTime(name: string): string | undefined {
  const parts = parseRecordedParts(name);
  if (!parts) return undefined;
  return formatRecordingDateTime(parts.isoLocal);
}

function localIso(name: string): string | undefined {
  return parseRecordedParts(name)?.isoLocal;
}

export function compareLocalFiles(
  a: LocalMediaFile,
  b: LocalMediaFile,
  sort: CameraLibrarySort,
  durationByName: ReadonlyMap<string, number> = new Map(),
): number {
  switch (sort) {
    case "largest":
      return b.sizeBytes - a.sizeBytes;
    case "smallest":
      return a.sizeBytes - b.sizeBytes;
    case "longest":
      return (durationByName.get(b.name) ?? 0) - (durationByName.get(a.name) ?? 0);
    case "shortest":
      return (durationByName.get(a.name) ?? 0) - (durationByName.get(b.name) ?? 0);
    case "oldest": {
      const ta = localIso(a.name);
      const tb = localIso(b.name);
      if (!ta && !tb) return a.name.localeCompare(b.name);
      if (!ta) return 1;
      if (!tb) return -1;
      return ta.localeCompare(tb);
    }
    case "newest":
    default: {
      const ta = localIso(a.name);
      const tb = localIso(b.name);
      if (!ta && !tb) return a.name.localeCompare(b.name);
      if (!ta) return 1;
      if (!tb) return -1;
      return tb.localeCompare(ta);
    }
  }
}

/**
 * Group local files by calendar day when sort is date-based; otherwise one flat section.
 * Caller should pass files already filtered; this applies `sort` ordering.
 */
export function buildLocalLibrarySections(
  files: readonly LocalMediaFile[],
  sort: CameraLibrarySort = "newest",
  durationByName: ReadonlyMap<string, number> = new Map(),
): LocalLibrarySection[] {
  const sorted = [...files].sort((a, b) => compareLocalFiles(a, b, sort, durationByName));

  if (!isDateBasedSort(sort)) {
    const flatKey = `all-${sort}`;
    return [
      {
        key: flatKey,
        dayKey: flatKey,
        title: CAMERA_SORT_OPTIONS.find((o) => o.id === sort)?.label.toUpperCase() ?? "RESULTS",
        count: sorted.length,
        countLabel: formatCountLabel(sorted.length),
        data: sorted,
      },
    ];
  }

  const map = new Map<string, LocalMediaFile[]>();
  for (const file of sorted) {
    const key = dayKeyFromName(file.name);
    const list = map.get(key);
    if (list) list.push(file);
    else map.set(key, [file]);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return sort === "oldest" ? a.localeCompare(b) : b.localeCompare(a);
  });

  return keys.map((dayKey) => {
    const data = map.get(dayKey) ?? [];
    return {
      key: dayKey,
      dayKey,
      title: formatSectionHeading(dayKey),
      count: data.length,
      countLabel: formatCountLabel(data.length),
      data,
    };
  });
}

/**
 * Flatten sections into file rows for FlatList.
 * Days without files are omitted — non-consecutive calendar days stay adjacent.
 */
export function buildLocalLibraryFileRows(
  sections: readonly LocalLibrarySection[],
): LocalLibraryFileRow[] {
  const rows: LocalLibraryFileRow[] = [];
  for (const section of sections) {
    for (const file of section.data) {
      rows.push({
        key: file.uri,
        sectionKey: section.key,
        sectionTitle: section.title,
        sectionCountLabel: section.countLabel,
        file,
      });
    }
  }
  return rows;
}

/**
 * Section key for sticky overlay — first viewable LocalLibraryFileRow wins.
 * Returns undefined when the viewport has no file tokens (keep previous key).
 */
export function stickySectionKeyFromLocalViewableItems(
  viewableItems: ReadonlyArray<{ readonly item?: unknown }>,
): string | undefined {
  for (const token of viewableItems) {
    const item = token.item;
    if (!item || typeof item !== "object") continue;
    if (!("sectionKey" in item)) continue;
    const key = (item as { sectionKey: unknown }).sectionKey;
    if (typeof key === "string" && key.length > 0) return key;
  }
  return undefined;
}
