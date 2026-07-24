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

  if (
    live.status === "active" ||
    live.status === "queued" ||
    live.status === "waiting_for_connection"
  ) {
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
  if (
    after.status === "queued" ||
    after.status === "active" ||
    after.status === "waiting_for_connection"
  ) {
    return;
  }
  await options.removeFromQueue(after.id);
}
