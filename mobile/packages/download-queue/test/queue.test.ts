import assert from "node:assert/strict";
import test from "node:test";
import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import { MemoryQueueStore } from "../../local-db/src/index";
import { demoFileBytes } from "../../demo/src/index";
import { DownloadQueue, MemoryFileSink } from "../src/index";

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

  await waitUntil(() => queue.list().every((i) => i.status === "completed" || i.status === "failed"));

  assert.equal(transport.maxConcurrentGets, 1);
  assert.equal(queue.list().filter((i) => i.status === "completed").length, 2);
  assert.ok(await sink.exists("/downloads/A.MP4"));
  assert.ok(await sink.exists("/downloads/B.MP4"));

  const reloaded = new DownloadQueue({ store, transport, sink, downloadDir: "/downloads" });
  await reloaded.init();
  assert.equal(reloaded.list().length, 2);
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
  await waitUntil(() => queue.list().every((i) => i.status === "completed" || i.status === "failed"));
  assert.equal(queue.list()[0]?.status, "completed");
  assert.equal(queue.list()[0]?.expectedBytes, 80);
  assert.ok(await sink.exists("/downloads/C.MP4"));
});

async function waitUntil(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 10));
  }
}
