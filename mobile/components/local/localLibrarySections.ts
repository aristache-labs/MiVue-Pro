import { parseRecordedParts } from "@/components/mediaMeta";
import type { LocalMediaFile } from "@/context/DemoModeContext";

export interface LocalLibrarySection {
  readonly key: string;
  readonly title: string;
  readonly count: number;
  readonly countLabel: string;
  readonly dayKey: string;
  readonly data: readonly LocalMediaFile[];
}

/** Contract: Local Library SectionList must enable sticky section headers. */
export const LOCAL_LIBRARY_STICKY_HEADERS = true;

export function dayKeyFromName(name: string): string {
  const parts = parseRecordedParts(name);
  if (!parts) return "unknown";
  return parts.isoLocal.slice(0, 10);
}

export function formatSectionHeading(dayKey: string): string {
  if (dayKey === "unknown") return "DATĂ NECUNOSCUTĂ";
  const d = new Date(`${dayKey}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return "DATĂ NECUNOSCUTĂ";
  return d
    .toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

export function formatCountLabel(count: number): string {
  return count === 1 ? "1 fișier" : `${count} fișiere`;
}

/** Compact card line: `19 iul. 2026 · 13:50`. */
export function formatCompactDateTime(name: string): string | undefined {
  const parts = parseRecordedParts(name);
  if (!parts) return undefined;
  const d = new Date(`${parts.isoLocal.replace(" ", "T")}`);
  if (!Number.isFinite(d.getTime())) {
    return `${parts.date} · ${parts.time.slice(0, 5)}`;
  }
  const date = d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date} · ${parts.time.slice(0, 5)}`;
}

/**
 * Group local files by calendar day, newest days first.
 * Within a day, preserves the relative order of `files` (already sorted newest-first by caller or here).
 */
export function buildLocalLibrarySections(
  files: readonly LocalMediaFile[],
): LocalLibrarySection[] {
  const sorted = [...files].sort((a, b) => {
    const ka = dayKeyFromName(a.name);
    const kb = dayKeyFromName(b.name);
    if (ka !== kb) {
      if (ka === "unknown") return 1;
      if (kb === "unknown") return -1;
      return kb.localeCompare(ka);
    }
    const pa = parseRecordedParts(a.name);
    const pb = parseRecordedParts(b.name);
    const ta = pa?.isoLocal ?? a.name;
    const tb = pb?.isoLocal ?? b.name;
    return tb.localeCompare(ta);
  });

  const map = new Map<string, LocalMediaFile[]>();
  for (const file of sorted) {
    const key = dayKeyFromName(file.name);
    const list = map.get(key);
    if (list) list.push(file);
    else map.set(key, [file]);
  }

  return [...map.entries()].map(([dayKey, data]) => ({
    key: dayKey,
    dayKey,
    title: formatSectionHeading(dayKey),
    count: data.length,
    countLabel: formatCountLabel(data.length),
    data,
  }));
}
