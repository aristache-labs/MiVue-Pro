import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  VERTICAL_OVERFLOW_TOLERANCE_PX,
  computeVerticalOverflow,
  listBounceEnabled,
  listContentBottomPadding,
  listOverScrollMode,
  listScrollEnabled,
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

describe("list scroll helpers", () => {
  it("Library: overflow → scroll on; short + connected → pull refresh keeps scroll; short + disconnected → off", () => {
    assert.equal(listScrollEnabled(true, false), true);
    assert.equal(listScrollEnabled(true, true), true);
    assert.equal(listScrollEnabled(false, true), true);
    assert.equal(listScrollEnabled(false, false), false);
    assert.equal(listBounceEnabled(true), true);
    assert.equal(listBounceEnabled(false), false);
    assert.equal(listOverScrollMode(true), "always");
    assert.equal(listOverScrollMode(false), "never");
  });

  it("Local: short content still enables pull-to-refresh scroll/bounce", () => {
    const canPullToRefresh = true;
    assert.equal(listScrollEnabled(false, canPullToRefresh), true);
    assert.equal(listBounceEnabled(canPullToRefresh), true);
  });

  it("Queue: short → no scroll/bounce; long → scroll", () => {
    assert.equal(listScrollEnabled(false, false), false);
    assert.equal(listScrollEnabled(true, false), true);
    assert.equal(listBounceEnabled(false), false);
    assert.equal(listOverScrollMode(false), "never");
  });

  it("empty-state padding does not use the filled tab-clearance pad", () => {
    const filled = 96;
    const empty = 16;
    assert.equal(listContentBottomPadding(0, filled, empty), empty);
    assert.equal(listContentBottomPadding(3, filled, empty), filled);
  });
});

describe("overflow scroll wiring — filters/player", () => {
  const camera = readFileSync(
    join(__dirname, "../components/camera/CameraFilterSheet.tsx"),
    "utf8",
  );
  const localFilter = readFileSync(
    join(__dirname, "../components/local/LocalFilterSheet.tsx"),
    "utf8",
  );
  const player = readFileSync(join(__dirname, "../app/player.tsx"), "utf8");

  for (const [label, src] of [
    ["CameraFilterSheet", camera],
    ["LocalFilterSheet", localFilter],
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
    assert.match(localFilter, /scrollEnabled=\{hasOverflow\}/);
    assert.match(localFilter, /showsVerticalScrollIndicator=\{hasOverflow\}/);
  });
});

describe("tab list overflow wiring", () => {
  const library = readFileSync(join(__dirname, "../app/(tabs)/index.tsx"), "utf8");
  const local = readFileSync(join(__dirname, "../app/(tabs)/local.tsx"), "utf8");
  const queue = readFileSync(join(__dirname, "../app/(tabs)/two.tsx"), "utf8");

  it("Library: overflow scroll, connected pull-refresh, disconnected no scroll, RefreshControl → runRefresh", () => {
    assert.match(library, /useVerticalOverflow/);
    assert.match(library, /canPullToRefresh = cameraLinkState === "connected"/);
    assert.match(library, /scrollEnabled=\{listScrollEnabled\(hasOverflow, canPullToRefresh\)\}/);
    assert.match(library, /alwaysBounceVertical=\{listBounceEnabled\(canPullToRefresh\)\}/);
    assert.match(library, /bounces=\{listBounceEnabled\(canPullToRefresh\)\}/);
    assert.match(library, /overScrollMode=\{listOverScrollMode\(canPullToRefresh\)\}/);
    assert.match(library, /onLayout=\{handleListLayout\}/);
    assert.match(library, /onViewportLayout\(event\)/);
    assert.match(library, /onContentSizeChange=\{onContentSizeChange\}/);
    assert.match(library, /RefreshControl/);
    assert.match(library, /onRefresh=\{\(\) => void runRefresh\(\)\}/);
    assert.match(library, /listContentBottomPadding/);
    assert.match(library, /flexGrow:\s*1/);
  });

  it("Local: overflow or pull-refresh; RefreshControl → runRefresh", () => {
    assert.match(local, /useVerticalOverflow/);
    assert.match(local, /canPullToRefresh = true/);
    assert.match(local, /scrollEnabled=\{listScrollEnabled\(hasOverflow, canPullToRefresh\)\}/);
    assert.match(local, /alwaysBounceVertical=\{listBounceEnabled\(canPullToRefresh\)\}/);
    assert.match(local, /bounces=\{listBounceEnabled\(canPullToRefresh\)\}/);
    assert.match(local, /onLayout=\{handleListLayout\}/);
    assert.match(local, /onViewportLayout\(event\)/);
    assert.match(local, /RefreshControl/);
    assert.match(local, /onRefresh=\{\(\) => void runRefresh\(\)\}/);
    assert.match(local, /listContentBottomPadding/);
    assert.match(local, /flexGrow:\s*1/);
  });

  it("Queue: overflow-only scroll, no RefreshControl, expands recalculate via onContentSizeChange", () => {
    assert.match(queue, /useVerticalOverflow/);
    assert.match(queue, /scrollEnabled=\{hasOverflow\}/);
    assert.match(queue, /alwaysBounceVertical=\{false\}/);
    assert.match(queue, /bounces=\{false\}/);
    assert.match(queue, /overScrollMode="never"/);
    assert.match(queue, /showsVerticalScrollIndicator=\{hasOverflow\}/);
    assert.match(queue, /onLayout=\{handleListLayout\}/);
    assert.match(queue, /onViewportLayout\(event\)/);
    assert.match(queue, /onContentSizeChange=\{onContentSizeChange\}/);
    assert.doesNotMatch(queue, /RefreshControl/);
    assert.match(queue, /listContentBottomPadding/);
    assert.match(queue, /flexGrow:\s*1/);
    assert.match(queue, /isExpandedCard/);
  });
});
