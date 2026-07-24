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
import {
  localDeleteCtaLabel,
  libraryDownloadCtaLabel,
  sumKnownSelectedBytes,
  SELECTION_TAB_ANIM_MS,
  SELECTION_TOOLBAR_ANIM_MS,
} from "../selection/selectionLabels";

describe("Local Library long-press selection", () => {
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const card = readFileSync(join(__dirname, "LocalLibraryCard.tsx"), "utf8");
  const toolbar = readFileSync(join(__dirname, "../selection/SelectionToolbar.tsx"), "utf8");
  const dateHeader = readFileSync(join(__dirname, "LocalDateSectionHeader.tsx"), "utf8");
  const tabs = readFileSync(join(__dirname, "../../app/(tabs)/_layout.tsx"), "utf8");
  const tabBar = readFileSync(join(__dirname, "../navigation/LaneoryTabBar.tsx"), "utf8");
  const chromeCtx = readFileSync(
    join(__dirname, "../../context/SelectionTabChromeContext.tsx"),
    "utf8",
  );

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

  it("toolbar under date separator has Select all + X only (no count)", () => {
    assert.match(local, /SelectionToolbar/);
    assert.match(toolbar, /selection-toolbar-select-all/);
    assert.match(toolbar, /selection-toolbar-close/);
    assert.match(toolbar, /Exit selection mode/);
    assert.match(toolbar, /Select all/);
    assert.match(toolbar, /accessibilityRole="checkbox"/);
    assert.match(toolbar, /checked:\s*[\s\S]*mixed/);
    assert.match(toolbar, /surfaceElevated/);
    assert.doesNotMatch(toolbar, /localSelectedCountLabel/);
    assert.doesNotMatch(toolbar, /\{localSelectedCountLabel/);
    assert.doesNotMatch(toolbar, /1 selected|0 selected|\$\{selectedCount\} selected/);
    assert.equal(selectAllCheckState(0, 5), "unchecked");
    assert.equal(selectAllCheckState(2, 5), "indeterminate");
    assert.equal(selectAllCheckState(5, 5), "checked");
    assert.ok(SELECTION_TOOLBAR_ANIM_MS >= 180 && SELECTION_TOOLBAR_ANIM_MS <= 220);
    assert.equal(LOCAL_SELECTION_CONTEXT_ANIM_MS, SELECTION_TOOLBAR_ANIM_MS);

    const stickyIdx = local.indexOf("local-sticky-date-header");
    const toolbarIdx = local.indexOf("<SelectionToolbar");
    assert.ok(stickyIdx > 0 && toolbarIdx > stickyIdx);
    assert.doesNotMatch(local, /SelectionActionBand|local-selection-action-band/);
  });

  it("Delete chrome persists via selectionModeActive; idle tabs never clearChrome", () => {
    assert.match(local, /clearChromeIf\("local-delete"\)/);
    assert.match(local, /kind:\s*"local-delete"/);
    assert.match(local, /if \(!selecting\) return;/);
    assert.doesNotMatch(local, /if \(!selecting\) \{\s*setChrome\(null\)/);
    assert.match(chromeCtx, /clearChromeIf/);
    assert.match(chromeCtx, /selectionModeActive/);
    assert.match(tabBar, /selectionModeActive/);
    assert.match(tabBar, /\[selectionModeActive, progress, reduceMotion\]/);
    assert.doesNotMatch(tabBar, /\[chrome, progress, reduceMotion\]/);
    assert.match(tabs, /SelectionTabChromeProvider/);
    assert.match(tabs, /LaneoryTabBar/);
    assert.match(tabBar, /selection-tab-delete-bar/);
    assert.match(tabBar, /accessibilityElementsHidden=\{tabsHidden\}/);
    assert.match(tabBar, /pointerEvents=\{tabsHidden \? "none"/);
    assert.ok(SELECTION_TAB_ANIM_MS >= 200 && SELECTION_TAB_ANIM_MS <= 250);
    assert.equal(localDeleteCtaLabel(0), "Delete · 0 selected");
    assert.equal(localDeleteCtaLabel(3), "Delete · 3 selected");
    assert.equal(localDeleteCtaLabel(1, true), "Deleting…");
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

  it("announces selection labels; count lives on Delete CTA", () => {
    assert.equal(localSelectedCountLabel(1), "1 selected");
    assert.equal(localSelectedCountLabel(3), "3 selected");
    assert.match(localSelectionModeAnnouncement(1), /Selection mode/);
    assert.equal(libraryDownloadCtaLabel(3, "1.09 GB"), "Download · 3 selected · 1.09 GB");
    assert.equal(sumKnownSelectedBytes([{ sizeBytes: 100 }, { sizeBytes: 0 }]), null);
    assert.equal(sumKnownSelectedBytes([{ sizeBytes: 100 }, { sizeBytes: 50 }]), 150);
  });
});
