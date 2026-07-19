import assert from "node:assert/strict";
import test from "node:test";
import { calculateProgress, formatBytes } from "../src/utils/progress.js";

test("progress calculates percent and ETA", () => {
  const result = calculateProgress({
    bytesReceived: 250,
    totalBytes: 1_000,
    elapsedMs: 500,
    bytesPerSecond: 500,
  });
  assert.equal(result.percent, 25);
  assert.equal(result.etaSeconds, 1.5);
});

test("formatBytes uses binary units", () => {
  assert.equal(formatBytes(1_048_576), "1.0 MiB");
});
