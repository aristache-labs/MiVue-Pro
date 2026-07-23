import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("TabScreenHeader + LibraryCategoryTabs contracts", () => {
  const library = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const queue = readFileSync(join(__dirname, "../../app/(tabs)/two.tsx"), "utf8");
  const settings = readFileSync(join(__dirname, "../../app/(tabs)/settings.tsx"), "utf8");
  const header = readFileSync(join(__dirname, "TabScreenHeader.tsx"), "utf8");
  const cats = readFileSync(join(__dirname, "../library/LibraryCategoryTabs.tsx"), "utf8");

  it("all four tab screens use TabScreenHeader", () => {
    assert.match(library, /TabScreenHeader/);
    assert.match(local, /TabScreenHeader/);
    assert.match(queue, /TabScreenHeader/);
    assert.match(settings, /TabScreenHeader/);
    assert.match(header, /fontSize:\s*22/);
    assert.match(header, /lineHeight:\s*28/);
    assert.match(header, /TAB_SCREEN_HEADER_ROW_HEIGHT = 56/);
    assert.match(header, /TAB_SCREEN_HEADER_SIDE_WIDTH = 140/);
  });

  it("does not keep duplicate tab-header title typography in screen files", () => {
    for (const src of [library, local, queue, settings]) {
      assert.doesNotMatch(src, /navTitle:\s*\{\s*fontSize:\s*17/);
      assert.doesNotMatch(src, /navSubtitle:/);
    }
  });

  it("removes header subtitles from Library, Local and Queue", () => {
    assert.doesNotMatch(library, /recordings on camera/);
    assert.doesNotMatch(library, /librarySubtitle/);
    assert.doesNotMatch(local, /Saved on this device/);
    assert.doesNotMatch(queue, /Queue is empty/);
    assert.doesNotMatch(queue, /formatQueueSummary/);
    assert.match(queue, /No downloads in queue/);
  });

  it("Library and Local share LibraryCategoryTabs with identical order", () => {
    assert.match(library, /LibraryCategoryTabs/);
    assert.match(local, /LibraryCategoryTabs/);
    assert.match(cats, /id: "all"/);
    assert.match(cats, /id: "normal"/);
    assert.match(cats, /id: "parking"/);
    assert.match(cats, /id: "event"/);
    assert.match(cats, /id: "photo"/);
    assert.match(cats, /LIBRARY_CATEGORY_HEIGHT = 48/);
    assert.match(cats, /LIBRARY_CATEGORY_GAP = 6/);
    assert.match(cats, /LIBRARY_CATEGORY_TOP_GAP = 8/);
    assert.match(cats, /Radius\.sm/);
    assert.match(cats, /colors\.brandSoft/);
    assert.doesNotMatch(library, /catCell:/);
    assert.doesNotMatch(local, /catCell:/);
  });

  it("preserves FlatList sticky overlay and pull-to-refresh", () => {
    assert.match(library, /stickySectionKeyFromViewableItems/);
    assert.match(library, /styles\.stickyOverlay/);
    assert.match(library, /RefreshControl/);
    assert.match(local, /stickySectionKeyFromLocalViewableItems/);
    assert.match(local, /styles\.stickyOverlay/);
    assert.match(local, /RefreshControl/);
    assert.match(local, /setSelecting\(true\)/);
  });
});
