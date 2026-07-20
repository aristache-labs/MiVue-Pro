import assert from "node:assert/strict";
import test from "node:test";
import { parseNmeaTelemetry } from "../../parsers/src/index";
import { CameraClient } from "../../protocol/src/index";
import { DEMO_NMEA_PATH, DemoTransport } from "../src/index";

test("DemoTransport serves status and list without camera sockets", async () => {
  const transport = new DemoTransport();
  const client = new CameraClient({ host: "127.0.0.1", httpPort: 80, rtspPort: 554 }, transport);
  const status = await client.getStatus();
  assert.equal(status.code, 0);
  const page = await client.listFiles({ count: 10 });
  assert.ok(page.files.length >= 3);
  assert.ok(page.files.every((f) => f.name.startsWith("DEMO")));
  const all = await client.listAllFiles({ pageSize: 32, maxFiles: 200 });
  assert.ok(all.files.length >= 12);
  assert.ok(all.files.some((f) => f.category === "parking"));
  assert.ok(all.files.some((f) => f.category === "photo"));
});

test("DemoTransport serves synthetic NMEA sidecar for GPS demo clip", async () => {
  const transport = new DemoTransport();
  const head = await transport.request({ method: "HEAD", path: DEMO_NMEA_PATH });
  assert.equal(head.statusCode, 200);
  const get = await transport.request({ method: "GET", path: DEMO_NMEA_PATH });
  assert.equal(get.statusCode, 200);
  const raw = new TextDecoder().decode(get.body);
  const samples = parseNmeaTelemetry(raw);
  assert.ok(samples.length >= 20);
});

