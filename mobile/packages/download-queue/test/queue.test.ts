import assert from "node:assert/strict";
import test from "node:test";
import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import { MemoryQueueStore } from "../../local-db/src/index";
import { demoFileBytes } from "../../demo/src/index";
import { DownloadQueue, MemoryFileSink, CAMERA_CONNECTION_LOST_MESSAGE } from "../src/index";

class FakeTransport implements Transport {
  calls: TransportRequest[] = [];
  concurrentGets = 0;
  maxConcurrentGets = 0;

  async request(request: TransportRequest): Promise<TransportResponse> {
    this.calls.push(request);
    if (request.method === "GET" && request.path.startsWith("/SD/")) {
      this.concurrentGets += 1;
      this.maxConcurrentGets = Math.max(this.maxConcurrentGets, this.concurrentGets);
      await new Promise((r) => setTimeout(r, 20));
      this.concurrentGets -= 1;
      const size = 100;
      return {
        statusCode: 200,
        headers: { "content-length": String(size) },
        body: demoFileBytes(size),
      };
    }
    if (request.method === "HEAD") {
      return { statusCode: 200, headers: { "content-length": "100" }, body: new Uint8Array() };
    }
    return { statusCode: 404, headers: {}, body: new Uint8Array() };
  }
}

test("queue processes one active transfer and persists", async () => {
  const store = new MemoryQueueStore();
  const sink = new MemoryFileSink();
  const transport = new FakeTransport();
  const queue = new DownloadQueue({
    store,
    transport,
    sink,
    downloadDir: "/downloads",
  });
  await queue.init();

  await queue.enqueue({
    remotePath: "/SD/Normal/F/A.MP4",
    localName: "A.MP4",
    expectedBytes: 100,
  });
  await queue.enqueue({
    remotePath: "/SD/Normal/F/B.MP4",
    localName: "B.MP4",
    expectedBytes: 100,
  });

  await waitUntil(() => queue.list().length === 0);
  await waitUntil(async () => (await sink.exists("/downloads/B.MP4")) === true);

  assert.equal(transport.maxConcurrentGets, 1);
  assert.ok(await sink.exists("/downloads/A.MP4"));
  assert.ok(await sink.exists("/downloads/B.MP4"));
  // Completed transfers leave the queue (Local library owns the files).
  assert.equal(queue.list().length, 0);

  const reloaded = new DownloadQueue({ store, transport, sink, downloadDir: "/downloads" });
  await reloaded.init();
  assert.equal(reloaded.list().length, 0);
});

test("queue rejects duplicate active/queued paths", async () => {
  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new FakeTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();
  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await assert.rejects(
    () => queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A2.MP4", expectedBytes: 100 }),
    /Duplicate/,
  );
});

test("queue rejects path traversal", async () => {
  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new FakeTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();
  await assert.rejects(
    () => queue.enqueue({ remotePath: "/SD/../etc/passwd", localName: "x.MP4", expectedBytes: 1 }),
    /Invalid remote path/,
  );
});

test("queue prefers HEAD size over list expectedBytes", async () => {
  class MismatchTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        return { statusCode: 200, headers: { "content-length": "80" }, body: new Uint8Array() };
      }
      if (request.method === "GET") {
        return {
          statusCode: 200,
          headers: { "content-length": "80" },
          body: demoFileBytes(80),
        };
      }
      return { statusCode: 404, headers: {}, body: new Uint8Array() };
    }
  }

  const sink = new MemoryFileSink();
  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new MismatchTransport(),
    sink,
    downloadDir: "/downloads",
  });
  await queue.init();
  await queue.enqueue({
    remotePath: "/SD/Normal/F/C.MP4",
    localName: "C.MP4",
    expectedBytes: 196608,
  });
  await waitUntil(() => queue.list().length === 0);
  assert.ok(await sink.exists("/downloads/C.MP4"));
});

test("cancel a queued item marks it cancelled without running it", async () => {
  const transport = new FakeTransport();
  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport,
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();

  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  // A starts running immediately (only transfer); queue a second one and cancel it before it starts.
  await queue.enqueue({ remotePath: "/SD/Normal/F/B.MP4", localName: "B.MP4", expectedBytes: 100 });
  const queuedItem = queue.list().find((i) => i.localName === "B.MP4");
  assert.ok(queuedItem);
  assert.equal(queuedItem?.status, "queued");

  await queue.cancel(queuedItem!.id);
  assert.equal(queue.list().find((i) => i.id === queuedItem!.id)?.status, "cancelled");

  // A finishes and is auto-removed from the queue; B stays cancelled.
  await waitUntil(() => queue.list().every((i) => i.localName !== "A.MP4"));
  assert.equal(queue.list().find((i) => i.localName === "B.MP4")?.status, "cancelled");
});

test("cancel the active item aborts the transport and marks cancelled", async () => {
  class AbortAwareTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        return { statusCode: 200, headers: { "content-length": "100" }, body: new Uint8Array() };
      }
      return new Promise((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const abort = () => {
          if (timer !== undefined) clearTimeout(timer);
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (request.signal?.aborted) {
          abort();
          return;
        }
        timer = setTimeout(() => {
          resolve({ statusCode: 200, headers: { "content-length": "100" }, body: demoFileBytes(100) });
        }, 500);
        request.signal?.addEventListener("abort", abort);
      });
    }
  }

  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new AbortAwareTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();

  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await waitUntil(() => queue.list().find((i) => i.localName === "A.MP4")?.status === "active");

  const active = queue.list().find((i) => i.localName === "A.MP4");
  assert.ok(active);
  await queue.cancel(active!.id);

  await waitUntil(() => queue.list().find((i) => i.localName === "A.MP4")?.status !== "active");
  assert.equal(queue.list().find((i) => i.localName === "A.MP4")?.status, "cancelled");
});

test("pause active item then resume requeues it", async () => {
  class AbortAwareTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        return { statusCode: 200, headers: { "content-length": "100" }, body: new Uint8Array() };
      }
      return new Promise((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const abort = () => {
          if (timer !== undefined) clearTimeout(timer);
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (request.signal?.aborted) {
          abort();
          return;
        }
        timer = setTimeout(() => {
          resolve({ statusCode: 200, headers: { "content-length": "100" }, body: demoFileBytes(100) });
        }, 500);
        request.signal?.addEventListener("abort", abort);
      });
    }
  }

  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new AbortAwareTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();

  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await waitUntil(() => queue.list().find((i) => i.localName === "A.MP4")?.status === "active");

  const active = queue.list().find((i) => i.localName === "A.MP4");
  assert.ok(active);
  await queue.pause(active!.id);
  await waitUntil(() => queue.list().find((i) => i.localName === "A.MP4")?.status === "paused");

  await queue.resume(active!.id);
  const after = queue.list().find((i) => i.localName === "A.MP4")?.status;
  assert.ok(after === "queued" || after === "active");
});

test("progress stall aborts active transfer as connection lost", async () => {
  class HungTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      return new Promise((_resolve, reject) => {
        const abort = () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (request.signal?.aborted) {
          abort();
          return;
        }
        request.signal?.addEventListener("abort", abort);
      });
    }
  }

  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new HungTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
    progressStallMs: 80,
  });
  await queue.init();

  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await waitUntil(
    () => queue.list().find((i) => i.localName === "A.MP4")?.status === "failed",
    2_000,
  );
  const failed = queue.list().find((i) => i.localName === "A.MP4");
  assert.equal(failed?.status, "failed");
  assert.equal(failed?.errorMessage, CAMERA_CONNECTION_LOST_MESSAGE);
});

async function waitUntil(
  predicate: (() => boolean) | (() => Promise<boolean>),
  timeoutMs = 2_000,
): Promise<void> {
  const started = Date.now();
  while (!(await predicate())) {
    if (Date.now() - started > timeoutMs) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 10));
  }
}
