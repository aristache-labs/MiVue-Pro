import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  VERTICAL_OVERFLOW_TOLERANCE_PX,
  computeVerticalOverflow,
} from "./useVerticalOverflow";

describe("computeVerticalOverflow", () => {
  it("content 500, viewport 600 → false", () => {
    assert.equal(computeVerticalOverflow(500, 600), false);
  });

  it("content 600, viewport 600 → false", () => {
    assert.equal(computeVerticalOverflow(600, 600), false);
  });

  it("content 601, viewport 600, tolerance 2 → false", () => {
    assert.equal(computeVerticalOverflow(601, 600, 2), false);
  });

  it("content 603, viewport 600, tolerance 2 → true", () => {
    assert.equal(computeVerticalOverflow(603, 600, 2), true);
  });

  it("unknown / zero viewport → false", () => {
    assert.equal(computeVerticalOverflow(900, 0), false);
    assert.equal(computeVerticalOverflow(900, Number.NaN), false);
    assert.equal(computeVerticalOverflow(900, -1), false);
  });

  it("default tolerance matches exported constant", () => {
    assert.equal(VERTICAL_OVERFLOW_TOLERANCE_PX, 2);
    assert.equal(computeVerticalOverflow(602, 600), false);
    assert.equal(computeVerticalOverflow(603, 600), true);
  });
});

describe("overflow scroll wiring", () => {
  const camera = readFileSync(
    join(__dirname, "../components/camera/CameraFilterSheet.tsx"),
    "utf8",
  );
  const local = readFileSync(join(__dirname, "../components/local/LocalFilterSheet.tsx"), "utf8");
  const player = readFileSync(join(__dirname, "../app/player.tsx"), "utf8");

  for (const [label, src] of [
    ["CameraFilterSheet", camera],
    ["LocalFilterSheet", local],
    ["Player", player],
  ] as const) {
    it(`${label} uses hasOverflow and disables bounce/overscroll`, () => {
      assert.match(src, /useVerticalOverflow/);
      assert.match(src, /hasOverflow/);
      assert.match(src, /scrollEnabled=\{/);
      assert.match(src, /alwaysBounceVertical=\{false\}/);
      assert.match(src, /bounces=\{false\}/);
      assert.match(src, /overScrollMode="never"/);
      assert.match(src, /onLayout=\{onViewportLayout\}/);
      assert.match(src, /onContentSizeChange=\{onContentSizeChange\}/);
    });
  }

  it("Player keeps fullscreen scroll off and gates indicator on overflow", () => {
    assert.match(player, /scrollEnabled=\{!fullscreen && hasOverflow\}/);
    assert.match(player, /showsVerticalScrollIndicator=\{!fullscreen && hasOverflow\}/);
  });

  it("Filter sheets gate scroll and indicator on hasOverflow only", () => {
    assert.match(camera, /scrollEnabled=\{hasOverflow\}/);
    assert.match(camera, /showsVerticalScrollIndicator=\{hasOverflow\}/);
    assert.match(local, /scrollEnabled=\{hasOverflow\}/);
    assert.match(local, /showsVerticalScrollIndicator=\{hasOverflow\}/);
  });
});
