import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";

import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import { formatRecordingDateTime } from "@/components/media/recordingDateTime";

export type QueueAction = "pause" | "resume" | "cancel" | "remove" | "retry";

export function isSidecarNmea(name: string): boolean {
  return /\.nmea$/i.test(name);
}

/** Visible queue rows (hide NMEA sidecars and completed transfers). */
export function filterVisibleQueueItems(items: readonly QueueItem[]): QueueItem[] {
  return items.filter((item) => !isSidecarNmea(item.localName) && item.status !== "completed");
}

/** Active / paused / waiting-for-camera first, then queued, then failed / cancelled. */
export function sortQueueForDisplay(items: readonly QueueItem[]): QueueItem[] {
  const rank = (status: QueueItemStatus): number => {
    if (status === "active") return 0;
    if (status === "paused") return 1;
    if (status === "waiting_for_connection") return 2;
    if (status === "queued") return 3;
    if (status === "failed") return 4;
    return 5;
  };
  return [...items].sort((a, b) => rank(a.status) - rank(b.status));
}

/**
 * Position among active + waiting items (1 = downloading/paused head).
 * Consecutive over the current visible order — no historical IDs.
 */
export function queueDisplayPosition(
  orderedVisible: readonly QueueItem[],
  itemId: string,
): number | undefined {
  const lane = orderedVisible.filter(
    (item) =>
      item.status === "active" ||
      item.status === "paused" ||
      item.status === "queued" ||
      item.status === "waiting_for_connection",
  );
  const index = lane.findIndex((item) => item.id === itemId);
  return index < 0 ? undefined : index + 1;
}

export function actionsForStatus(status: QueueItemStatus): readonly QueueAction[] {
  switch (status) {
    case "active":
      return ["pause", "cancel"];
    case "paused":
      return ["resume", "cancel"];
    case "queued":
      return ["remove"];
    case "waiting_for_connection":
      return ["remove"];
    case "failed":
      return ["retry", "remove"];
    case "cancelled":
      return ["remove"];
    case "completed":
      return [];
    default:
      return [];
  }
}

export function isExpandedCard(status: QueueItemStatus): boolean {
  /** Only the actively downloading transfer uses the large card. */
  return status === "active";
}

export function showsProgress(status: QueueItemStatus): boolean {
  return status === "active" || status === "paused" || status === "waiting_for_connection";
}

export type QueueThumbSize = { readonly width: number; readonly height: number };

export function queueThumbSize(status: QueueItemStatus): QueueThumbSize {
  if (status === "active") return { width: 64, height: 52 };
  return { width: 58, height: 46 };
}

/** Prefer an already-local library URI so Queue reuses Local Library thumb cache. */
export function resolveQueueThumbnailUri(input: {
  readonly localName: string;
  readonly downloadDir: string;
  readonly localFiles: readonly { readonly name: string; readonly uri: string }[];
}): string {
  const existing = input.localFiles.find((f) => f.name === input.localName);
  if (existing) return existing.uri;
  if (input.downloadDir.endsWith("/")) return `${input.downloadDir}${input.localName}`;
  return `${input.downloadDir}/${input.localName}`;
}

export function formatQueueSummary(items: readonly QueueItem[]): string {
  const downloading = items.filter((i) => i.status === "active").length;
  const paused = items.filter((i) => i.status === "paused").length;
  const waitingCamera = items.filter((i) => i.status === "waiting_for_connection").length;
  const waiting = items.filter((i) => i.status === "queued").length;
  const failed = items.filter((i) => i.status === "failed").length;

  if (items.length === 0) return "Queue is empty";

  const parts: string[] = [];
  if (downloading > 0) {
    parts.push(downloading === 1 ? "1 downloading" : `${downloading} downloading`);
  }
  if (paused > 0) {
    parts.push(paused === 1 ? "1 paused" : `${paused} paused`);
  }
  if (waitingCamera > 0) {
    parts.push(
      waitingCamera === 1 ? "1 waiting for camera" : `${waitingCamera} waiting for camera`,
    );
  }
  if (waiting > 0) {
    parts.push(waiting === 1 ? "1 waiting" : `${waiting} waiting`);
  }
  if (failed > 0 && parts.length === 0) {
    parts.push(failed === 1 ? "1 failed" : `${failed} failed`);
  }
  if (parts.length === 0) {
    const other = items.length;
    return other === 1 ? "1 item" : `${other} items`;
  }
  return parts.join(" · ");
}

export function formatSizeMb(bytes: number): string {
  return formatMediaSizeMbGb(bytes);
}

/** Compact clip length: `3 min` / `1 min 5 sec`. */
export function formatDurationHuman(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s} sec`;
  if (s === 0) return m === 1 ? "1 min" : `${m} min`;
  return `${m} min ${s} sec`;
}

export function formatEtaRemaining(remainingSec: number): string {
  if (!Number.isFinite(remainingSec) || remainingSec < 0) return "";
  const total = Math.max(0, Math.ceil(remainingSec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s} sec remaining`;
  if (s === 0) return m === 1 ? "1 min remaining" : `${m} min remaining`;
  return `${m} min ${s} sec remaining`;
}

/**
 * ETA only for an active transfer with enough stable samples.
 * Returns `undefined` to hide, `"Calculating…"` while warming up, or a formatted ETA.
 */
export function resolveEtaDisplay(input: {
  readonly status: string;
  readonly percent: number;
  readonly rateBps: number;
  readonly remainingSec: number;
}): string | undefined {
  if (input.status !== "active") return undefined;
  if (!Number.isFinite(input.percent) || input.percent < 0) return undefined;
  if (!Number.isFinite(input.rateBps) || input.rateBps <= 0) {
    return input.percent > 0 ? "Calculating…" : undefined;
  }
  if (input.percent < 2) return "Calculating…";
  if (!Number.isFinite(input.remainingSec) || input.remainingSec <= 0) return "Calculating…";
  // Guard against absurd outliers (e.g. rate collapse → days of ETA).
  if (input.remainingSec > 24 * 3600) return "Calculating…";
  const label = formatEtaRemaining(input.remainingSec);
  return label === "" ? undefined : label;
}

export function formatCompactDateTime(
  name: string,
  parseParts: (n: string) => { isoLocal: string; date: string; time: string } | undefined,
): string | undefined {
  const parts = parseParts(name);
  if (!parts) return undefined;
  const formatted = formatRecordingDateTime(parts.isoLocal);
  if (formatted.startsWith("Choose a valid")) {
    return `${parts.date} · ${parts.time.slice(0, 5)}`;
  }
  return formatted;
}

/** EMA helper to damp speed/ETA flicker. */
export function smoothRate(previous: number, instant: number, alpha = 0.25): number {
  if (!Number.isFinite(instant) || instant <= 0) return previous;
  if (!Number.isFinite(previous) || previous <= 0) return instant;
  return previous * (1 - alpha) + instant * alpha;
}

/** FlatList bottom inset so the last card clears the tab bar (+ home indicator). */
export const QUEUE_LIST_BOTTOM_PADDING = 96;

/** Visual control height; pair with hitSlop so the real target stays ≥44. */
export const QUEUE_ACTION_VISUAL_HEIGHT = 36;
export const QUEUE_ACTION_MIN_WIDTH = 72;
/** Keep horizontal slop small so Pause/Cancel hit areas do not overlap (gap ≥ 8). */
export const QUEUE_ACTION_HIT_SLOP = { top: 4, bottom: 4, left: 2, right: 2 } as const;
export const QUEUE_ACTION_GAP = 8;

export function queueActionHitHeight(
  visualHeight = QUEUE_ACTION_VISUAL_HEIGHT,
  hitSlop = QUEUE_ACTION_HIT_SLOP,
): number {
  return visualHeight + hitSlop.top + hitSlop.bottom;
}

export function queueActionHitWidth(
  visualWidth = QUEUE_ACTION_MIN_WIDTH,
  hitSlop = QUEUE_ACTION_HIT_SLOP,
): number {
  return visualWidth + hitSlop.left + hitSlop.right;
}

/** Serializes UI actions so double-taps do not fire twice. */
export function createQueueActionGate() {
  let busy = false;
  return async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy) return undefined;
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
    }
  };
}

/** Shared alias for Local Library / other screens. */
export const createUiActionGate = createQueueActionGate;

/** Accessibility announcement when queue item status changes (not on percent ticks). */
export function queueStatusAnnouncement(
  localName: string,
  previous: string | undefined,
  next: string,
): string | undefined {
  if (previous === next) return undefined;
  if (previous === undefined && next === "queued") return undefined;
  if (next === "active") {
    return previous === "paused"
      ? `Download resumed for ${localName}`
      : `Download started for ${localName}`;
  }
  if (next === "paused") return `Download paused for ${localName}`;
  if (next === "waiting_for_connection") {
    return `Waiting for camera connection for ${localName}`;
  }
  if (next === "failed") return `Download failed for ${localName}`;
  if (next === "cancelled") return `Download cancelled for ${localName}`;
  if (next === "completed") return `Download completed for ${localName}`;
  return undefined;
}

/** Cancelled or failed rows eligible for Clear (not active work). */
export function isClearableQueueStatus(status: QueueItemStatus): boolean {
  return status === "cancelled" || status === "failed";
}

export function clearableQueueItems(items: readonly QueueItem[]): QueueItem[] {
  return items.filter((item) => isClearableQueueStatus(item.status));
}

export function queueClearConfirmTitle(): string {
  return "Clear Queue items?";
}

export function queueClearConfirmMessage(count: number): string {
  return `Removes ${count} canceled or failed items from Queue. Downloaded recordings are not deleted.`;
}

export function queueClearedAnnouncement(count: number): string {
  if (count === 1) return "Removed 1 canceled or failed item from Queue";
  return `Removed ${count} canceled or failed items from Queue`;
}
