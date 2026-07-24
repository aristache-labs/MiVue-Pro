import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  LOCAL_LONG_PRESS_MS,
  localSelectedCountLabel,
  localSelectionModeAnnouncement,
  localSortBarLabel,
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

  it("does not show Select in normal mode chrome", () => {
    assert.doesNotMatch(local, /accessibilityLabel="Select files"/);
    assert.doesNotMatch(local, />\s*Select\s*</);
    assert.match(local, /title="Local library"/);
    assert.doesNotMatch(local, /if \(selecting\) \{[\s\S]*title=\{localSelectedCountLabel/);
  });

  it("Filters icon lives in header; Filters/Newest bar is gone", () => {
    assert.doesNotMatch(local, /LibraryListControls/);
    assert.doesNotMatch(local, /local-list-controls/);
    assert.doesNotMatch(local, />\s*Filters\s*</);
    assert.match(local, /testID="local-header-filters"/);
    assert.match(local, /accessibilityLabel="Filters"/);
    assert.match(local, /Opens Local Library filters/);
    assert.match(local, /options-outline/);
    assert.match(local, /styles\.headerIconBtn/);
    assert.match(local, /filterDot|filterBadge/);
    assert.equal(localSortBarLabel("newest"), "Newest");
  });

  it("long press enters selection without haptics or player", () => {
    assert.ok(LOCAL_LONG_PRESS_MS >= 450 && LOCAL_LONG_PRESS_MS <= 550);
    assert.match(card, /delayLongPress=\{LOCAL_LONG_PRESS_MS\}/);
    assert.match(card, /onLongPress=\{handleLongPress\}/);
    assert.match(card, /onEnterSelection\(item\.uri\)/);
    assert.match(card, /suppressPressRef/);
    assert.match(local, /enterSelection/);
    assert.doesNotMatch(local, /triggerLocalSelectionHaptic|Vibration\.vibrate/);
    assert.doesNotMatch(card, /Vibration|Haptics|triggerLocalSelectionHaptic/);
    assert.match(local, /localSelectionModeAnnouncement/);
  });

  it("normal tap opens player; selection tap toggles", () => {
    assert.match(card, /if \(selecting\) \{\s*onToggleSelect\(item\.uri\)/);
    assert.match(card, /openLocalMedia\(item\)/);
    assert.match(card, /Double tap to play\. Long press to select/);
    assert.match(card, /accessibilityActions/);
    assert.match(card, /name: "select"/);
  });

  it("navigation header stays Local library; Filters and Refresh disable while selecting", () => {
    assert.match(local, /title="Local library"/);
    assert.match(local, /disabled=\{refreshing \|\| selecting\}/);
    assert.match(local, /const filtersDisabled = selecting/);
    assert.match(local, /accessibilityState=\{\{ busy: refreshing, disabled: refreshing \|\| selecting \}\}/);
    assert.doesNotMatch(local, /Close selection[\s\S]{0,200}TabScreenHeader|TabScreenHeader[\s\S]{0,200}Select all/);
  });

  it("date separator shows Date · files with Sort only on sticky header", () => {
    assert.match(local, /LocalDateSectionHeader/);
    assert.match(local, /showSort/);
    assert.match(local, /sortDisabled=\{selecting\}/);
    assert.match(local, /setSortOpen\(true\)/);
    assert.match(dateHeader, /swap-vertical-outline/);
    assert.match(dateHeader, />\s*Sort\s*</);
    assert.doesNotMatch(dateHeader, /Newest/);
    assert.match(dateHeader, /accessibilityLabel="Sort files"/);
    assert.match(dateHeader, /Currently sorted by/);
    assert.match(dateHeader, /minWidth: LOCAL_ACTION_HIT/);
    assert.match(dateHeader, /minHeight: LOCAL_ACTION_HIT/);
    assert.equal(formatCountLabel(1), "1 file");
    assert.equal(formatCountLabel(15), "15 files");
    assert.equal(
      formatLocalDateCountLabel("THURSDAY, 23 JULY 2026", "15 files"),
      "THURSDAY, 23 JULY 2026 · 15 files",
    );
    assert.match(localDateSectionA11yLabel("THURSDAY, 23 JULY 2026", "15 files"), /15 files/);

    const stickySort = local.indexOf("showSort");
    const sectionBreak = local.indexOf("renderSectionBreak");
    assert.ok(stickySort > 0);
    assert.match(local, /renderSectionBreak[\s\S]*LocalDateSectionHeader title=\{row\.sectionTitle\}/);
    assert.doesNotMatch(
      local,
      /renderSectionBreak[\s\S]{0,200}showSort/,
    );
    assert.ok(sectionBreak > 0);
  });

  it("contextual bar sits above date separator with centered count", () => {
    assert.match(local, /LocalSelectionContextBar/);
    assert.match(contextBar, /local-selection-close/);
    assert.match(contextBar, /Close selection/);
    assert.match(contextBar, /name="close"/);
    assert.match(contextBar, /absoluteFillObject/);
    assert.match(contextBar, /textAlign:\s*"center"/);
    assert.match(contextBar, /Select all/);
    assert.match(contextBar, /Deselect all/);
    assert.equal(localSelectedCountLabel(1), "1 selected");
    assert.equal(localSelectedCountLabel(3), "3 selected");
    assert.match(localSelectionModeAnnouncement(1), /Selection mode/);

    const contextIdx = local.indexOf("<LocalSelectionContextBar");
    const stickyIdx = local.indexOf("styles.stickyOverlay");
    const deleteIdx = local.indexOf('testID="local-selection-action-band"');
    assert.ok(contextIdx > 0 && stickyIdx > contextIdx && deleteIdx > stickyIdx);
  });

  it("inline Delete under separator; no bulk Share or floating dock", () => {
    assert.match(local, /SelectionActionBand/);
    assert.match(local, /testID="local-selection-action-band"/);
    assert.match(local, /icon:\s*"trash-outline"/);
    assert.match(local, /disabled:\s*selected\.size === 0 \|\| deleting/);
    assert.doesNotMatch(local, /LocalSelectionDock|local-selection-dock|local-dock-share/);
    assert.doesNotMatch(local, /position:\s*"absolute"[\s\S]{0,120}Delete|bottomOffset/);
    assert.doesNotMatch(local, /key:\s*"share"|local-dock-share|onShare=\{\(\) => \{\s*void actionGateRef/);
    assert.match(card, /!selecting \? \([\s\S]*share-outline/);
  });

  it("blocks category and filter changes while selecting without clearing selection", () => {
    assert.match(local, /disabled=\{selecting\}/);
    assert.match(local, /if \(selecting\) return;/);
    assert.match(local, /LibraryCategoryTabs[\s\S]*disabled=\{selecting\}/);
    assert.doesNotMatch(
      local,
      /onSelect=\{\(id\) => \{\s*setCategory\(id\);\s*if \(selecting\) exitSelection/,
    );
  });

  it("selection cards hide Share/Delete and show selection marks", () => {
    assert.match(card, /!selecting \? \([\s\S]*share-outline/);
    assert.match(card, /selectMarkHit/);
    assert.match(card, /accessibilityState=\{selecting \? \{ selected, checked: selected \}/);
    assert.match(card, /selected=\{selecting && selected\}/);
  });

  it("Android back closes selection first", () => {
    assert.match(local, /BackHandler\.addEventListener\("hardwareBackPress"/);
    assert.match(local, /exitSelection\(\);\s*return true/);
  });
});
