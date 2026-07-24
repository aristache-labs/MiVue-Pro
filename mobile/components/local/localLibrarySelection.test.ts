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

describe("Local Library long-press selection", () => {
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const card = readFileSync(join(__dirname, "LocalLibraryCard.tsx"), "utf8");
  const controls = readFileSync(
    join(__dirname, "../library/LibraryListControls.tsx"),
    "utf8",
  );
  const contextBar = readFileSync(join(__dirname, "LocalSelectionContextBar.tsx"), "utf8");

  it("does not show Select in normal mode chrome", () => {
    assert.doesNotMatch(local, /accessibilityLabel="Select files"/);
    assert.doesNotMatch(local, />\s*Select\s*</);
    assert.match(local, /left=\{<View style=\{\{ width: LOCAL_ACTION_HIT \}\} \/>\}/);
    assert.match(local, /title="Local library"/);
    assert.doesNotMatch(local, /if \(selecting\) \{[\s\S]*title=\{localSelectedCountLabel/);
  });

  it("Filters/Newest reuses LibraryListControls full-width halves", () => {
    assert.match(local, /LibraryListControls/);
    assert.match(local, /sortLabel=\{localSortBarLabel\(sort\)\}/);
    assert.match(local, /sortActive=\{sort !== "newest"\}/);
    assert.match(local, /testID="local-list-controls"/);
    assert.doesNotMatch(local, /LocalLibraryUtilityBar/);
    assert.match(controls, /styles\.half/);
    assert.match(controls, /flex:\s*1/);
    assert.match(controls, /LIBRARY_LIST_CONTROLS_HEIGHT = 48/);
    assert.match(controls, /sortLabel/);
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

  it("navigation header stays Local library; Refresh disabled while selecting", () => {
    assert.match(local, /title="Local library"/);
    assert.match(local, /disabled=\{refreshing \|\| selecting\}/);
    assert.match(local, /accessibilityState=\{\{ busy: refreshing, disabled: refreshing \|\| selecting \}\}/);
    assert.doesNotMatch(local, /Close selection[\s\S]{0,200}TabScreenHeader|TabScreenHeader[\s\S]{0,200}Select all/);
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

  it("date separator stays unchanged without selection controls", () => {
    assert.match(local, /stickySection\.title/);
    assert.match(local, /stickySection\.countLabel/);
    assert.doesNotMatch(local, /stickyOverlay[\s\S]{0,400}Select all|stickyOverlay[\s\S]{0,400}checkbox/);
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
