import assert from "node:assert/strict";
import test from "node:test";
import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import { MemoryQueueStore } from "../../local-db/src/index";
import { demoFileBytes } from "../../demo/src/index";
import { DownloadQueue, MemoryFileSink, CAMERA_CONNECTION_LOST_MESSAGE, WAITING_FOR_CAMERA_CONNECTION_MESSAGE, isRecoverableConnectionError, isDefinitiveDownloadError } from "../src/index";

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

test("progress stall parks active transfer as waiting_for_connection", async () => {
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
  await queue.enqueue({ remotePath: "/SD/Normal/F/B.MP4", localName: "B.MP4", expectedBytes: 100 });
  await waitUntil(
    () => queue.list().find((i) => i.localName === "A.MP4")?.status === "waiting_for_connection",
    2_000,
  );
  const parked = queue.list().find((i) => i.localName === "A.MP4");
  assert.equal(parked?.status, "waiting_for_connection");
  assert.equal(parked?.errorMessage, WAITING_FOR_CAMERA_CONNECTION_MESSAGE);
  const next = queue.list().find((i) => i.localName === "B.MP4");
  assert.equal(next?.status, "queued");
  assert.equal(
    queue.list().filter((i) => i.status === "active" || i.status === "failed").length,
    0,
  );
});

test("network failure parks item and does not start the next download", async () => {
  let gets = 0;
  class FailThenOkTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        return { statusCode: 200, headers: { "content-length": "100" }, body: new Uint8Array() };
      }
      gets += 1;
      throw new Error("FetchTransport failed: Network request failed");
    }
  }

  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new FailThenOkTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();
  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await queue.enqueue({ remotePath: "/SD/Normal/F/B.MP4", localName: "B.MP4", expectedBytes: 100 });
  await waitUntil(
    () => queue.list().find((i) => i.localName === "A.MP4")?.status === "waiting_for_connection",
  );
  assert.equal(gets, 1);
  assert.equal(queue.list().find((i) => i.localName === "B.MP4")?.status, "queued");
  assert.equal(queue.list().find((i) => i.localName === "A.MP4")?.errorMessage, WAITING_FOR_CAMERA_CONNECTION_MESSAGE);
});

test("reconnect resumes waiting item then continues the queue", async () => {
  let failOnce = true;
  class FlakyTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        return { statusCode: 200, headers: { "content-length": "100" }, body: new Uint8Array() };
      }
      if (failOnce) {
        failOnce = false;
        throw new Error("FetchTransport failed: Network request failed");
      }
      return {
        statusCode: 200,
        headers: { "content-length": "100" },
        body: demoFileBytes(100),
      };
    }
  }

  const sink = new MemoryFileSink();
  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new FlakyTransport(),
    sink,
    downloadDir: "/downloads",
  });
  await queue.init();
  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await queue.enqueue({ remotePath: "/SD/Normal/F/B.MP4", localName: "B.MP4", expectedBytes: 100 });
  await waitUntil(
    () => queue.list().find((i) => i.localName === "A.MP4")?.status === "waiting_for_connection",
  );
  queue.setConnectionAvailable(true);
  await waitUntil(() => queue.list().length === 0, 3_000);
  assert.ok(await sink.exists("/downloads/A.MP4"));
  assert.ok(await sink.exists("/downloads/B.MP4"));
});

test("setConnectionAvailable false does not start duplicate pumps", async () => {
  let concurrent = 0;
  let maxConcurrent = 0;
  class SlowTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        return { statusCode: 200, headers: { "content-length": "100" }, body: new Uint8Array() };
      }
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 40));
      concurrent -= 1;
      return {
        statusCode: 200,
        headers: { "content-length": "100" },
        body: demoFileBytes(100),
      };
    }
  }

  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new SlowTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();
  queue.setConnectionAvailable(false);
  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  assert.equal(queue.list()[0]?.status, "waiting_for_connection");
  queue.setConnectionAvailable(true);
  queue.setConnectionAvailable(true);
  queue.setConnectionAvailable(true);
  await waitUntil(() => queue.list().length === 0);
  assert.equal(maxConcurrent, 1);
});

test("removing a waiting item prevents resume after reconnect", async () => {
  class FailTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        return { statusCode: 200, headers: { "content-length": "100" }, body: new Uint8Array() };
      }
      throw new Error("FetchTransport failed: Network request failed");
    }
  }

  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new FailTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();
  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await waitUntil(
    () => queue.list().find((i) => i.localName === "A.MP4")?.status === "waiting_for_connection",
  );
  const id = queue.list()[0]!.id;
  await queue.remove(id);
  assert.equal(queue.list().length, 0);
  queue.setConnectionAvailable(true);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(queue.list().length, 0);
});

test("definitive 404 stays failed and does not auto-loop", async () => {
  let gets = 0;
  class NotFoundTransport implements Transport {
    async request(request: TransportRequest): Promise<TransportResponse> {
      if (request.method === "HEAD") {
        gets += 1;
        return { statusCode: 404, headers: {}, body: new Uint8Array() };
      }
      gets += 1;
      return { statusCode: 404, headers: {}, body: new Uint8Array() };
    }
  }

  const queue = new DownloadQueue({
    store: new MemoryQueueStore(),
    transport: new NotFoundTransport(),
    sink: new MemoryFileSink(),
    downloadDir: "/downloads",
  });
  await queue.init();
  await queue.enqueue({ remotePath: "/SD/Normal/F/A.MP4", localName: "A.MP4", expectedBytes: 100 });
  await waitUntil(() => queue.list().find((i) => i.localName === "A.MP4")?.status === "failed");
  const before = gets;
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(gets, before);
  assert.match(queue.list()[0]?.errorMessage ?? "", /404/);
});

test("isRecoverableConnectionError classifies FetchTransport network failures", () => {
  assert.equal(isRecoverableConnectionError("FetchTransport failed: Network request failed"), true);
  assert.equal(isRecoverableConnectionError("HEAD HTTP 404"), false);
  assert.equal(isDefinitiveDownloadError("HEAD HTTP 404"), true);
});

test("enqueue reuses failed item instead of duplicating", async () => {
  const store = new MemoryQueueStore();
  const sink = new MemoryFileSink();
  const queue = new DownloadQueue({
    store,
    transport: new FakeTransport(),
    sink,
    downloadDir: "/downloads",
  });
  await queue.init();

  const now = new Date().toISOString();
  await store.save([
    {
      id: "failed-1",
      remotePath: "/SD/Normal/F/FILE260723-090152F.MP4",
      localName: "FILE260723-090152F.MP4",
      expectedBytes: 100,
      status: "failed",
      errorMessage: CAMERA_CONNECTION_LOST_MESSAGE,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await queue.init();
  assert.equal(queue.list().length, 1);

  const again = await queue.enqueue({
    remotePath: "/SD/Normal/F/FILE260723-090152F.MP4",
    localName: "FILE260723-090152F.MP4",
    expectedBytes: 100,
  });
  assert.equal(again.id, "failed-1");
  assert.equal(queue.list().length, 1);
  assert.ok(queue.list()[0]?.status === "queued" || queue.list()[0]?.status === "active");
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
