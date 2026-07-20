import { formatCompactDateTime } from "@/components/local/localLibrarySections";
import { parseRecordedParts } from "@/components/mediaMeta";

/** Localized size for player meta row (`371,2 MB`). */
export function formatPlayerSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb.toFixed(1).replace(".", ",")} GB`;
  }
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

/**
 * Compact player metadata: `19 iul. 2026 · 13:50` (same local date interpretation as Local Library).
 * Duration is omitted — native controls already show it.
 */
export function formatPlayerCompactMeta(
  name: string,
  sizeBytes: number,
): { when: string | undefined; size: string } {
  const when = formatCompactDateTime(name);
  return { when, size: formatPlayerSize(sizeBytes) };
}

/** Truncate long filenames for header; keep extension when space allows. */
export function truncatePlayerFilename(name: string, maxChars = 28): string {
  if (name.length <= maxChars) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : "";
  const base = ext ? name.slice(0, name.length - ext.length) : name;
  const keep = Math.max(4, maxChars - ext.length - 1);
  if (base.length <= keep) return name;
  return `${base.slice(0, keep)}…${ext}`;
}

export function hasRecordedTimestamp(name: string): boolean {
  return parseRecordedParts(name) !== undefined;
}
