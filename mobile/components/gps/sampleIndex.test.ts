import assert from "node:assert/strict";
import test from "node:test";

import type { GpsSample } from "../../packages/parsers/src/index";
import {
  GPS_VIDEO_SYNC_TOLERANCE_SEC,
  gpsStatusLabel,
  lookupGpsAtVideoTime,
  nearestTimeIndex,
  normalizeGpsTrack,
  sampleIndexAtTime,
} from "./sampleIndex";

function s(
  iso: string,
  lat: number,
  lon: number,
  extras: Partial<GpsSample> = {},
): GpsSample {
  return {
    recordedAt: iso,
    latitude: lat,
    longitude: lon,
    speedKmh: extras.speedKmh ?? 40,
    altitudeMeters: extras.altitudeMeters,
    ...extras,
  };
}

test("sampleIndexAtTime picks nearest sample by elapsed video time", () => {
  const samples: GpsSample[] = [
    s("2026-07-20T10:00:00.000Z", 45, 25, { speedKmh: 10 }),
    s("2026-07-20T10:00:02.000Z", 45.001, 25, { speedKmh: 12 }),
    s("2026-07-20T10:00:05.000Z", 45.002, 25, { speedKmh: 14 }),
  ];
  assert.equal(sampleIndexAtTime(samples, 0), 0);
  assert.equal(sampleIndexAtTime(samples, 1.9), 1);
  assert.equal(sampleIndexAtTime(samples, 4), 2);
});

test("normalize sorts unsorted samples and drops invalid", () => {
  const raw: GpsSample[] = [
    s("2026-07-20T10:00:05.000Z", 45.002, 25),
    s("bad", 45, 25),
    s("2026-07-20T10:00:00.000Z", 45, 25),
    s("2026-07-20T10:00:02.000Z", Number.NaN, 25),
    s("2026-07-20T10:00:03.000Z", 0, 0),
    s("2026-07-20T10:00:02.000Z", 45.001, 25),
  ];
  const track = normalizeGpsTrack(raw);
  assert.equal(track.samples.length, 3);
  assert.deepEqual(
    track.timesMs,
    track.timesMs.slice().sort((a, b) => a - b),
  );
});

test("binary search nearestTimeIndex", () => {
  const times = [1000, 2000, 5000, 9000];
  assert.equal(nearestTimeIndex(times, 1000), 0);
  assert.equal(nearestTimeIndex(times, 1900), 1);
  assert.equal(nearestTimeIndex(times, 7000), 2);
  assert.equal(nearestTimeIndex(times, 50), 0);
  assert.equal(nearestTimeIndex(times, 50_000), 3);
});

test("lookup synchronized within documented tolerance", () => {
  const track = normalizeGpsTrack([
    s("2026-07-20T10:00:00.000Z", 45, 25),
    s("2026-07-20T10:00:02.000Z", 45.001, 25),
    s("2026-07-20T10:00:05.000Z", 45.002, 25),
  ]);
  const ok = lookupGpsAtVideoTime(track, 1.9, GPS_VIDEO_SYNC_TOLERANCE_SEC);
  assert.equal(ok.status, "synchronized");
  assert.equal(ok.index, 1);
});

test("out of range before first and after last sample", () => {
  const track = normalizeGpsTrack([
    s("2026-07-20T10:00:00.000Z", 45, 25),
    s("2026-07-20T10:00:05.000Z", 45.002, 25),
  ]);
  // Video time far after last sample (start + 60s)
  const after = lookupGpsAtVideoTime(track, 60);
  assert.equal(after.status, "out_of_range");
  assert.equal(after.index, 1);
});

test("empty track is unavailable", () => {
  const track = normalizeGpsTrack([]);
  const r = lookupGpsAtVideoTime(track, 0);
  assert.equal(r.status, "unavailable");
  assert.equal(gpsStatusLabel("unavailable"), "GPS unavailable");
  assert.equal(gpsStatusLabel("synchronized"), "Synchronized");
  assert.equal(gpsStatusLabel("partial"), "Partial GPS data");
});

test("partial when too few samples", () => {
  const track = normalizeGpsTrack([
    s("2026-07-20T10:00:00.000Z", 45, 25),
    s("2026-07-20T10:00:01.000Z", 45.001, 25),
  ]);
  assert.equal(track.partial, true);
  const r = lookupGpsAtVideoTime(track, 0.5);
  assert.equal(r.status, "partial");
});

test("end of clip selects last valid sample index", () => {
  const samples: GpsSample[] = [
    s("2026-07-20T10:00:00.000Z", 45, 25),
    s("2026-07-20T10:00:02.000Z", 45.001, 25),
    s("2026-07-20T10:00:05.000Z", 45.002, 25),
  ];
  assert.equal(sampleIndexAtTime(samples, 5), 2);
  assert.equal(sampleIndexAtTime(samples, 4.9), 2);
});
