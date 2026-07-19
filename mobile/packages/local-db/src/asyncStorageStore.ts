import type { QueueItem, QueueStore } from "./types";

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const STORAGE_KEY = "@laneory/download_queue_v1";

export class AsyncStorageQueueStore implements QueueStore {
  constructor(private readonly storage: AsyncStorageLike) {}

  async load(): Promise<QueueItem[]> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw === null || raw === "") return [];
    try {
      const parsed = JSON.parse(raw) as QueueItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async save(items: readonly QueueItem[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
