import assert from "node:assert/strict";
import test from "node:test";

import {
  cameraThumbCacheFileName,
  cameraThumbRequestPath,
  isJpegMagic,
} from "../cameraThumb";

test("video thumb path uses /thumb under SD", () => {
  assert.equal(
    cameraThumbRequestPath("/SD/Normal/F/FILE.MP4"),
    "/thumb/Normal/F/FILE.MP4",
  );
});

test("photo thumb path reuses the JPG on SD", () => {
  assert.equal(
    cameraThumbRequestPath("/SD/Photo/F/SHOT.JPG"),
    "/SD/Photo/F/SHOT.JPG",
  );
});

test("rejects unsafe remote paths", () => {
  assert.throws(() => cameraThumbRequestPath("/etc/passwd"));
  assert.throws(() => cameraThumbRequestPath("/SD/../secret.MP4"));
});

test("cache file name is flat and stable", () => {
  assert.equal(
    cameraThumbCacheFileName("/SD/Normal/F/FILE.MP4"),
    "thumb_Normal_F_FILE.MP4.jpg",
  );
});

test("jpeg magic detection", () => {
  assert.equal(isJpegMagic(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0)), true);
  assert.equal(isJpegMagic(Uint8Array.of(0x00, 0x01)), false);
});
