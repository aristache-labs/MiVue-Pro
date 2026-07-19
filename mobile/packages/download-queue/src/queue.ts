import { assertLocalFileName, assertRemoteSdPath, type Transport } from "../../camera-transport/src/index";
import type { QueueItem, QueueStore } from "../../local-db/src/index";
import type { FileSink } from "./fileSink";

export interface DownloadQueueOptions {
  readonly store: QueueStore;
  readonly transport: Transport;
  readonly sink: FileSink;
  readonly downloadDir: string;
  readonly onChange?: (items: readonly QueueItem[]) => void;
}

export class DownloadQueue {
  private items: QueueItem[] = [];
  private pumping = false;

  constructor(private readonly options: DownloadQueueOptions) {}

  async init(): Promise<void> {
    this.items = await this.options.store.load();
    for (const item of this.items) {
      if (item.status === "active") {
        this.patch(item.id, { status: "queued", errorMessage: "Interrupted; re-queued" });
      }
    }
    await this.persist();
  }

  list(): readonly QueueItem[] {
    return this.items;
  }

  async enqueue(input: {
    readonly remotePath: string;
    readonly localName: string;
    readonly expectedBytes: number;
  }): Promise<QueueItem> {
    assertRemoteSdPath(input.remotePath);
    assertLocalFileName(input.localName);
    if (!Number.isSafeInteger(input.expectedBytes) || input.expectedBytes < 0) {
      throw new RangeError("expectedBytes invalid");
    }

    const duplicate = this.items.find(
      (item) =>
        item.remotePath === input.remotePath &&
        (item.status === "queued" || item.status === "active"),
    );
    if (duplicate) {
      throw new Error("Duplicate transfer already queued");
    }

    const dest = `${this.options.downloadDir}/${input.localName}`;
    const part = `${dest}.part`;
    if (await this.options.sink.exists(dest)) {
      throw new Error("Local file already exists");
    }
    if (await this.options.sink.exists(part)) {
      throw new Error("Partial file already exists");
    }

    const now = new Date().toISOString();
    const item: QueueItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      remotePath: input.remotePath,
      localName: input.localName,
      expectedBytes: input.expectedBytes,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    this.items = [...this.items, item];
    await this.persist();
    void this.pump();
    return item;
  }

  queuePosition(id: string): number | undefined {
    const queued = this.items.filter((item) => item.status === "queued" || item.status === "active");
    const index = queued.findIndex((item) => item.id === id);
    return index < 0 ? undefined : index + 1;
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (true) {
        const next = this.items.find((item) => item.status === "queued");
        if (next === undefined) break;
        await this.runOne(next);
      }
    } finally {
      this.pumping = false;
    }
  }

  private async runOne(item: QueueItem): Promise<void> {
    this.patch(item.id, { status: "active", bytesReceived: 0 });
    await this.persist();

    const dest = `${this.options.downloadDir}/${item.localName}`;
    const part = `${dest}.part`;

    try {
      const head = await this.options.transport.request({ method: "HEAD", path: item.remotePath });
      if (head.statusCode !== 200) {
        throw new Error(`HEAD HTTP ${head.statusCode}`);
      }
      const headLength = parseContentLength(head.headers);
      if (headLength !== undefined && headLength !== item.expectedBytes) {
        throw new Error(`Content-Length mismatch: expected ${item.expectedBytes}, HEAD ${headLength}`);
      }

      const get = await this.options.transport.request({ method: "GET", path: item.remotePath });
      if (get.statusCode !== 200) {
        throw new Error(`GET HTTP ${get.statusCode}`);
      }
      const getLength = parseContentLength(get.headers);
      if (getLength !== undefined && getLength !== item.expectedBytes) {
        throw new Error(`Content-Length mismatch: HEAD/expected vs GET`);
      }
      if (get.body.byteLength !== item.expectedBytes) {
        throw new Error(`Size invalid: expected ${item.expectedBytes}, got ${get.body.byteLength}`);
      }

      await this.options.sink.writeExclusive(part, get.body);
      this.patch(item.id, { bytesReceived: get.body.byteLength });
      await this.options.sink.rename(part, dest);
      this.patch(item.id, { status: "completed", bytesReceived: get.body.byteLength });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await this.options.sink.remove(part);
      } catch {
        // keep partial for diagnostics if remove fails
      }
      this.patch(item.id, { status: "failed", errorMessage: message });
    }

    await this.persist();
  }

  private patch(id: string, patch: Partial<QueueItem>): void {
    this.items = this.items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    this.options.onChange?.(this.items);
  }

  private async persist(): Promise<void> {
    await this.options.store.save(this.items);
    this.options.onChange?.(this.items);
  }
}

function parseContentLength(headers: Readonly<Record<string, string>>): number | undefined {
  const raw = headers["content-length"];
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  return Number.parseInt(raw, 10);
}
