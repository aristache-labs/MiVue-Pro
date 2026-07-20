import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecordingSearchIndex,
  clearRecordingSearchIndexCache,
  formatDateRange,
  formatDateSeparator,
  formatRecordingDate,
  formatRecordingDateTime,
  formatRecordingTime,
  formatTimeRange,
  getRecordingSearchIndexMap,
  matchesRecordingSearch,
  parseRecordingInstant,
  RECORDING_UI_LOCALE,
} from "./recordingDateTime";

const SAMPLE = {
  name: "PARK260719-140520F.MP4",
  recordedAt: "2026-07-19 14:05:20",
  category: "parking",
};

test("locale is en-GB", () => {
  assert.equal(RECORDING_UI_LOCALE, "en-GB");
});

test("card date format is English abbreviated month 24h", () => {
  assert.equal(formatRecordingDateTime(SAMPLE.recordedAt), "19 Jul 2026 · 14:05");
  assert.equal(formatRecordingDate(SAMPLE.recordedAt), "19 Jul 2026");
  assert.equal(formatRecordingTime(SAMPLE.recordedAt), "14:05");
  assert.equal(formatRecordingDateTime(SAMPLE.recordedAt).includes("AM"), false);
  assert.equal(formatRecordingDateTime(SAMPLE.recordedAt).includes("PM"), false);
  assert.equal(formatRecordingDateTime(SAMPLE.recordedAt).toLowerCase().includes("iul"), false);
});

test("date separator is full English uppercase", () => {
  assert.equal(formatDateSeparator("2026-07-19"), "SUNDAY, 19 JULY 2026");
});

test("months do not depend on device locale strings", () => {
  // Pure English tables — never toLocaleDateString without locale.
  assert.match(formatRecordingDate("2026-01-05 10:00:00"), /Jan/);
  assert.match(formatRecordingDate("2026-12-05 10:00:00"), /Dec/);
  assert.equal(formatRecordingDate("2026-07-19 10:00:00").includes("iul"), false);
});

test("date and time ranges", () => {
  assert.equal(formatDateRange("2026-07-19", "2026-07-22"), "19 Jul–22 Jul 2026");
  assert.equal(formatTimeRange("14:00", "18:30"), "14:00–18:30");
  assert.equal(formatTimeRange("22:00", "03:00"), "22:00–03:00");
});

test("invalid values do not throw", () => {
  assert.equal(formatRecordingDate("not-a-date"), "Choose a valid date");
  assert.equal(formatRecordingTime("x"), "Choose a valid time");
  assert.equal(parseRecordingInstant("bogus"), undefined);
  assert.doesNotThrow(() => matchesRecordingSearch({ name: "x.mp4", recordedAt: "bad" }, "19 jul"));
});

test("filename search fragments", () => {
  assert.equal(matchesRecordingSearch(SAMPLE, "PARK260719"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "park260719"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "140520"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "MP4"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, ".mp4"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "zzz"), false);
});

test("date search forms", () => {
  for (const q of [
    "19 Jul 2026",
    "19 July 2026",
    "Jul 19 2026",
    "July 19 2026",
    "19/07/2026",
    "19-07-2026",
    "19.07.2026",
    "2026-07-19",
    "19 Jul",
    "19 July",
  ]) {
    assert.equal(matchesRecordingSearch(SAMPLE, q), true, q);
  }
});

test("time search forms", () => {
  assert.equal(matchesRecordingSearch(SAMPLE, "14:05"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "14.05"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "1405"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "14"), true);
});

test("combined AND search", () => {
  assert.equal(matchesRecordingSearch(SAMPLE, "park 19 july 14"), true);
  assert.equal(matchesRecordingSearch(SAMPLE, "file 19 july 14"), false);
});

test("search index has no duplicate map keys", () => {
  clearRecordingSearchIndexCache();
  const files = [SAMPLE, { ...SAMPLE, name: "FILE260719-135922F.MP4", category: "normal" }];
  const map = getRecordingSearchIndexMap(files);
  assert.equal(map.size, 2);
  const again = getRecordingSearchIndexMap(files);
  assert.equal(again, map);
});

test("index blob is a single string without duplicate-only noise requirement", () => {
  const idx = buildRecordingSearchIndex(SAMPLE);
  assert.ok(idx.includes("19 jul 2026"));
  assert.ok(idx.includes("19072026"));
  assert.ok(idx.includes("parking"));
});
