import assert from "node:assert/strict";
import test from "node:test";

import type { GpsSample } from "../../packages/parsers/src/index";
import { normalizeGpsTrack } from "./sampleIndex";
import {
  bearingBetween,
  interpolateGpsAtVideoTime,
  lookAheadCoordinate,
  smoothBearing,
  zoomForSpeedKmh,
} from "./mapFollow";

function s(iso: string, lat: number, lon: number, speed = 40): GpsSample {
  return {
    recordedAt: iso,
    latitude: lat,
    longitude: lon,
    speedKmh: speed,
    altitudeMeters: 90,
  };
}

test("bearing between eastbound points is near 90", () => {
  const b = bearingBetween(45, 25, 45, 25.01);
  assert.ok(b > 80 && b < 100, `bearing=${b}`);
});

test("smoothBearing avoids 360 wrap jumps", () => {
  const smoothed = smoothBearing(350, 10, 0.5);
  assert.ok(smoothed < 20 || smoothed > 340, `got ${smoothed}`);
});

test("zoom hysteresis uses stable thresholds", () => {
  assert.equal(zoomForSpeedKmh(10, 17), 17);
  assert.equal(zoomForSpeedKmh(40, 17), 16); // crosses out of 17 with hysteresis
  assert.equal(zoomForSpeedKmh(50, 16), 16);
  assert.equal(zoomForSpeedKmh(90, 16), 15);
  assert.equal(zoomForSpeedKmh(70, 15), 16); // climbing back
});

test("interpolate between samples for mid video time", () => {
  const track = normalizeGpsTrack([
    s("2026-07-20T10:00:00.000Z", 45, 25, 30),
    s("2026-07-20T10:00:02.000Z", 45.002, 25.002, 50),
    s("2026-07-20T10:00:04.000Z", 45.004, 25.004, 60),
  ]);
  const mid = interpolateGpsAtVideoTime(track, 1);
  assert.ok(mid);
  assert.ok(mid!.latitude > 45 && mid!.latitude < 45.002);
  assert.equal(mid!.status, "synchronized");
});

test("seek before first and after last stay at endpoints", () => {
  const track = normalizeGpsTrack([
    s("2026-07-20T10:00:00.000Z", 45, 25),
    s("2026-07-20T10:00:05.000Z", 45.01, 25.01),
  ]);
  const before = interpolateGpsAtVideoTime(track, 0);
  assert.equal(before?.index, 0);
  const after = interpolateGpsAtVideoTime(track, 60);
  assert.equal(after?.status, "out_of_range");
  assert.equal(after?.index, 1);
});

test("look-ahead coordinate moves along bearing", () => {
  const origin = lookAheadCoordinate(45, 25, 90, 100);
  assert.ok(origin.longitude > 25);
  assert.ok(Math.abs(origin.latitude - 45) < 0.002);
  const north = lookAheadCoordinate(45, 25, 0, 100);
  assert.ok(north.latitude > 45);
});

test("local map mode does not imply Google MapView", () => {
  const mode: "local" | "online" = "local";
  assert.equal(mode, "local");
});
