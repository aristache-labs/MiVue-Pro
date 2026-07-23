import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  LIBRARY_LIST_VIRTUALIZATION,
  LIBRARY_THUMB_VIEWABILITY,
  pathsFromViewableItems,
  samePathSet,
} from "./cameraLibraryViewability";

describe("cameraLibraryViewability", () => {
  it("collects only remote file paths from viewable tokens", () => {
    const paths = pathsFromViewableItems([
      { item: { path: "/SD/A.MP4", name: "A.MP4" } },
      { item: { title: "Sunday, 19 July", key: "2026-07-19" } },
      { item: { path: "/SD/B.MP4" } },
      { item: null },
      { item: "skip" },
    ]);
    assert.deepEqual([...paths].sort(), ["/SD/A.MP4", "/SD/B.MP4"]);
  });

  it("samePathSet compares set membership without order", () => {
    assert.equal(samePathSet(new Set(["a", "b"]), new Set(["b", "a"])), true);
    assert.equal(samePathSet(new Set(["a"]), new Set(["a", "b"])), false);
  });

  it("exports virtualization and viewability constants", () => {
    assert.equal(LIBRARY_LIST_VIRTUALIZATION.initialNumToRender, 12);
    assert.equal(LIBRARY_LIST_VIRTUALIZATION.maxToRenderPerBatch, 20);
    assert.equal(LIBRARY_LIST_VIRTUALIZATION.updateCellsBatchingPeriod, 16);
    assert.equal(LIBRARY_LIST_VIRTUALIZATION.windowSize, 21);
    assert.equal(LIBRARY_THUMB_VIEWABILITY.itemVisiblePercentThreshold, 1);
    assert.equal(LIBRARY_THUMB_VIEWABILITY.minimumViewTime, 50);
  });
});

describe("Library SectionList virtualization wiring", () => {
  const src = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const thumbSrc = readFileSync(join(__dirname, "CameraThumb.tsx"), "utf8");
  const cardSrc = readFileSync(join(__dirname, "RemoteRecordingCard.tsx"), "utf8");
  const mediaCardSrc = readFileSync(join(__dirname, "../media/MediaCard.tsx"), "utf8");

  it("configures explicit batch/window virtualization without disabling it", () => {
    assert.match(src, /initialNumToRender=\{LIBRARY_LIST_VIRTUALIZATION\.initialNumToRender\}/);
    assert.match(src, /maxToRenderPerBatch=\{LIBRARY_LIST_VIRTUALIZATION\.maxToRenderPerBatch\}/);
    assert.match(
      src,
      /updateCellsBatchingPeriod=\{LIBRARY_LIST_VIRTUALIZATION\.updateCellsBatchingPeriod\}/,
    );
    assert.match(src, /windowSize=\{LIBRARY_LIST_VIRTUALIZATION\.windowSize\}/);
    assert.match(src, /removeClippedSubviews=\{false\}/);
    assert.doesNotMatch(src, /disableVirtualization/);
    assert.doesNotMatch(src, /legacyImplementation/);
    assert.doesNotMatch(src, /getItemLayout=/);
  });

  it("gates thumbnails via viewability and keeps placeholder geometry", () => {
    assert.match(src, /viewabilityConfig=\{viewabilityConfig\}/);
    assert.match(src, /onViewableItemsChanged=\{onViewableItemsChanged\}/);
    assert.match(src, /thumbActive=\{activeThumbnailPaths\.has\(item\.path\)\}/);
    assert.match(cardSrc, /active=\{thumbActive\}/);
    assert.match(thumbSrc, /if \(!active\) return;/);
    assert.match(mediaCardSrc, /width: MEDIA_THUMB_W/);
    assert.match(mediaCardSrc, /height: MEDIA_THUMB_H/);
    assert.match(mediaCardSrc, /minHeight: 104/);
  });

  it("applies flexGrow only for empty list content", () => {
    assert.match(src, /\.\.\.\(filtered\.length === 0 \? \{ flexGrow: 1 \} : null\)/);
    assert.doesNotMatch(src, /contentContainerStyle=\{\{[\s\S]*?flexGrow:\s*1,\s*\}\}/);
  });

  it("memoizes list render callbacks and keeps stable sections under queue progress", () => {
    assert.match(src, /const renderItem = useCallback/);
    assert.match(src, /const renderSectionHeader = useCallback/);
    assert.match(src, /const listItemSeparator = useCallback/);
    assert.match(src, /stableQueuedNames/);
    assert.match(src, /sections=\{sections\}/);
    assert.doesNotMatch(src, /sections=\{sections\.map\(/);
  });
});
