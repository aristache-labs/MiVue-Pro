import {
  resolveRemoteDownloadState,
  shouldEnqueueOnDownloadPress,
  type RemoteDownloadUiState,
} from "@/components/camera/remoteDownloadState";
import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";
import type { RemoteFile } from "@/packages/parsers/src/index";

/** Queue statuses the download queue can cancel (queued / in-flight / paused). */
export const LIBRARY_CANCELLABLE_QUEUE_STATUSES: readonly QueueItemStatus[] = [
  "queued",
  "active",
  "paused",
] as const;

export function pruneSelectionToPaths(
  selected: ReadonlySet<string>,
  eligiblePaths: readonly string[],
): Set<string> {
  const allowed = new Set(eligiblePaths);
  const next = new Set<string>();
  for (const path of selected) {
    if (allowed.has(path)) next.add(path);
  }
  return next;
}

export function librarySelectionTitle(selectedCount: number): string {
  if (selectedCount <= 0) return "Select recordings";
  if (selectedCount === 1) return "1 selected";
  return `${selectedCount} selected`;
}

export function libraryDownloadActionLabel(count: number, sizeLabel?: string): string {
  const base = count <= 0 ? "Download" : `Download · ${count}`;
  if (sizeLabel && sizeLabel.length > 0 && sizeLabel !== "—") {
    return `${base} · ${sizeLabel}`;
  }
  return base;
}

export function libraryCancelActionLabel(count: number, compact = false): string {
  if (compact) {
    return count <= 1 ? "Cancel · 1" : `Cancel · ${count}`;
  }
  if (count <= 1) return "Cancel download · 1";
  return `Cancel downloads · ${count}`;
}

export function libraryCancelConfirmTitle(count: number): string {
  return count === 1 ? "Cancel download?" : "Cancel downloads?";
}

export function libraryCancelConfirmMessage(count: number): string {
  if (count === 1) {
    return "Cancel 1 selected download currently in Queue?";
  }
  return `Cancel ${count} selected downloads currently in Queue?`;
}

export function isLibraryDownloadEligible(state: RemoteDownloadUiState): boolean {
  return shouldEnqueueOnDownloadPress(state);
}

export function isLibraryCancelEligible(state: RemoteDownloadUiState): boolean {
  return state.kind === "queued" || state.kind === "downloading" || state.kind === "paused";
}

export function queueIdForCancel(state: RemoteDownloadUiState): string | undefined {
  if (state.kind === "queued" || state.kind === "downloading" || state.kind === "paused") {
    return state.queueId;
  }
  return undefined;
}

export interface LibrarySelectionBreakdown {
  readonly downloadEligible: readonly RemoteFile[];
  readonly cancelEligible: readonly { readonly file: RemoteFile; readonly queueId: string }[];
  readonly unavailableCount: number;
  readonly downloadEligibleCount: number;
  readonly cancelEligibleCount: number;
}

/**
 * Classify selected Library files for the bottom action bar.
 * Download = available or failed (retry) via existing enqueue/retry path.
 * Cancel = queued / active / paused Queue entries matched by remote path.
 */
export function classifyLibrarySelection(options: {
  readonly selectedFiles: readonly RemoteFile[];
  readonly queueItems: readonly QueueItem[];
  readonly localNames: ReadonlySet<string>;
  readonly queuePosition: (id: string) => number | undefined;
}): LibrarySelectionBreakdown {
  const downloadEligible: RemoteFile[] = [];
  const cancelEligible: { file: RemoteFile; queueId: string }[] = [];
  let unavailableCount = 0;

  for (const file of options.selectedFiles) {
    const state = resolveRemoteDownloadState({
      file,
      queueItems: options.queueItems,
      localNames: options.localNames,
      queuePosition: options.queuePosition,
    });
    let actionable = false;
    if (isLibraryDownloadEligible(state)) {
      downloadEligible.push(file);
      actionable = true;
    }
    if (isLibraryCancelEligible(state)) {
      const queueId = queueIdForCancel(state);
      if (queueId) {
        cancelEligible.push({ file, queueId });
        actionable = true;
      }
    }
    if (!actionable) unavailableCount += 1;
  }

  return {
    downloadEligible,
    cancelEligible,
    unavailableCount,
    downloadEligibleCount: downloadEligible.length,
    cancelEligibleCount: cancelEligible.length,
  };
}

/** Assert cancellable statuses match the Queue cancel implementation surface. */
export function isCancellableQueueStatus(status: QueueItemStatus): boolean {
  return (LIBRARY_CANCELLABLE_QUEUE_STATUSES as readonly string[]).includes(status);
}
