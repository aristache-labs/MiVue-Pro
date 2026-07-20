import assert from "node:assert/strict";
import test from "node:test";

import {
  clearVideoThumbCache,
  isVideoThumbInflight,
  loadVideoThumb,
  peekVideoThumbCache,
  rememberVideoThumb,
} from "../videoThumbCache";

test("thumbnail available via cache hit", async () => {
  clearVideoThumbCache();
  rememberVideoThumb("file:///docs/FILE.MP4", "file:///cache/FILE.jpg");
  assert.equal(peekVideoThumbCache("file:///docs/FILE.MP4"), "file:///cache/FILE.jpg");
  assert.equal(peekVideoThumbCache("FILE.MP4"), "file:///cache/FILE.jpg");
});

test("thumbnail unavailable yields undefined (placeholder path)", async () => {
  clearVideoThumbCache();
  assert.equal(peekVideoThumbCache("MISSING.MP4"), undefined);
});

test("thumbnail generator error does not throw", async () => {
  clearVideoThumbCache();
  const result = await loadVideoThumb("file:///docs/BAD.MP4", async () => {
    throw new Error("thumb failed");
  });
  assert.equal(result, undefined);
  assert.equal(peekVideoThumbCache("BAD.MP4"), undefined);
});

test("same thumbnail is not requested while in flight (URI + basename)", async () => {
  clearVideoThumbCache();
  let calls = 0;
  let resolveGen!: (uri: string) => void;
  const gate = new Promise<string>((resolve) => {
    resolveGen = resolve;
  });

  const generate = async () => {
    calls += 1;
    return gate;
  };

  const a = loadVideoThumb("file:///downloads/CLIP.MP4", generate);
  assert.equal(isVideoThumbInflight("CLIP.MP4"), true);
  const b = loadVideoThumb("file:///docs/CLIP.MP4", generate);

  resolveGen("file:///cache/CLIP.jpg");
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(calls, 1);
  assert.equal(ra, "file:///cache/CLIP.jpg");
  assert.equal(rb, "file:///cache/CLIP.jpg");
  assert.equal(peekVideoThumbCache("CLIP.MP4"), "file:///cache/CLIP.jpg");
});

test("cached thumb skips generator entirely", async () => {
  clearVideoThumbCache();
  rememberVideoThumb("file:///docs/DONE.MP4", "file:///cache/DONE.jpg");
  let calls = 0;
  const result = await loadVideoThumb("file:///other/DONE.MP4", async () => {
    calls += 1;
    return "file:///cache/other.jpg";
  });
  assert.equal(calls, 0);
  assert.equal(result, "file:///cache/DONE.jpg");
});
