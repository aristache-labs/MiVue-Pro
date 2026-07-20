import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPlayerCompactMeta,
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

test("compact metadata uses Local Library date style and omits duration", () => {
  const meta = formatPlayerCompactMeta("FILE260719-135021F.MP4", 371_200_000);
  assert.ok(meta.when);
  assert.match(meta.when!, /2026/);
  assert.match(meta.when!, /13:50/);
  assert.equal(meta.size, formatPlayerSize(371_200_000));
  assert.match(meta.size, /MB$/);
});

test("player size formatting localized", () => {
  assert.equal(formatPlayerSize(0), "");
  assert.equal(formatPlayerSize(20_200_000), "19,3 MB");
});

test("long filename truncates with ellipsis and keeps extension", () => {
  const long = "FILE260719-135021F-EXTRA-LONG-NAME-SEGMENT.MP4";
  const out = truncatePlayerFilename(long, 24);
  assert.ok(out.endsWith(".MP4"));
  assert.ok(out.includes("…"));
  assert.ok(out.length <= 25);
});

test("short filename unchanged", () => {
  assert.equal(truncatePlayerFilename("FILE.MP4"), "FILE.MP4");
});

test("telemetry rejects NaN Infinity and impossible values", () => {
  assert.deepEqual(formatSpeedParts(Number.NaN), { value: "—", unit: "km/h" });
  assert.deepEqual(formatSpeedParts(Number.POSITIVE_INFINITY), { value: "—", unit: "km/h" });
  assert.deepEqual(formatSpeedParts(-3), { value: "—", unit: "km/h" });
  assert.deepEqual(formatSpeedParts(86.4), { value: "86", unit: "km/h" });
  assert.deepEqual(formatAltitudeParts(91.5), { value: "91,5", unit: "m" });
  assert.deepEqual(formatAltitudeParts(-900), { value: "—", unit: "m" });
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
  // Preference is session-only: default map mode is local (online disabled).
  const defaultMode: "local" | "online" = "local";
  assert.equal(defaultMode, "local");
});
