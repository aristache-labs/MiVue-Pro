import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  aggregateStorageBreakdown,
  formatStorageStatLine,
  storageBreakdownRows,
  type StorageSizedItem,
} from "./storageBreakdown";

function item(category: StorageSizedItem["category"], sizeBytes: number): StorageSizedItem {
  return { category, sizeBytes };
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
    assert.equal(rows.some((r) => r.key === "total" || r.title === "Total"), false);
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
  });

  it("formats singular and plural file labels", () => {
    assert.match(formatStorageStatLine(1, 1024 * 1024), /^1 file ·/);
    assert.match(formatStorageStatLine(2, 1024 * 1024), /^2 files ·/);
    assert.match(formatStorageStatLine(0, 0), /^0 files ·/);
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

  it("storage screen layout and connection placeholders stay read-only", () => {
    const src = readFileSync(join(__dirname, "../../app/settings/storage.tsx"), "utf8");
    assert.doesNotMatch(src, /Open Local Library/);
    assert.doesNotMatch(src, /\bPOST\b|\bPUT\b|\bDELETE\b/);
    assert.doesNotMatch(src, /createLiveTransport|CameraClient|getStatus|listAllFiles|formatSd|cgi/i);
    assert.match(src, /How to format the SD card/);
    assert.match(src, /Format on the camera/);
    assert.match(src, /SettingsChromeHeader/);
    assert.match(src, /normalizeLocalFiles/);
    assert.match(src, /aggregateStorageBreakdown/);
    assert.match(src, /formatStorageStatLine\(localBreakdown\.total/);
    assert.match(src, /title="Local library"/);
    assert.match(src, /title="Camera SD card"/);
    assert.match(src, /Camera not connected/);
    assert.match(src, /Connecting to camera/);
    assert.match(src, /Not connected/);
    assert.match(src, /Connecting…/);
    assert.match(src, /visibleConnectionStatus/);
    // Total is not a category row title
    assert.doesNotMatch(src, /title=\{?"Total"\}?/);
    assert.doesNotMatch(src, /STAT_ICONS\.total|total: "albums/);
    // Camera SD card section is always present (not gated by connected for the section itself)
    assert.match(src, /summary=\{cameraSummary\}/);
  });
});
