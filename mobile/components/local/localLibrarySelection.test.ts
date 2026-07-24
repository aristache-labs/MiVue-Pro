import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  LOCAL_LONG_PRESS_MS,
  LOCAL_SECTION_SORT_HIT_SLOP,
  LOCAL_SELECTION_CONTEXT_ANIM_MS,
  localSelectedCountLabel,
  localSelectionModeAnnouncement,
  localSortBarLabel,
  selectAllCheckState,
} from "./localLibrarySelection";
import {
  formatCountLabel,
  formatLocalDateCountLabel,
  localDateSectionA11yLabel,
} from "./localLibrarySections";

describe("Local Library long-press selection", () => {
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const card = readFileSync(join(__dirname, "LocalLibraryCard.tsx"), "utf8");
  const contextBar = readFileSync(join(__dirname, "LocalSelectionContextBar.tsx"), "utf8");
  const dateHeader = readFileSync(join(__dirname, "LocalDateSectionHeader.tsx"), "utf8");
  const tabs = readFileSync(join(__dirname, "../../app/(tabs)/_layout.tsx"), "utf8");
  const tabBar = readFileSync(join(__dirname, "../navigation/LaneoryTabBar.tsx"), "utf8");

  it("does not show Select in normal mode chrome", () => {
    assert.doesNotMatch(local, /accessibilityLabel="Select files"/);
    assert.doesNotMatch(local, />\s*Select\s*</);
    assert.match(local, /title="Local library"/);
  });

  it("Filters icon lives in header; Filters/Newest bar is gone", () => {
    assert.doesNotMatch(local, /LibraryListControls/);
    assert.match(local, /testID="local-header-filters"/);
    assert.match(local, /accessibilityLabel="Filters"/);
    assert.equal(localSortBarLabel("newest"), "Newest");
  });

  it("long press enters selection without haptics or player", () => {
    assert.ok(LOCAL_LONG_PRESS_MS >= 450 && LOCAL_LONG_PRESS_MS <= 550);
    assert.match(card, /delayLongPress=\{LOCAL_LONG_PRESS_MS\}/);
    assert.match(card, /onEnterSelection\(item\.uri\)/);
    assert.match(card, /suppressPressRef/);
    assert.doesNotMatch(local, /triggerLocalSelectionHaptic|Vibration\.vibrate/);
    assert.match(local, /localSelectionModeAnnouncement/);
  });

  it("context bar sits below date separator; Select all left, X right", () => {
    assert.match(local, /LocalSelectionContextBar/);
    assert.match(contextBar, /local-selection-select-all/);
    assert.match(contextBar, /local-selection-close/);
    assert.match(contextBar, /Exit selection mode/);
    assert.match(contextBar, /Select all/);
    assert.match(contextBar, /accessibilityRole="checkbox"/);
    assert.match(contextBar, /checked:\s*[\s\S]*mixed/);
    assert.match(contextBar, /absoluteFillObject/);
    assert.equal(selectAllCheckState(0, 5), "unchecked");
    assert.equal(selectAllCheckState(2, 5), "indeterminate");
    assert.equal(selectAllCheckState(5, 5), "checked");
    assert.ok(LOCAL_SELECTION_CONTEXT_ANIM_MS >= 180 && LOCAL_SELECTION_CONTEXT_ANIM_MS <= 220);

    const stickyIdx = local.indexOf("library-sticky-date-header") >= 0
      ? local.indexOf("local-sticky-date-header")
      : local.indexOf("local-sticky-date-header");
    const contextIdx = local.indexOf("<LocalSelectionContextBar");
    assert.ok(stickyIdx > 0 && contextIdx > stickyIdx);
    assert.doesNotMatch(local, /SelectionActionBand|local-selection-action-band/);
  });

  it("Delete replaces tab bar via SelectionTabChrome; not in list content", () => {
    assert.match(local, /setChrome/);
    assert.match(local, /kind:\s*"local-delete"/);
    assert.match(tabs, /SelectionTabChromeProvider/);
    assert.match(tabs, /LaneoryTabBar/);
    assert.match(tabBar, /selection-tab-delete/);
    assert.match(tabBar, /TAB_BAR_CONTENT_HEIGHT/);
    assert.match(tabBar, /accessibilityElementsHidden=\{tabsHidden\}/);
    assert.match(tabBar, /pointerEvents=\{tabsHidden \? "none"/);
    assert.doesNotMatch(local, /testID="local-selection-action-band"/);
  });

  it("date separator keeps Sort only on sticky header", () => {
    assert.match(local, /LocalDateSectionHeader/);
    assert.match(dateHeader, /paddingTop:\s*18/);
    assert.match(dateHeader, /paddingBottom:\s*14/);
    assert.match(dateHeader, /fontSize:\s*13/);
    assert.ok(LOCAL_SECTION_SORT_HIT_SLOP.top + 18 + LOCAL_SECTION_SORT_HIT_SLOP.bottom >= 44);
    assert.equal(formatCountLabel(1), "1 file");
    assert.equal(
      formatLocalDateCountLabel("THURSDAY, 23 JULY 2026", "15 files"),
      "THURSDAY, 23 JULY 2026 · 15 files",
    );
    assert.match(localDateSectionA11yLabel("THURSDAY, 23 JULY 2026", "15 files"), /15 files/);
  });

  it("Android back closes selection first", () => {
    assert.match(local, /BackHandler\.addEventListener\("hardwareBackPress"/);
    assert.match(local, /exitSelection\(\);\s*return true/);
  });

  it("selection cards hide Share/Delete and show selection marks", () => {
    assert.match(card, /!selecting \? \([\s\S]*share-outline/);
    assert.match(card, /selectMarkHit/);
    assert.match(card, /accessibilityState=\{selecting \? \{ selected, checked: selected \}/);
  });

  it("announces selection labels", () => {
    assert.equal(localSelectedCountLabel(1), "1 selected");
    assert.equal(localSelectedCountLabel(3), "3 selected");
    assert.match(localSelectionModeAnnouncement(1), /Selection mode/);
  });
});
