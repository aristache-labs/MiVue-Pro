import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("MapPrivacySheet + Player privacy chrome", () => {
  const sheet = readFileSync(join(__dirname, "MapPrivacySheet.tsx"), "utf8");
  const player = readFileSync(join(__dirname, "../../app/player.tsx"), "utf8");
  const osm = readFileSync(join(__dirname, "../gps/onlineMapProvider.ts"), "utf8");

  it("removes the permanent Privacy strip under the map", () => {
    assert.doesNotMatch(player, /privacyStrip/);
    assert.doesNotMatch(player, /Visible tiles only · video and GPS stay on this device/);
  });

  it("exposes a Map privacy information button", () => {
    assert.match(player, /information-circle-outline/);
    assert.match(player, /accessibilityLabel="Map privacy information"/);
    assert.match(player, /mapInfoBtn/);
    assert.match(player, /MapPrivacySheet/);
  });

  it("opens MapPrivacySheet with online vs local copy", () => {
    assert.match(sheet, /title=\{online \? "Map privacy" : "Local map"\}/);
    assert.match(sheet, /Visible map tiles/);
    assert.match(sheet, /Recordings stay local/);
    assert.match(sheet, /Entirely on this device/);
    assert.match(sheet, /Maps & Privacy settings/);
    assert.match(sheet, /StaticBackdropSheet/);
    assert.match(sheet, /enableSwipeToDismiss/);
  });

  it("keeps OpenStreetMap attribution in the map provider", () => {
    assert.match(osm, /OpenStreetMap/);
  });
});
