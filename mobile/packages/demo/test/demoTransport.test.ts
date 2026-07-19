import assert from "node:assert/strict";
import test from "node:test";
import { CameraClient } from "../../protocol/src/index";
import { DemoTransport } from "../src/index";

test("DemoTransport serves status and list without camera sockets", async () => {
  const transport = new DemoTransport();
  const client = new CameraClient({ host: "127.0.0.1", httpPort: 80, rtspPort: 554 }, transport);
  const status = await client.getStatus();
  assert.equal(status.code, 0);
  const page = await client.listFiles({ count: 10 });
  assert.ok(page.files.length >= 3);
  assert.ok(page.files.every((f) => f.name.startsWith("DEMO")));
});
