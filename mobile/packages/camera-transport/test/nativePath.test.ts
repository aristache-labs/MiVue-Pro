import assert from "node:assert/strict";
import test from "node:test";

import { nativeDownloadTimeoutMs, nativePathFromFileUri } from "../src/nativeTcpTransport";

test("nativePathFromFileUri strips the file scheme for native writers", () => {
  assert.equal(
    nativePathFromFileUri("file:///var/mobile/Containers/Data/Application/ABC/Documents/downloads/FILE.MP4"),
    "/var/mobile/Containers/Data/Application/ABC/Documents/downloads/FILE.MP4",
  );
  assert.equal(nativePathFromFileUri("/downloads/FILE.MP4"), "/downloads/FILE.MP4");
});

test("nativeDownloadTimeoutMs scales with clip size and stays bounded", () => {
  assert.equal(nativeDownloadTimeoutMs(undefined), 600_000);
  assert.equal(nativeDownloadTimeoutMs(1024), 180_000);
  const fiftyMb = 50 * 1024 * 1024;
  const timeout = nativeDownloadTimeoutMs(fiftyMb);
  assert.ok(timeout > 180_000);
  assert.ok(timeout <= 600_000);
});
