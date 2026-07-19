import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { Logger } from "../src/utils/logger.js";
import { safeLocalFile, assertRemoteMediaPath, assertRemoteThumbnailPath } from "../src/web/pathSafety.js";
import { createDashboardServer, type DashboardService } from "../src/web/server.js";

const silentLogger: Logger = { debug() {}, info() {}, error() {} };

test("dashboard path guards reject traversal and non-media remote paths", () => {
  assert.throws(() => safeLocalFile("downloads", "../secret.txt"));
  assert.throws(() => safeLocalFile("downloads", "folder/file.mp4"));
  assert.throws(() => assertRemoteMediaPath("/SD/../firmware.bin"));
  assert.throws(() => assertRemoteMediaPath("/SD/Normal/F/file.NMEA"));
  assert.doesNotThrow(() => assertRemoteMediaPath("/SD/Normal/F/file.MP4"));
  assert.doesNotThrow(() => assertRemoteThumbnailPath("/SD/Photo/F/file.JPG"));
  assert.throws(() => assertRemoteThumbnailPath("/SD/Photo/F/firmware.bin"));
});

test("dashboard serves health, validates categories and supports media ranges", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mivue-web-"));
  await writeFile(join(directory, "clip.mp4"), Buffer.from("0123456789"));
  let activePrepares = 0;
  let maximumConcurrentPrepares = 0;
  const service: DashboardService = {
    downloadsDirectory: directory,
    async info() { return { endpoint: { host: "192.72.1.1" } }; },
    async list() { return []; },
    invalidateListCache() {},
    async prepare(_remotePath, onProgress) {
      activePrepares += 1;
      maximumConcurrentPrepares = Math.max(maximumConcurrentPrepares, activePrepares);
      onProgress?.({ stage: "video", percent: 50, message: "test" });
      await new Promise((resolve) => setTimeout(resolve, 25));
      activePrepares -= 1;
      return { originalName: "clip.mp4", playableName: "clip.mp4" };
    },
    async thumbnail() { return Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]); },
    async telemetry() { return []; },
    async localStorageSummary() {
      return { fileCount: 1, totalBytes: 10 };
    },
    async deleteLocalFiles(names) {
      return { deleted: [...names], missing: [] };
    },
    async openDownloadsFolder() {},
    cameraCapabilities() {
      return {
        mutateAllowed: false,
        setProperties: ["Camera.Menu.UIMode"],
        setPropertyValues: { "Camera.Menu.UIMode": ["PLAYBACK"] },
      };
    },
    async setCameraProperty() {
      throw new Error("Mutate dezactivat: setează MIVUE_ALLOW_MUTATE=1");
    },
    async deleteRemoteFiles() {
      throw new Error("Mutate dezactivat: setează MIVUE_ALLOW_MUTATE=1");
    },
  };
  const server = createDashboardServer({ service, logger: silentLogger });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as AddressInfo).port;
  try {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    const invalid = await fetch(`http://127.0.0.1:${port}/api/files?category=firmware`);
    assert.equal(invalid.status, 400);

    const thumbnail = await fetch(`http://127.0.0.1:${port}/api/thumbnail?path=${encodeURIComponent("/SD/Normal/F/clip.mp4")}`);
    assert.equal(thumbnail.status, 200);
    assert.equal(thumbnail.headers.get("content-type"), "image/jpeg");
    assert.deepEqual(new Uint8Array(await thumbnail.arrayBuffer()), Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]));

    const prepareOptions = (remotePath: string) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remotePath }),
    });
    const [firstPrepare, secondPrepare] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/prepare`, prepareOptions("/SD/Normal/F/clip.mp4")),
      fetch(`http://127.0.0.1:${port}/api/prepare`, prepareOptions("/SD/Normal/F/clip2.mp4")),
    ]);
    assert.equal(firstPrepare.status, 202);
    assert.equal(secondPrepare.status, 202);
    const first = await firstPrepare.json() as { jobId: string };
    const second = await secondPrepare.json() as { jobId: string };
    const waitForJob = async (jobId: string) => {
      for (;;) {
        const response = await fetch(`http://127.0.0.1:${port}/api/jobs/${jobId}`);
        const job = await response.json() as { status: string; result?: { mediaUrl?: string } };
        if (job.status === "complete" || job.status === "error") return job;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    };
    const [firstJob, secondJob] = await Promise.all([waitForJob(first.jobId), waitForJob(second.jobId)]);
    assert.equal(firstJob.status, "complete");
    assert.equal(secondJob.status, "complete");
    assert.equal(firstJob.result?.mediaUrl, "/media/clip.mp4");
    assert.equal(maximumConcurrentPrepares, 1);

    const media = await fetch(`http://127.0.0.1:${port}/media/clip.mp4`, { headers: { Range: "bytes=2-5" } });
    assert.equal(media.status, 206);
    assert.equal(media.headers.get("content-range"), "bytes 2-5/10");
    assert.equal(await media.text(), "2345");

    const storage = await fetch(`http://127.0.0.1:${port}/api/storage`);
    assert.equal(storage.status, 200);
    assert.deepEqual(await storage.json(), { fileCount: 1, totalBytes: 10 });

    const deleted = await fetch(`http://127.0.0.1:${port}/api/local`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: ["clip.mp4"] }),
    });
    assert.equal(deleted.status, 200);
    assert.deepEqual(await deleted.json(), { deleted: ["clip.mp4"], missing: [] });

    const opened = await fetch(`http://127.0.0.1:${port}/api/open-downloads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(opened.status, 200);
    assert.deepEqual(await opened.json(), { ok: true });

    const caps = await fetch(`http://127.0.0.1:${port}/api/camera/capabilities`);
    assert.equal(caps.status, 200);
    assert.deepEqual(await caps.json(), {
      mutateAllowed: false,
      setProperties: ["Camera.Menu.UIMode"],
      setPropertyValues: { "Camera.Menu.UIMode": ["PLAYBACK"] },
    });

    const blockedDelete = await fetch(`http://127.0.0.1:${port}/api/camera/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: ["/SD/Normal/F/a.MP4"] }),
    });
    assert.equal(blockedDelete.status, 403);

    const appJs = await fetch(`http://127.0.0.1:${port}/app.js`);
    assert.equal(appJs.status, 200);
    assert.equal(appJs.headers.get("cache-control"), "no-cache");
    assert.ok(appJs.headers.get("etag"));
    const etag = appJs.headers.get("etag");
    const cached = await fetch(`http://127.0.0.1:${port}/app.js`, { headers: { "If-None-Match": etag ?? "" } });
    assert.equal(cached.status, 304);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test("dashboard gzips large /api/files when Accept-Encoding includes gzip", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mivue-web-gzip-"));
  const bigFiles = Array.from({ length: 80 }, (_, index) => ({
    path: `/SD/Normal/F/FILE${String(index).padStart(4, "0")}.MP4`,
    name: `FILE${String(index).padStart(4, "0")}.MP4`,
    category: "normal" as const,
    camera: "front" as const,
    mediaFormat: "MP4" as const,
    sizeBytes: 1_000_000 + index,
    writable: false,
    recordedAt: "2026-07-19 12:00:00",
  }));
  const service: DashboardService = {
    downloadsDirectory: directory,
    async info() { return { endpoint: { host: "192.72.1.1" } }; },
    async list() { return bigFiles; },
    invalidateListCache() {},
    async prepare() { return { originalName: "clip.mp4", playableName: "clip.mp4" }; },
    async thumbnail() { return Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]); },
    async telemetry() { return []; },
    async localStorageSummary() { return { fileCount: 0, totalBytes: 0 }; },
    async deleteLocalFiles() { return { deleted: [], missing: [] }; },
    async openDownloadsFolder() {},
    cameraCapabilities() {
      return { mutateAllowed: false, setProperties: [], setPropertyValues: {} };
    },
    async setCameraProperty() { throw new Error("unused"); },
    async deleteRemoteFiles() { return { results: [] }; },
  };
  const server = createDashboardServer({ service, logger: silentLogger });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/files`, {
      headers: { "Accept-Encoding": "gzip" },
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as { amount: number };
    assert.equal(payload.amount, 80);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
