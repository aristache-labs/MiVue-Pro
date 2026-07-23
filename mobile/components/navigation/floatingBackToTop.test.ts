import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("FloatingBackToTop wiring", () => {
  const library = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const queue = readFileSync(join(__dirname, "../../app/(tabs)/two.tsx"), "utf8");
  const pill = readFileSync(join(__dirname, "FloatingBackToTop.tsx"), "utf8");

  it("Library, Local and Queue share FloatingBackToTop", () => {
    assert.match(library, /FloatingBackToTop/);
    assert.match(local, /FloatingBackToTop/);
    assert.match(queue, /FloatingBackToTop/);
    assert.match(pill, /accessibilityLabel="Back to top"/);
    assert.match(pill, /accessibilityHint="Scrolls to the beginning of the list"/);
    assert.match(pill, /arrow-up/);
    assert.match(pill, /surfaceElevated/);
    assert.match(pill, /radius\.pill/);
  });

  it("all three attach a FlatList ref and useBackToTop", () => {
    assert.match(library, /ref=\{libraryListRef\}/);
    assert.match(local, /ref=\{localListRef\}/);
    assert.match(queue, /ref=\{queueListRef\}/);
    assert.match(library, /useBackToTop/);
    assert.match(local, /useBackToTop/);
    assert.match(queue, /useBackToTop/);
    assert.match(library, /useBottomTabBarHeight/);
    assert.match(local, /useBottomTabBarHeight/);
    assert.match(queue, /useBottomTabBarHeight/);
    assert.match(pill, /tabBarHeight \+ 12/);
    assert.doesNotMatch(pill, /bottom:\s*80/);
  });

  it("Library and Local keep pull-to-refresh; Queue does not", () => {
    assert.match(library, /RefreshControl/);
    assert.match(library, /onRefresh=\{\(\) => void runRefresh\(\)\}/);
    assert.match(local, /RefreshControl/);
    assert.match(local, /onRefresh=\{\(\) => void runRefresh\(\)\}/);
    assert.doesNotMatch(queue, /RefreshControl/);
  });

  it("modal and selection states gate the control", () => {
    assert.match(library, /!filterOpen/);
    assert.match(library, /!sortOpen/);
    assert.match(library, /!connectionSheetOpen/);
    assert.match(library, /detailFile === null/);
    assert.match(local, /!selecting/);
    assert.match(local, /!deleteConfirmOpen/);
    assert.match(local, /!deleting/);
    assert.match(local, /!filterOpen/);
    assert.match(queue, /!actionBusy/);
  });

  it("Library and Local keep deterministic sticky-date FlatList overlay", () => {
    assert.match(library, /stickySectionKeyFromViewableItems/);
    assert.match(library, /styles\.stickyOverlay/);
    assert.match(library, /buildCameraLibraryFileRows/);
    assert.doesNotMatch(library, /<SectionList/);
    assert.match(local, /stickySectionKeyFromLocalViewableItems/);
    assert.match(local, /styles\.stickyOverlay/);
    assert.match(local, /buildLocalLibraryFileRows/);
    assert.doesNotMatch(local, /SectionList/);
  });
});
