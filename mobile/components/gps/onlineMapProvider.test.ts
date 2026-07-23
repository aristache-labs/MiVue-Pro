import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_ONLINE_MAP_PROVIDER,
  MAP_MODE_OPTIONS,
  OPENSTREETMAP_TILE_SOURCE,
  buildLeafletBootstrapConfig,
  mapPreferenceToPlayerMode,
  playerModeToMapPreference,
} from "./onlineMapProvider";

test("online provider is OSM raster without API keys", () => {
  assert.equal(OPENSTREETMAP_TILE_SOURCE.id, "openstreetmap-raster");
  assert.match(OPENSTREETMAP_TILE_SOURCE.tileUrlTemplate, /tile\.openstreetmap\.org/);
  assert.ok(!OPENSTREETMAP_TILE_SOURCE.tileUrlTemplate.includes("googleapis"));
  assert.ok(!OPENSTREETMAP_TILE_SOURCE.tileUrlTemplate.includes("mapbox"));
  assert.ok(!JSON.stringify(DEFAULT_ONLINE_MAP_PROVIDER).toLowerCase().includes("apikey"));
  assert.ok(!JSON.stringify(DEFAULT_ONLINE_MAP_PROVIDER).toLowerCase().includes("api_key"));
});

test("bootstrap config embeds attribution and Laneory identity", () => {
  const raw = buildLeafletBootstrapConfig();
  const cfg = JSON.parse(raw) as {
    tileUrl: string;
    attribution: string;
    requestedWith: string;
    routeWeight: number;
  };
  assert.match(cfg.tileUrl, /openstreetmap/);
  assert.match(cfg.attribution, /OpenStreetMap/i);
  assert.match(cfg.requestedWith, /Laneory/);
  assert.ok(cfg.routeWeight <= 3);
});

test("map mode options exclude Map privacy", () => {
  assert.deepEqual([...MAP_MODE_OPTIONS], ["Online map", "Local schematic"]);
});

test("mapPreference maps to Player mapMode", () => {
  assert.equal(mapPreferenceToPlayerMode("online"), "online");
  assert.equal(mapPreferenceToPlayerMode("schematic"), "local");
});

test("Player mapMode maps back to mapPreference", () => {
  assert.equal(playerModeToMapPreference("online"), "online");
  assert.equal(playerModeToMapPreference("local"), "schematic");
  assert.equal(
    playerModeToMapPreference(mapPreferenceToPlayerMode("schematic")),
    "schematic",
  );
  assert.equal(playerModeToMapPreference(mapPreferenceToPlayerMode("online")), "online");
});

test("Player uses shared mapPreference instead of hardcoded local default", () => {
  const src = readFileSync(join(__dirname, "../../app/player.tsx"), "utf8");
  assert.doesNotMatch(src, /useState<MapMode>\("local"\)/);
  assert.doesNotMatch(src, /useState\("local"\)/);
  assert.match(src, /mapPreferenceToPlayerMode\(mapPreference\)/);
  assert.match(src, /setMapPreference\(playerModeToMapPreference\("online"\)\)/);
  assert.match(src, /setMapPreference\(playerModeToMapPreference\("local"\)\)/);
  assert.match(src, /mapMode === "online" \? \([\s\S]*OnlineMapWebView/);
  assert.match(src, /: \(\s*<SchematicRoute/);
  // Online branch does not render SchematicRoute; local branch does not render OnlineMapWebView
  const onlineBlock = src.match(
    /mapMode === "online" \? \(([\s\S]*?)\) : \(([\s\S]*?)\)\s*\) : \(/,
  );
  assert.ok(onlineBlock);
  assert.match(onlineBlock![1], /OnlineMapWebView/);
  assert.doesNotMatch(onlineBlock![1], /SchematicRoute/);
  assert.match(onlineBlock![2], /SchematicRoute/);
  assert.doesNotMatch(onlineBlock![2], /OnlineMapWebView/);
});

test("mapPreference hydrates from AsyncStorage in DemoModeContext", () => {
  const src = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");
  assert.match(src, /@laneory\/map_preference_v1/);
  assert.match(src, /AsyncStorage\.getItem\(MAP_PREF_KEY\)/);
  assert.match(src, /mapPref === "online" \|\| mapPref === "schematic"/);
  assert.match(src, /AsyncStorage\.setItem\(MAP_PREF_KEY, value\)/);
});
