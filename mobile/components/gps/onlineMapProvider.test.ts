import assert from "node:assert/strict";
import test from "node:test";

import {
  ALLOWED_GOOGLE_MAP_APIS,
  FORBIDDEN_GOOGLE_MAP_APIS,
  MAP_MODE_OPTIONS,
} from "./onlineMapProvider";

test("map mode options are Online map and Local schematic only", () => {
  assert.deepEqual([...MAP_MODE_OPTIONS], ["Online map", "Local schematic"]);
  assert.equal(MAP_MODE_OPTIONS.length, 2);
  assert.ok(!MAP_MODE_OPTIONS.includes("Map privacy" as never));
});

test("only Maps SDK APIs are allowed — no Places/Routes/Directions", () => {
  assert.ok(ALLOWED_GOOGLE_MAP_APIS.includes("Maps SDK for iOS"));
  assert.ok(ALLOWED_GOOGLE_MAP_APIS.includes("Maps SDK for Android"));
  for (const forbidden of FORBIDDEN_GOOGLE_MAP_APIS) {
    assert.ok(!ALLOWED_GOOGLE_MAP_APIS.includes(forbidden as never));
  }
  assert.ok(FORBIDDEN_GOOGLE_MAP_APIS.some((a) => a.includes("Places")));
  assert.ok(FORBIDDEN_GOOGLE_MAP_APIS.some((a) => a.includes("Routes")));
  assert.ok(FORBIDDEN_GOOGLE_MAP_APIS.some((a) => a.includes("Directions")));
});

test("no API key material in provider config module", () => {
  const src = JSON.stringify({ MAP_MODE_OPTIONS, ALLOWED_GOOGLE_MAP_APIS });
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}/u.test(src));
});
