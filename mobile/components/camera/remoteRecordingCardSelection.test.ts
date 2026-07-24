import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  librarySelectionCardA11y,
  remoteDownloadStatePhrase,
} from "./remoteDownloadA11y";

const card = readFileSync(join(__dirname, "RemoteRecordingCard.tsx"), "utf8");
const action = readFileSync(join(__dirname, "CompactDownloadAction.tsx"), "utf8");
const media = readFileSync(join(__dirname, "../media/MediaCard.tsx"), "utf8");
const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
const selection = readFileSync(join(__dirname, "../library/librarySelection.ts"), "utf8");

describe("Library selection-mode card content consistency", () => {
  it("uses one shared MediaCard layout with conditional overlays", () => {
    assert.match(card, /from "@\/components\/media\/MediaCard"/);
    assert.match(card, /thumbnailOverlay=\{/);
    assert.match(card, /showPlayOverlay/);
    assert.match(card, /selecting \? \(/);
    assert.match(card, /library-play-overlay/);
    assert.match(card, /selectMarkHit/);
    assert.equal((card.match(/<MediaCard/g) ?? []).length, 1);
  });

  it("shows Play only in normal mode for downloaded non-photo recordings", () => {
    assert.match(card, /showPlayOverlay = !selecting && isDownloaded && !isPhoto/);
    assert.match(card, /testID="library-play-overlay"/);
  });

  it("hides Play and shows selection checkbox in selection mode", () => {
    assert.match(card, /selecting \? \([\s\S]*?selectMarkHit[\s\S]*?\) : showPlayOverlay/);
    assert.match(card, /accessibilityRole=\{selecting \? "checkbox" : "button"\}/);
    assert.match(card, /accessibilityState=\{selecting \? \{ selected, checked: selected \}/);
    assert.match(card, /testID=\{selecting \? "library-selection-card"/);
  });

  it("keeps CompactDownloadAction visible with inert status in selection mode", () => {
    assert.match(card, /<CompactDownloadAction/);
    assert.match(card, /inert=\{selecting\}/);
    assert.doesNotMatch(card, /actions=\{!selecting/);
    assert.doesNotMatch(card, /actions=\{\s*selecting\s*\?/);
    assert.match(action, /readonly inert\?:/);
    assert.match(action, /if \(inert\)/);
    assert.match(action, /pointerEvents="none"/);
    assert.match(action, /accessibilityElementsHidden/);
    assert.match(action, /importantForAccessibility="no-hide-descendants"/);
    assert.match(action, /Downloaded/);
    assert.match(action, /cloud-done-outline/);
    assert.match(action, /inert \? \(/);
  });

  it("uses one outer Pressable for tap/long-press like Local (no nested thumb/body presses)", () => {
    assert.match(card, /delayLongPress=\{LOCAL_LONG_PRESS_MS\}/);
    assert.match(card, /suppressPressRef/);
    assert.match(card, /onLongPress=\{handleLongPress\}/);
    assert.match(card, /onLongPressSelect\?\.\(file\.path\)/);
    assert.match(card, /Long press to select/);
    assert.doesNotMatch(card, /onThumbPress/);
    assert.doesNotMatch(card, /onBodyPress/);
    assert.match(media, /accessible=\{Boolean\(onThumbPress\)\}/);
    assert.match(media, /accessible=\{Boolean\(onBodyPress\)\}/);
  });

  it("keeps duration badge and category badge in shared MediaCard for both modes", () => {
    assert.match(media, /durationLabel/);
    assert.match(media, /testID="media-card-duration"/);
    assert.match(media, /categoryLabel/);
    assert.match(media, /styles\.typeBadge/);
    assert.match(card, /durationLabel=\{duration\}/);
    assert.match(card, /categoryLabel=\{CATEGORY_LABEL\[file\.category\]\}/);
    assert.match(media, /minHeight: 104/);
    assert.match(media, /width: MEDIA_THUMB_W/);
    assert.match(media, /height: MEDIA_THUMB_H/);
  });

  it("places selection checkbox top-left so it does not share duration bottom-leading slot", () => {
    assert.match(card, /top:\s*0/);
    assert.match(card, /left:\s*0/);
    assert.match(media, /right:\s*4/);
    assert.match(media, /bottom:\s*4/);
  });

  it("exposes download state in selection a11y labels", () => {
    assert.equal(
      librarySelectionCardA11y("A.MP4", { kind: "downloaded" }, true),
      "A.MP4, downloaded, selected",
    );
    assert.equal(
      librarySelectionCardA11y("B.MP4", { kind: "available" }, false),
      "B.MP4, available to download, not selected",
    );
    assert.equal(
      librarySelectionCardA11y("C.MP4", { kind: "downloading", percent: 12, queueId: "q" }, true),
      "C.MP4, downloading 12 percent, selected",
    );
    assert.equal(remoteDownloadStatePhrase({ kind: "queued", position: 3, queueId: "q" }), "queued at position 3");
  });

  it("does not change FlatList sticky-date, eligibility, or cancel contracts", () => {
    assert.match(index, /stickySectionKeyFromViewableItems/);
    assert.match(index, /classifyLibrarySelection/);
    assert.match(index, /SelectionActionBand/);
    assert.match(index, /initialNumToRender=\{LIBRARY_LIST_VIRTUALIZATION\.initialNumToRender\}/);
    assert.match(selection, /classifyLibrarySelection/);
    assert.match(selection, /isCancellableQueueStatus/);
  });
});
