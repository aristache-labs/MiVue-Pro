import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  DEMO_CAMERA_SD_RAW,
  cameraSdAccessibilityValue,
  cameraSdAvailableLabel,
  cameraSdPercentLabel,
  cameraSdUsedOfTotalLabel,
  formatSdStorageBytes,
  normalizeCameraSdUsage,
  presentCameraSdStorage,
  resolveCameraSdStorageKind,
} from "./cameraSdStorage";

describe("normalizeCameraSdUsage", () => {
  it("derives used from total and free", () => {
    const usage = normalizeCameraSdUsage({
      totalBytes: 1000,
      freeBytes: 400,
    });
    assert.deepEqual(usage, {
      totalBytes: 1000,
      usedBytes: 600,
      availableBytes: 400,
      usedPercent: 60,
    });
  });

  it("clamps invalid, negative, NaN, Infinity and free>total", () => {
    assert.equal(normalizeCameraSdUsage({ totalBytes: 0 }), null);
    assert.equal(normalizeCameraSdUsage({ totalBytes: -1, freeBytes: 1 }), null);
    assert.equal(normalizeCameraSdUsage({ totalBytes: Number.NaN }), null);
    assert.equal(normalizeCameraSdUsage({ totalBytes: Number.POSITIVE_INFINITY }), null);
    const clamped = normalizeCameraSdUsage({
      totalBytes: 1000,
      freeBytes: 1500,
    });
    assert.equal(clamped?.usedBytes, 0);
    assert.equal(clamped?.availableBytes, 1000);
    assert.equal(clamped?.usedPercent, 0);

    const overUsed = normalizeCameraSdUsage({
      totalBytes: 1000,
      usedBytes: 2000,
    });
    assert.equal(overUsed?.usedBytes, 1000);
    assert.equal(overUsed?.availableBytes, 0);
    assert.equal(overUsed?.usedPercent, 100);
  });

  it("formats bytes compactly including confirmed zero", () => {
    assert.equal(formatSdStorageBytes(0), "0 B");
    assert.equal(formatSdStorageBytes(-1), "—");
    assert.match(formatSdStorageBytes(1024 * 1024 * 1024), /GB/);
    const demo = normalizeCameraSdUsage(DEMO_CAMERA_SD_RAW);
    assert.ok(demo);
    assert.match(cameraSdUsedOfTotalLabel(demo), /used of/);
    assert.match(cameraSdAvailableLabel(demo), /available/);
    assert.match(cameraSdPercentLabel(demo), /%$/);
    assert.match(cameraSdAccessibilityValue(demo), /available/);
  });
});

describe("presentCameraSdStorage states", () => {
  it("maps disconnected / loading / unavailable / no_card distinctly", () => {
    assert.match(
      presentCameraSdStorage({ kind: "disconnected" }).primaryLabel,
      /Connect to the camera/,
    );
    assert.match(presentCameraSdStorage({ kind: "loading" }).primaryLabel, /Reading/);
    assert.match(
      presentCameraSdStorage({ kind: "unavailable" }).primaryLabel,
      /unavailable for this camera/,
    );
    assert.match(presentCameraSdStorage({ kind: "no_card" }).primaryLabel, /No SD card/);
    assert.doesNotMatch(
      presentCameraSdStorage({ kind: "unavailable" }).primaryLabel,
      /No SD card/,
    );
  });

  it("ready view exposes usage and percent without inventing zeros on loading", () => {
    const loading = presentCameraSdStorage({ kind: "loading" });
    assert.equal(loading.usage, null);
    assert.equal(loading.percentLabel, null);

    const ready = presentCameraSdStorage({
      kind: "ready",
      raw: DEMO_CAMERA_SD_RAW,
    });
    assert.ok(ready.usage);
    assert.equal(ready.percentLabel, `${ready.usage.usedPercent}%`);
    assert.match(ready.primaryLabel, /used of/);
  });

  it("refreshing keeps cached usage", () => {
    const view = presentCameraSdStorage({
      kind: "refreshing",
      raw: DEMO_CAMERA_SD_RAW,
    });
    assert.ok(view.usage);
    assert.match(view.accessibilityLabel, /Updating/);
  });
});

describe("resolveCameraSdStorageKind", () => {
  it("demo connected is ready; live connected is unavailable", () => {
    assert.equal(
      resolveCameraSdStorageKind({
        connected: true,
        connecting: false,
        demoMode: true,
        hasCachedUsage: true,
      }),
      "ready",
    );
    assert.equal(
      resolveCameraSdStorageKind({
        connected: true,
        connecting: false,
        demoMode: false,
        hasCachedUsage: false,
      }),
      "unavailable",
    );
    assert.equal(
      resolveCameraSdStorageKind({
        connected: false,
        connecting: true,
        demoMode: false,
        hasCachedUsage: false,
      }),
      "loading",
    );
    assert.equal(
      resolveCameraSdStorageKind({
        connected: false,
        connecting: false,
        demoMode: false,
        hasCachedUsage: false,
      }),
      "disconnected",
    );
  });
});

describe("Downloads & Storage SD card wiring", () => {
  const storage = readFileSync(join(__dirname, "../../app/settings/storage.tsx"), "utf8");
  const card = readFileSync(join(__dirname, "CameraSdStorageCard.tsx"), "utf8");
  const model = readFileSync(join(__dirname, "cameraSdStorage.ts"), "utf8");

  it("renders CameraSdStorageCard and does not request CGI from UI", () => {
    assert.match(storage, /CameraSdStorageCard/);
    assert.match(storage, /presentCameraSdStorage|resolveCameraSdStorageKind/);
    assert.doesNotMatch(storage, /Config\.cgi|getProperty\(|fetch\(/);
    assert.doesNotMatch(card, /Config\.cgi|getProperty\(|useDemoMode/);
    assert.match(card, /accessibilityRole="progressbar"/);
    assert.match(card, /colors\.brand/);
    assert.doesNotMatch(card, /#[0-9a-fA-F]{3,8}/);
    assert.match(model, /camera-confirmed/);
    assert.match(model, /not.*camera-confirmed|Demo Mode/);
  });

  it("Demo Mode uses DEMO_CAMERA_SD_RAW through the shared formatter", () => {
    assert.match(storage, /DEMO_CAMERA_SD_RAW/);
    assert.match(storage, /demoMode/);
  });
});
