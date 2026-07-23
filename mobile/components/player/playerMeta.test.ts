import assert from "node:assert/strict";
import test from "node:test";

import { PLAYER_META_LABELS, buildPlayerMetaFields,
  formatPlayerDuration,
  formatPlayerRecordedDate,
  formatPlayerRecordedTime,
  formatPlayerSize,
  truncatePlayerFilename,
} from "./playerMeta";
import {
  altitudeA11yLabel,
  cameraTimeA11yLabel,
  formatAltitudeParts,
  formatSpeedParts,
  speedA11yLabel,
} from "./telemetryFormat";
import {
  MAP_MODE_OPTIONS,
  mapPreferenceToPlayerMode,
  playerModeToMapPreference,
} from "../gps/onlineMapProvider";

test("premium meta labels are exactly DATE TIME SIZE DURATION", () => {
  assert.deepEqual([...PLAYER_META_LABELS], ["DATE", "TIME", "SIZE", "DURATION"]);
  assert.ok(!PLAYER_META_LABELS.includes("RECORDED DATE" as never));
  assert.ok(!PLAYER_META_LABELS.includes("FILE SIZE" as never));
});

test("premium meta fields include date time size duration", () => {
  const fields = buildPlayerMetaFields("FILE260719-135021F.MP4", 371_200_000, 180);
  assert.match(fields.date, /2026/);
  assert.equal(fields.time, "13:50:21");
  assert.match(fields.size, /MB$/);
  assert.equal(fields.duration, "3:00");
});

test("missing size and duration become em dash", () => {
  const fields = buildPlayerMetaFields("NOMETA.MP4", 0, undefined);
  assert.equal(fields.date, "—");
  assert.equal(fields.time, "—");
  assert.equal(fields.size, "—");
  assert.equal(fields.duration, "—");
});

test("player size and duration helpers", () => {
  assert.equal(formatPlayerSize(0), "—");
  assert.equal(formatPlayerDuration(undefined), "—");
  assert.equal(formatPlayerDuration(180), "3:00");
  assert.ok(formatPlayerRecordedDate("FILE260719-135021F.MP4").includes("2026"));
  assert.equal(formatPlayerRecordedTime("FILE260719-135021F.MP4"), "13:50:21");
});

test("long filename truncates with ellipsis and keeps extension", () => {
  const long = "FILE260719-135021F-EXTRA-LONG-NAME-SEGMENT.MP4";
  const out = truncatePlayerFilename(long, 24);
  assert.ok(out.endsWith(".MP4"));
  assert.ok(out.includes("…"));
});

test("telemetry rejects NaN Infinity and impossible values", () => {
  assert.deepEqual(formatSpeedParts(Number.NaN), { value: "—", unit: "km/h" });
  assert.deepEqual(formatSpeedParts(-3), { value: "—", unit: "km/h" });
  assert.deepEqual(formatSpeedParts(86.4), { value: "86", unit: "km/h" });
  assert.deepEqual(formatAltitudeParts(91.5), { value: "91,5", unit: "m" });
});

test("telemetry a11y labels", () => {
  assert.equal(speedA11yLabel(86), "Speed 86 kilometers per hour");
  assert.equal(altitudeA11yLabel(91.5), "Altitude 91.5 meters");
  assert.equal(
    cameraTimeA11yLabel("13:50:23"),
    "Camera time 13 hours 50 minutes 23 seconds",
  );
});

test("map selector has exactly Online map and Local schematic", () => {
  assert.deepEqual([...MAP_MODE_OPTIONS], ["Online map", "Local schematic"]);
  assert.equal(MAP_MODE_OPTIONS.length, 2);
  assert.ok(!MAP_MODE_OPTIONS.includes("Map privacy" as never));
});

test("map preference drives Player map mode (no independent local default)", () => {
  assert.equal(mapPreferenceToPlayerMode("online"), "online");
  assert.equal(mapPreferenceToPlayerMode("schematic"), "local");
  assert.equal(playerModeToMapPreference("local"), "schematic");
});
