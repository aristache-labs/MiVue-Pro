import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ONLINE_MAP_PROVIDER,
  MAP_MODE_OPTIONS,
  OPENSTREETMAP_TILE_SOURCE,
  buildLeafletBootstrapConfig,
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
