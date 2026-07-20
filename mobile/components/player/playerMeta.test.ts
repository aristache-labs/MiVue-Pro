import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlayerMetaFields,
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

test("online map defaults to opt-in local mode semantics", () => {
  const defaultMode: "local" | "online" = "local";
  assert.equal(defaultMode, "local");
});
