import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";
import type { RemoteFile } from "@/packages/parsers/src/index";

export type RemoteDownloadUiState =
  | { readonly kind: "available" }
  | { readonly kind: "queued"; readonly position: number; readonly queueId: string }
  | { readonly kind: "downloading"; readonly percent: number; readonly queueId: string }
  | { readonly kind: "paused"; readonly queueId: string }
  | { readonly kind: "downloaded"; readonly localUri?: string }
  | { readonly kind: "failed"; readonly queueId: string };

function progressPercent(item: QueueItem): number {
  if (!item.expectedBytes || item.expectedBytes <= 0) return 0;
  const received = item.bytesReceived ?? 0;
  return Math.max(0, Math.min(99, Math.floor((received / item.expectedBytes) * 100)));
}

/**
 * Resolve download UI for a remote file. Cancelled returns to Available.
 */
export function resolveRemoteDownloadState(options: {
  readonly file: RemoteFile;
  readonly queueItems: readonly QueueItem[];
  readonly localNames: ReadonlySet<string>;
  readonly queuePosition: (id: string) => number | undefined;
}): RemoteDownloadUiState {
  const { file, queueItems, localNames, queuePosition } = options;
  if (localNames.has(file.name)) {
    return { kind: "downloaded" };
  }

  const activeStatuses: readonly QueueItemStatus[] = [
    "queued",
    "active",
    "paused",
    "failed",
  ];
  const item = queueItems.find(
    (q) =>
      (q.remotePath === file.path || q.localName === file.name) &&
      activeStatuses.includes(q.status),
  );
  if (!item) return { kind: "available" };

  if (item.status === "queued") {
    return {
      kind: "queued",
      position: queuePosition(item.id) ?? 0,
      queueId: item.id,
    };
  }
  if (item.status === "active") {
    return { kind: "downloading", percent: progressPercent(item), queueId: item.id };
  }
  if (item.status === "paused") {
    return { kind: "paused", queueId: item.id };
  }
  if (item.status === "failed") {
    return { kind: "failed", queueId: item.id };
  }
  return { kind: "available" };
}

/** Explicit download only — card tap must not call this. */
export function shouldEnqueueOnDownloadPress(state: RemoteDownloadUiState): boolean {
  return state.kind === "available" || state.kind === "failed";
}
