import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile, rm, mkdtemp, access } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DownloadError, downloadToFile } from "../src/transport/downloadTransport.js";

test("downloadToFile streams, validates and atomically renames the file", async (context) => {
  const payload = Buffer.from("00000018667479706D703432MiVue-test-payload");
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      const head = Buffer.from(
        `HTTP/1.0 200 OK\r\nCONTENT-LENGTH: ${payload.byteLength}\r\nCONTENT-TYPE: video/mpeg\r\n\r\n`,
        "latin1",
      );
      socket.end(Buffer.concat([head, payload]));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const directory = await mkdtemp(join(tmpdir(), "mivue-download-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, "clip.MP4");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");

  const updates: number[] = [];
  const result = await downloadToFile({
    host: "127.0.0.1",
    port: address.port,
    remotePath: "/SD/Normal/F/clip.MP4",
    destinationPath: destination,
    expectedBytes: payload.byteLength,
    onProgress: (progress) => updates.push(progress.bytesReceived),
  });

  assert.equal(result.bytesWritten, payload.byteLength);
  assert.deepEqual(await readFile(destination), payload);
  assert.ok(updates.at(-1) === payload.byteLength);
  await assert.rejects(access(`${destination}.part`));
});

test("downloadToFile keeps .part when declared sizes disagree", async (context) => {
  const payload = Buffer.from("test");
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      socket.end(`HTTP/1.0 200 OK\r\nCONTENT-LENGTH: ${payload.byteLength}\r\n\r\n${payload.toString()}`);
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const directory = await mkdtemp(join(tmpdir(), "mivue-download-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, "clip.MP4");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");

  await assert.rejects(
    downloadToFile({
      host: "127.0.0.1",
      port: address.port,
      remotePath: "/SD/Normal/F/clip.MP4",
      destinationPath: destination,
      expectedBytes: payload.byteLength + 1,
    }),
    DownloadError,
  );
  await access(`${destination}.part`);
  await assert.rejects(access(destination));
});
