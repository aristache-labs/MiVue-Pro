import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";

/** Wait briefly for an active cancel to settle before remove. */
export async function waitForQueueStatus(
  getItem: () => QueueItem | undefined,
  done: (status: QueueItemStatus | undefined) => boolean,
  attempts = 40,
  delayMs = 50,
): Promise<QueueItem | undefined> {
  for (let i = 0; i < attempts; i += 1) {
    const item = getItem();
    if (done(item?.status)) return item;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return getItem();
}

export function pruneSelectionToIds(
  selected: ReadonlySet<string>,
  eligibleIds: readonly string[],
): Set<string> {
  const allowed = new Set(eligibleIds);
  const next = new Set<string>();
  for (const id of selected) {
    if (allowed.has(id)) next.add(id);
  }
  return next;
}

export function queueSelectionTitle(selectedCount: number): string {
  if (selectedCount <= 0) return "Select downloads";
  if (selectedCount === 1) return "1 selected";
  return `${selectedCount} selected`;
}

/** Active or waiting — pause keeps the entry and prevents auto-start. */
export function canPauseQueueEntry(entry: Pick<QueueItem, "status">): boolean {
  return entry.status === "active" || entry.status === "queued";
}

/** Still executable or paused — cancel leaves a cancelled Queue entry. */
export function canCancelQueueEntry(entry: Pick<QueueItem, "status">): boolean {
  return (
    entry.status === "queued" ||
    entry.status === "active" ||
    entry.status === "paused"
  );
}

/**
 * Safe to remove from Queue without deleting completed Local recordings.
 * Active/queued are cancelled first by the bulk remove path, then removed.
 */
export function canRemoveQueueEntry(entry: Pick<QueueItem, "status">): boolean {
  switch (entry.status) {
    case "queued":
    case "paused":
    case "cancelled":
    case "failed":
    case "completed":
    case "active":
      return true;
    default:
      return false;
  }
}

export interface QueueSelectionBreakdown {
  readonly pauseEligible: readonly QueueItem[];
  readonly cancelEligible: readonly QueueItem[];
  readonly removeEligible: readonly QueueItem[];
  readonly pauseEligibleCount: number;
  readonly cancelEligibleCount: number;
  readonly removeEligibleCount: number;
}

export function classifyQueueSelection(
  selectedItems: readonly QueueItem[],
): QueueSelectionBreakdown {
  const pauseEligible: QueueItem[] = [];
  const cancelEligible: QueueItem[] = [];
  const removeEligible: QueueItem[] = [];

  for (const item of selectedItems) {
    if (canPauseQueueEntry(item)) pauseEligible.push(item);
    if (canCancelQueueEntry(item)) cancelEligible.push(item);
    if (canRemoveQueueEntry(item)) removeEligible.push(item);
  }

  return {
    pauseEligible,
    cancelEligible,
    removeEligible,
    pauseEligibleCount: pauseEligible.length,
    cancelEligibleCount: cancelEligible.length,
    removeEligibleCount: removeEligible.length,
  };
}

/** Re-read live statuses immediately before a bulk action. */
export function revalidateQueueSelection(
  selectedIds: ReadonlySet<string>,
  liveItems: readonly QueueItem[],
  predicate: (entry: QueueItem) => boolean,
): QueueItem[] {
  const out: QueueItem[] = [];
  for (const item of liveItems) {
    if (selectedIds.has(item.id) && predicate(item)) out.push(item);
  }
  return out;
}

export function queuePauseActionLabel(count: number, compact = false): string {
  void compact;
  return count <= 1 ? "Pause · 1" : `Pause · ${count}`;
}

export function queueCancelActionLabel(count: number, compact = false): string {
  if (compact || count > 1) {
    return count <= 1 ? "Cancel · 1" : `Cancel · ${count}`;
  }
  return "Cancel download · 1";
}

export function queueRemoveActionLabel(count: number, compact = false): string {
  void compact;
  return count <= 1 ? "Remove · 1" : `Remove · ${count}`;
}

export function queueCancelConfirmTitle(count: number): string {
  return count === 1 ? "Cancel download?" : "Cancel downloads?";
}

export function queueCancelConfirmMessage(count: number): string {
  if (count === 1) {
    return "Cancel 1 selected download? The Queue entry will remain available.";
  }
  return `Cancel ${count} selected downloads? The Queue entries will remain available.`;
}

export function queueRemoveConfirmTitle(): string {
  return "Remove from Queue?";
}

export function queueRemoveConfirmMessage(count: number): string {
  if (count === 1) {
    return "Remove 1 selected entry from Queue? Downloaded Local files will not be deleted.";
  }
  return `Remove ${count} selected entries from Queue? Downloaded Local files will not be deleted.`;
}

export function queueRowSelectionA11y(
  fileName: string,
  status: QueueItemStatus,
  selected: boolean,
): string {
  return `${fileName}, ${status}, ${selected ? "selected" : "not selected"}`;
}

/**
 * Remove one Queue entry without deleting completed Local files.
 * Active/queued are cancelled first so temporary partials are cleaned by cancel.
 */
export async function removeQueueEntrySafely(options: {
  readonly id: string;
  readonly getLive: () => QueueItem | undefined;
  readonly cancelDownload: (id: string) => Promise<void>;
  readonly removeFromQueue: (id: string) => Promise<void>;
}): Promise<void> {
  const live = options.getLive();
  if (!live) return;

  if (live.status === "active" || live.status === "queued") {
    await options.cancelDownload(live.id);
    await waitForQueueStatus(
      options.getLive,
      (status) =>
        status === undefined ||
        status === "cancelled" ||
        status === "failed" ||
        status === "paused",
    );
  }

  const after = options.getLive();
  if (!after) return;
  if (after.status === "queued" || after.status === "active") return;
  await options.removeFromQueue(after.id);
}
