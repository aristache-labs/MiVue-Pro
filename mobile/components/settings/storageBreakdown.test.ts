import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  aggregateStorageBreakdown,
  formatCameraListedFilesAccessibility,
  formatStorageStatLine,
  storageBreakdownRows,
  type StorageSizedItem,
} from "./storageBreakdown";

function item(
  category: StorageSizedItem["category"],
  sizeBytes: number,
  id?: string,
): StorageSizedItem {
  return id === undefined ? { category, sizeBytes } : { category, sizeBytes, id };
}

describe("storageBreakdown", () => {
  it("aggregates total and each category", () => {
    const breakdown = aggregateStorageBreakdown([
      item("normal", 100),
      item("normal", 50),
      item("parking", 200),
      item("event", 300),
      item("photo", 40),
      item("unknown", 10),
    ]);
    assert.equal(breakdown.normal.count, 2);
    assert.equal(breakdown.normal.bytes, 150);
    assert.equal(breakdown.parking.count, 1);
    assert.equal(breakdown.event.count, 1);
    assert.equal(breakdown.photo.count, 1);
    assert.equal(breakdown.unknown.count, 1);
    assert.equal(breakdown.total.count, 6);
    assert.equal(breakdown.total.bytes, 700);
    assert.equal(breakdown.allSizesKnown, true);
  });

  it("deduplicates by id / path", () => {
    const breakdown = aggregateStorageBreakdown([
      item("normal", 100, "/SD/Normal/F/A.MP4"),
      item("normal", 100, "/SD/Normal/F/A.MP4"),
      item("parking", 50, "/SD/Parking/F/B.MP4"),
    ]);
    assert.equal(breakdown.total.count, 2);
    assert.equal(breakdown.total.bytes, 150);
    assert.equal(breakdown.normal.count, 1);
  });

  it("treats zero or invalid sizeBytes as zero bytes but still counts the file", () => {
    const breakdown = aggregateStorageBreakdown([
      item("normal", 0),
      item("parking", Number.NaN),
      item("event", -5),
      item("photo", 1024),
    ]);
    assert.equal(breakdown.total.count, 4);
    assert.equal(breakdown.total.bytes, 1024);
    assert.equal(breakdown.normal.bytes, 0);
    assert.equal(breakdown.parking.bytes, 0);
    assert.equal(breakdown.event.bytes, 0);
    assert.equal(breakdown.allSizesKnown, false);
  });

  it("omits byte total from lines when sizes are not fully known", () => {
    const breakdown = aggregateStorageBreakdown([
      item("normal", Number.NaN),
      item("parking", 1024 * 1024),
    ]);
    assert.equal(breakdown.allSizesKnown, false);
    assert.equal(
      formatStorageStatLine(breakdown.total.count, breakdown.total.bytes, {
        allSizesKnown: breakdown.allSizesKnown,
      }),
      "2 files",
    );
    assert.equal(storageBreakdownRows(breakdown)[0]?.line, "1 file");
  });

  it("includes unknown in Total and hides Other when zero", () => {
    const withUnknown = aggregateStorageBreakdown([item("unknown", 10), item("normal", 5)]);
    assert.equal(withUnknown.total.count, 2);
    assert.equal(withUnknown.unknown.count, 1);
    assert.equal(
      storageBreakdownRows(withUnknown).some((r) => r.key === "unknown"),
      true,
    );

    const withoutUnknown = aggregateStorageBreakdown([item("normal", 5)]);
    assert.equal(withoutUnknown.unknown.count, 0);
    assert.equal(
      storageBreakdownRows(withoutUnknown).some((r) => r.key === "unknown"),
      false,
    );
  });

  it("category rows exclude Total; summary uses breakdown.total", () => {
    const breakdown = aggregateStorageBreakdown([
      item("normal", 1024 * 1024),
      item("parking", 2 * 1024 * 1024),
      item("unknown", 512 * 1024),
    ]);
    const rows = storageBreakdownRows(breakdown);
    assert.equal(rows.some((r) => r.title === "Total"), false);
    assert.equal(breakdown.total.count, 3);
    assert.equal(breakdown.total.bytes, 3.5 * 1024 * 1024);
    assert.equal(
      formatStorageStatLine(breakdown.total.count, breakdown.total.bytes),
      "3 files · 3.5 MB",
    );
    assert.deepEqual(
      rows.map((r) => r.key),
      ["normal", "parking", "event", "photo", "unknown"],
    );
    assert.equal(rows[0]?.title, "Normal");
  });

  it("formats singular and plural file labels", () => {
    assert.match(formatStorageStatLine(1, 1024 * 1024), /^1 file ·/);
    assert.match(formatStorageStatLine(2, 1024 * 1024), /^2 files ·/);
    assert.equal(formatStorageStatLine(0, 0), "0 files");
    assert.doesNotMatch(formatStorageStatLine(0, 0), /·/);
  });

  it("formats camera listed-files accessibility without claiming capacity", () => {
    assert.equal(
      formatCameraListedFilesAccessibility(354, 40.37 * 1024 ** 3),
      "354 camera files, 40.37 gigabytes listed",
    );
    assert.equal(
      formatCameraListedFilesAccessibility(1, 1024 * 1024),
      "1 camera file, 1.0 megabytes listed",
    );
    assert.equal(formatCameraListedFilesAccessibility(0, 0), "0 camera files listed");
  });

  it("category sum equals Total", () => {
    const breakdown = aggregateStorageBreakdown([
      item("normal", 11),
      item("parking", 22),
      item("event", 33),
      item("photo", 44),
      item("unknown", 55),
    ]);
    const sumCount =
      breakdown.normal.count +
      breakdown.parking.count +
      breakdown.event.count +
      breakdown.photo.count +
      breakdown.unknown.count;
    const sumBytes =
      breakdown.normal.bytes +
      breakdown.parking.bytes +
      breakdown.event.bytes +
      breakdown.photo.bytes +
      breakdown.unknown.bytes;
    assert.equal(sumCount, breakdown.total.count);
    assert.equal(sumBytes, breakdown.total.bytes);
  });

  it("storage screen matches Local Library layout without capacity Storage block", () => {
    const src = readFileSync(join(__dirname, "../../app/settings/storage.tsx"), "utf8");
    assert.doesNotMatch(src, /Open Local Library/);
    assert.doesNotMatch(src, /\bPOST\b|\bPUT\b|\bDELETE\b/);
    assert.doesNotMatch(src, /createLiveTransport|CameraClient|getStatus|listAllFiles|formatSd|cgi/i);
    assert.doesNotMatch(src, /CameraSdStorageCard|presentCameraSdStorage|resolveCameraSdStorageKind/);
    assert.doesNotMatch(src, /Storage information unavailable for this camera/);
    assert.doesNotMatch(src, /Listed recordings only/);
    assert.doesNotMatch(src, /progressbar|camera-sd-storage-progress|58 GB|DEMO_CAMERA_SD/);
    assert.match(src, /How to format the SD card/);
    assert.match(src, /Format on the camera/);
    assert.match(src, /SettingsChromeHeader/);
    assert.match(src, /normalizeLocalFiles/);
    assert.match(src, /aggregateStorageBreakdown/);
    assert.match(src, /formatStorageStatLine\(localBreakdown\.total/);
    assert.match(src, /formatStorageStatLine\(cameraBreakdown\.total/);
    assert.match(src, /formatCameraListedFilesAccessibility/);
    assert.match(src, /title="Local library"/);
    assert.match(src, /title="Camera SD card"/);
    assert.match(src, /summaryAccessibilityLabel=\{cameraSdSummaryA11y\}/);
    assert.match(src, /Loading…/);
    assert.match(src, /Unavailable/);
    assert.match(src, /isRefreshingCamera/);
    assert.match(src, /visibleConnectionStatus/);
    assert.match(src, /id: file\.path/);
    assert.doesNotMatch(src, /title=\{?"Total"\}?/);
    assert.doesNotMatch(src, /STAT_ICONS\.total|total: "albums/);
    assert.match(src, /Delete local library/);
    assert.match(src, /deleteLocalFilesBatch/);
    assert.match(src, /runDeleteLocalLibraryBatch/);
    // Shared breakdown rows for both sections
    assert.match(src, /storageBreakdownRows\(localBreakdown\)/);
    assert.match(src, /storageBreakdownRows\(cameraBreakdown\)/);
  });
});
