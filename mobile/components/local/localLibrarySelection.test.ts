import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  LOCAL_LONG_PRESS_MS,
  LOCAL_SELECTION_DOCK_HEIGHT,
  localSelectedCountLabel,
  localSelectionModeAnnouncement,
  localSortBarLabel,
} from "./localLibrarySelection";

describe("Local Library long-press selection", () => {
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const card = readFileSync(join(__dirname, "LocalLibraryCard.tsx"), "utf8");
  const utility = readFileSync(join(__dirname, "LocalLibraryUtilityBar.tsx"), "utf8");
  const dock = readFileSync(join(__dirname, "LocalSelectionDock.tsx"), "utf8");

  it("does not show Select in normal mode chrome", () => {
    assert.doesNotMatch(local, /accessibilityLabel="Select files"/);
    assert.doesNotMatch(local, />\s*Select\s*</);
    assert.doesNotMatch(utility, /Select/);
    assert.match(local, /left=\{<View style=\{\{ width: LOCAL_ACTION_HIT \}\} \/>\}/);
    assert.match(local, /title="Local library"/);
  });

  it("long press enters selection without opening the player", () => {
    assert.ok(LOCAL_LONG_PRESS_MS >= 450 && LOCAL_LONG_PRESS_MS <= 550);
    assert.match(card, /delayLongPress=\{LOCAL_LONG_PRESS_MS\}/);
    assert.match(card, /onLongPress=\{handleLongPress\}/);
    assert.match(card, /onEnterSelection\(item\.uri\)/);
    assert.match(card, /suppressPressRef/);
    assert.match(local, /enterSelection/);
    assert.match(local, /triggerLocalSelectionHaptic/);
    assert.match(local, /localSelectionModeAnnouncement/);
  });

  it("normal tap opens player; selection tap toggles", () => {
    assert.match(card, /if \(selecting\) \{\s*onToggleSelect\(item\.uri\)/);
    assert.match(card, /openLocalMedia\(item\)/);
    assert.match(card, /Double tap to play\. Long press to select/);
    assert.match(card, /accessibilityActions/);
    assert.match(card, /name: "select"/);
  });

  it("contextual header shows Close, centered count, Select all", () => {
    assert.match(local, /close-outline/);
    assert.match(local, /Close selection/);
    assert.match(local, /localSelectedCountLabel\(selected\.size\)/);
    assert.match(local, /Select all/);
    assert.match(local, /Deselect all/);
    assert.match(local, /checkbox-outline|checkbox/);
    assert.equal(localSelectedCountLabel(1), "1 selected");
    assert.equal(localSelectedCountLabel(3), "3 selected");
    assert.match(localSelectionModeAnnouncement(1), /Selection mode/);
  });

  it("utility bar is Filters + active sort only and disables while selecting", () => {
    assert.match(utility, /Filters/);
    assert.match(utility, /sortLabel/);
    assert.match(utility, /chevron-down/);
    assert.doesNotMatch(utility, /Select/);
    assert.match(local, /LocalLibraryUtilityBar/);
    assert.match(local, /sortLabel=\{localSortBarLabel\(sort\)\}/);
    assert.match(local, /disabled=\{selecting\}/);
    assert.equal(localSortBarLabel("newest"), "Newest");
    assert.doesNotMatch(local, /LibraryListControls/);
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

  it("floating dock appears only with selections and pads the list", () => {
    assert.match(dock, /local-selection-dock/);
    assert.match(dock, /local-dock-share/);
    assert.match(dock, /local-dock-delete/);
    assert.match(dock, /position:\s*"absolute"/);
    assert.match(local, /LocalSelectionDock/);
    assert.match(local, /showSelectionDock/);
    assert.match(local, /dockReserve/);
    assert.ok(LOCAL_SELECTION_DOCK_HEIGHT >= 44);
    assert.doesNotMatch(local, /SelectionActionBand/);
  });

  it("Android back closes selection first", () => {
    assert.match(local, /BackHandler\.addEventListener\("hardwareBackPress"/);
    assert.match(local, /exitSelection\(\);\s*return true/);
  });
});
