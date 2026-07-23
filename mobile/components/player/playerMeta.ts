import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import { formatRecordingDate } from "@/components/media/recordingDateTime";
import { formatDuration, parseRecordedParts } from "@/components/mediaMeta";

export const PLAYER_META_LABELS = ["DATE", "TIME", "SIZE", "DURATION"] as const;

export interface PlayerMetaFields {
  readonly date: string;
  readonly time: string;
  readonly size: string;
  readonly duration: string;
}

/** Shared en-GB size (`371.2 MB`) — same helper as Library / Queue / Storage. */
export function formatPlayerSize(bytes: number): string {
  return formatMediaSizeMbGb(bytes);
}

export function formatPlayerRecordedDate(name: string): string {
  const parts = parseRecordedParts(name);
  if (!parts) return "—";
  const formatted = formatRecordingDate(parts.isoLocal);
  if (formatted === "Choose a valid date") return parts.date;
  return formatted;
}

export function formatPlayerRecordedTime(name: string): string {
  const parts = parseRecordedParts(name);
  if (!parts) return "—";
  return parts.time; // HH:mm:ss from filename
}

export function formatPlayerDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return "—";
  return formatDuration(seconds);
}

/** Four metrics for the premium metadata card. */
export function buildPlayerMetaFields(
  name: string,
  sizeBytes: number,
  durationSeconds?: number,
): PlayerMetaFields {
  return {
    date: formatPlayerRecordedDate(name),
    time: formatPlayerRecordedTime(name),
    size: formatPlayerSize(sizeBytes),
    duration: formatPlayerDuration(durationSeconds),
  };
}

/** @deprecated Prefer buildPlayerMetaFields for the premium card. */
export function formatPlayerCompactMeta(
  name: string,
  sizeBytes: number,
): { when: string | undefined; size: string } {
  const date = formatPlayerRecordedDate(name);
  const time = formatPlayerRecordedTime(name);
  const when = date !== "—" ? `${date} · ${time.slice(0, 5)}` : undefined;
  const size = formatPlayerSize(sizeBytes);
  return { when, size: size === "—" ? "" : size };
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
