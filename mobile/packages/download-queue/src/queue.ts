import { assertLocalFileName, assertRemoteSdPath } from "../../camera-transport/src/pathSafety";
import { isStreamingTransport } from "../../camera-transport/src/streaming";
import type { Transport } from "../../camera-transport/src/types";
import type { QueueItem, QueueStore } from "../../local-db/src/index";
import type { FileSink } from "./fileSink";

/** Marked on items when progress stalls (Wi‑Fi drop / unreachable camera). */
export const CAMERA_CONNECTION_LOST_MESSAGE = "Camera connection lost";

const DEFAULT_PROGRESS_STALL_MS = 45_000;

export interface DownloadQueueOptions {
  readonly store: QueueStore;
  readonly transport: Transport;
  readonly sink: FileSink;
  readonly downloadDir: string;
  readonly onChange?: (items: readonly QueueItem[]) => void;
  /** Abort active transfer if no byte progress for this long (default 45s). */
  readonly progressStallMs?: number;
}

export class DownloadQueue {
  private items: QueueItem[] = [];
  private pumping = false;
  private transport: Transport;
  private activeId: string | undefined;
  private activeController: AbortController | undefined;
  /** Distinguishes user cancel vs pause vs progress stall when the active transfer aborts. */
  private abortIntent: "cancel" | "pause" | "stall" = "cancel";
  private readonly progressStallMs: number;

  constructor(private readonly options: DownloadQueueOptions) {
    this.transport = options.transport;
    this.progressStallMs = options.progressStallMs ?? DEFAULT_PROGRESS_STALL_MS;
  }

  setTransport(transport: Transport): void {
    this.transport = transport;
  }

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
        (item.status === "queued" || item.status === "active" || item.status === "paused"),
    );
    if (duplicate) {
      throw new Error("Duplicate transfer already queued");
    }

    // Library Retry must reuse the failed/cancelled row — never spawn a second entry.
    const retriable = this.items.find(
      (item) =>
        (item.remotePath === input.remotePath || item.localName === input.localName) &&
        (item.status === "failed" || item.status === "cancelled"),
    );
    if (retriable) {
      this.patch(retriable.id, {
        status: "queued",
        errorMessage: undefined,
        remotePath: input.remotePath,
        localName: input.localName,
        expectedBytes: input.expectedBytes,
      });
      await this.persist();
      void this.pump();
      return this.items.find((item) => item.id === retriable.id)!;
    }

    const dest = joinPath(this.options.downloadDir, input.localName);
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

  /** Cancel a queued/paused item immediately, or request abort of the active transfer. */
  async cancel(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item === undefined) return;

    if (item.status === "queued" || item.status === "paused") {
      await this.cleanupPartial(item.localName);
      this.patch(id, { status: "cancelled", errorMessage: "Cancelled by user" });
      await this.persist();
      return;
    }

    if (item.status === "active" && id === this.activeId) {
      this.abortIntent = "cancel";
      this.activeController?.abort();
    }
  }

  /** Pause a queued item, or abort the active transfer and mark it paused (keeps partial). */
  async pause(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item === undefined) return;

    if (item.status === "queued") {
      this.patch(id, { status: "paused", errorMessage: undefined });
      await this.persist();
      return;
    }

    if (item.status === "active" && id === this.activeId) {
      this.abortIntent = "pause";
      this.activeController?.abort();
    }
  }

  /** Resume a paused item; continues from the saved partial when available. */
  async resume(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item === undefined || item.status !== "paused") return;
    this.patch(id, { status: "queued", errorMessage: undefined });
    await this.persist();
    void this.pump();
  }

  /** Re-queue a failed/cancelled item in place (same id / session). */
  async retry(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item === undefined) return;
    if (item.status !== "failed" && item.status !== "cancelled") return;
    this.patch(id, { status: "queued", errorMessage: undefined });
    await this.persist();
    void this.pump();
  }

  /** Remove a finished (failed/cancelled/completed/paused) item from the visible queue. */
  async remove(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item === undefined || item.status === "queued" || item.status === "active") return;
    // Drop temporary partials — never delete completed Local destination files.
    if (item.status !== "completed") {
      await this.cleanupPartial(item.localName);
    }
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
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
    const dest = joinPath(this.options.downloadDir, item.localName);
    const part = `${dest}.part`;
    const existingPart = await this.options.sink.sizeOf(part);
    const startBytes =
      existingPart !== undefined && existingPart > 0
        ? existingPart
        : (item.bytesReceived ?? 0);

    this.patch(item.id, { status: "active", bytesReceived: startBytes });
    await this.persist();

    const controller = new AbortController();
    this.activeId = item.id;
    this.activeController = controller;
    this.abortIntent = "cancel";

    let lastProgressBytes = startBytes;
    let lastProgressAt = Date.now();
    const noteProgress = (bytes: number) => {
      if (bytes > lastProgressBytes) {
        lastProgressBytes = bytes;
        lastProgressAt = Date.now();
      }
    };
    const stallWatch = setInterval(() => {
      if (Date.now() - lastProgressAt < this.progressStallMs) return;
      if (this.activeId !== item.id || controller.signal.aborted) return;
      this.abortIntent = "stall";
      controller.abort();
    }, Math.min(2_000, Math.max(250, Math.floor(this.progressStallMs / 4))));

    try {
      const head = await this.transport.request({
        method: "HEAD",
        path: item.remotePath,
        signal: controller.signal,
      });
      if (head.statusCode !== 200) {
        throw new Error(`HEAD HTTP ${head.statusCode}`);
      }
      // HEAD succeeded — count as progress so a slow-but-alive body transfer gets a fresh stall window.
      lastProgressAt = Date.now();
      // Camera file lists often report FAT-rounded sizes; HEAD/GET Content-Length is authoritative.
      const headLength = parseContentLength(head.headers);
      const expectedBytes = headLength ?? item.expectedBytes;
      if (headLength !== undefined && headLength !== item.expectedBytes) {
        this.patch(item.id, { expectedBytes: headLength });
      }

      if (isStreamingTransport(this.transport)) {
        const result = await this.transport.downloadToFile({
          remotePath: item.remotePath,
          destinationPath: dest,
          expectedBytes,
          signal: controller.signal,
          keepPartialOnAbort: true,
          onProgress: (progress) => {
            noteProgress(progress.bytesReceived);
            this.patch(item.id, { bytesReceived: progress.bytesReceived });
          },
        });
        this.patch(item.id, { status: "completed", bytesReceived: result.bytesWritten });
      } else {
        const get = await this.transport.request({
          method: "GET",
          path: item.remotePath,
          signal: controller.signal,
        });
        if (get.statusCode !== 200) {
          throw new Error(`GET HTTP ${get.statusCode}`);
        }
        const getLength = parseContentLength(get.headers);
        if (getLength !== undefined && getLength !== expectedBytes) {
          throw new Error(`Content-Length mismatch: HEAD ${expectedBytes}, GET ${getLength}`);
        }
        if (get.body.byteLength !== expectedBytes) {
          throw new Error(`Size invalid: expected ${expectedBytes}, got ${get.body.byteLength}`);
        }

        await this.options.sink.writeExclusive(part, get.body);
        this.patch(item.id, { bytesReceived: get.body.byteLength });
        await this.options.sink.rename(part, dest);
        this.patch(item.id, { status: "completed", bytesReceived: get.body.byteLength });
      }
    } catch (error) {
      const aborted = controller.signal.aborted || isAbortError(error);
      const intent = this.abortIntent as "cancel" | "pause" | "stall";
      this.abortIntent = "cancel";
      if (aborted && intent === "pause") {
        const kept = (await this.options.sink.sizeOf(part)) ?? item.bytesReceived;
        this.patch(item.id, {
          status: "paused",
          errorMessage: undefined,
          ...(kept !== undefined ? { bytesReceived: kept } : {}),
        });
      } else if (aborted && intent === "stall") {
        await this.cleanupPartial(item.localName);
        this.patch(item.id, {
          status: "failed",
          errorMessage: CAMERA_CONNECTION_LOST_MESSAGE,
        });
      } else {
        await this.cleanupPartial(item.localName);
        if (aborted) {
          this.patch(item.id, { status: "cancelled", errorMessage: "Cancelled by user" });
        } else {
          const message = error instanceof Error ? error.message : String(error);
          this.patch(item.id, { status: "failed", errorMessage: message });
        }
      }
    } finally {
      clearInterval(stallWatch);
      if (this.activeId === item.id) {
        this.activeId = undefined;
        this.activeController = undefined;
      }
    }

    await this.persist();

    // Successful transfers leave the queue — the file lives in Local.
    const final = this.items.find((entry) => entry.id === item.id);
    if (final?.status === "completed") {
      this.items = this.items.filter((entry) => entry.id !== item.id);
      await this.persist();
    }
  }

  private async cleanupPartial(localName: string): Promise<void> {
    const dest = joinPath(this.options.downloadDir, localName);
    const part = `${dest}.part`;
    const resume = `${part}.resume`;
    try {
      await this.options.sink.remove(part);
    } catch {
      // ignore
    }
    try {
      await this.options.sink.remove(resume);
    } catch {
      // ignore
    }
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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || (error as { causeCode?: string }).causeCode === "ABORTED");
}

function parseContentLength(headers: Readonly<Record<string, string>>): number | undefined {
  const raw = headers["content-length"];
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  return Number.parseInt(raw, 10);
}

function joinPath(dir: string, name: string): string {
  if (dir.endsWith("/")) return `${dir}${name}`;
  return `${dir}/${name}`;
}
