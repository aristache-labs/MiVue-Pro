export type QueueItemStatus = "queued" | "active" | "completed" | "failed" | "cancelled";

export interface QueueItem {
  readonly id: string;
  readonly remotePath: string;
  readonly localName: string;
  readonly expectedBytes: number;
  readonly status: QueueItemStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly errorMessage?: string;
  readonly bytesReceived?: number;
}

export interface QueueStore {
  load(): Promise<QueueItem[]>;
  save(items: readonly QueueItem[]): Promise<void>;
}
