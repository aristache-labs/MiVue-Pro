import type { QueueItem, QueueStore } from "./types";

export class MemoryQueueStore implements QueueStore {
  private items: QueueItem[] = [];

  async load(): Promise<QueueItem[]> {
    return [...this.items];
  }

  async save(items: readonly QueueItem[]): Promise<void> {
    this.items = items.map((item) => ({ ...item }));
  }
}
