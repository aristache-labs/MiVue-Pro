import assert from "node:assert/strict";
import test from "node:test";

import type { GpsSample } from "../../packages/parsers/src/index";
import { sampleIndexAtTime } from "./sampleIndex";

test("sampleIndexAtTime picks nearest sample by elapsed video time", () => {
  const samples: GpsSample[] = [
    { recordedAt: "2026-07-20T10:00:00.000Z", latitude: 45, longitude: 25, speedKmh: 10 },
    { recordedAt: "2026-07-20T10:00:02.000Z", latitude: 45.001, longitude: 25, speedKmh: 12 },
    { recordedAt: "2026-07-20T10:00:05.000Z", latitude: 45.002, longitude: 25, speedKmh: 14 },
  ];
  assert.equal(sampleIndexAtTime(samples, 0), 0);
  assert.equal(sampleIndexAtTime(samples, 1.9), 1);
  assert.equal(sampleIndexAtTime(samples, 4), 2);
});
