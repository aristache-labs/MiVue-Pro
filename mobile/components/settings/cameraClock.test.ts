import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CAMERA_CLOCK_COMPONENT_KEYS,
  CAMERA_CLOCK_WILDCARD,
  formatCameraClockDisplay,
  formatCameraClockParts,
  isValidCameraClockParts,
  parseCameraClockAggregate,
  readCameraClockParts,
} from "./cameraClock";

const complete = {
  [CAMERA_CLOCK_COMPONENT_KEYS.year]: "2026",
  [CAMERA_CLOCK_COMPONENT_KEYS.month]: "7",
  [CAMERA_CLOCK_COMPONENT_KEYS.day]: "23",
  [CAMERA_CLOCK_COMPONENT_KEYS.hour]: "19",
  [CAMERA_CLOCK_COMPONENT_KEYS.minute]: "26",
  [CAMERA_CLOCK_COMPONENT_KEYS.second]: "15",
};

describe("cameraClock", () => {
  it("complete valid components produce the full timestamp", () => {
    assert.equal(formatCameraClockDisplay(complete), "23 Jul 2026 · 19:26:15");
    assert.deepEqual(readCameraClockParts(complete), {
      year: 2026,
      month: 7,
      day: 23,
      hour: 19,
      minute: 26,
      second: 15,
    });
  });

  it("zero-pads hour minute second", () => {
    assert.equal(
      formatCameraClockParts({
        year: 2026,
        month: 1,
        day: 5,
        hour: 9,
        minute: 3,
        second: 7,
      }),
      "5 Jan 2026 · 09:03:07",
    );
  });

  it("single value 15 produces em dash", () => {
    assert.equal(formatCameraClockDisplay({ [CAMERA_CLOCK_WILDCARD]: "15" }), "—");
    assert.equal(
      formatCameraClockDisplay({ [CAMERA_CLOCK_COMPONENT_KEYS.second]: "15" }),
      "—",
    );
  });

  it("missing year produces em dash", () => {
    const rest: Record<string, string> = { ...complete };
    delete rest[CAMERA_CLOCK_COMPONENT_KEYS.year];
    assert.equal(formatCameraClockDisplay(rest), "—");
  });

  it("invalid month produces em dash", () => {
    assert.equal(
      formatCameraClockDisplay({ ...complete, [CAMERA_CLOCK_COMPONENT_KEYS.month]: "13" }),
      "—",
    );
  });

  it("invalid day for month produces em dash", () => {
    assert.equal(
      formatCameraClockDisplay({
        ...complete,
        [CAMERA_CLOCK_COMPONENT_KEYS.month]: "2",
        [CAMERA_CLOCK_COMPONENT_KEYS.day]: "30",
      }),
      "—",
    );
  });

  it("invalid hour minute second produce em dash", () => {
    assert.equal(
      formatCameraClockDisplay({ ...complete, [CAMERA_CLOCK_COMPONENT_KEYS.hour]: "24" }),
      "—",
    );
    assert.equal(
      formatCameraClockDisplay({ ...complete, [CAMERA_CLOCK_COMPONENT_KEYS.minute]: "60" }),
      "—",
    );
    assert.equal(
      formatCameraClockDisplay({ ...complete, [CAMERA_CLOCK_COMPONENT_KEYS.second]: "99" }),
      "—",
    );
  });

  it("leap-year date is handled correctly", () => {
    assert.equal(
      isValidCameraClockParts({
        year: 2024,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      }),
      true,
    );
    assert.equal(
      isValidCameraClockParts({
        year: 2025,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      }),
      false,
    );
    assert.equal(
      formatCameraClockDisplay({
        [CAMERA_CLOCK_COMPONENT_KEYS.year]: "2024",
        [CAMERA_CLOCK_COMPONENT_KEYS.month]: "2",
        [CAMERA_CLOCK_COMPONENT_KEYS.day]: "29",
        [CAMERA_CLOCK_COMPONENT_KEYS.hour]: "0",
        [CAMERA_CLOCK_COMPONENT_KEYS.minute]: "0",
        [CAMERA_CLOCK_COMPONENT_KEYS.second]: "0",
      }),
      "29 Feb 2024 · 00:00:00",
    );
  });

  it("validated aggregate string is accepted; bare numbers rejected", () => {
    assert.equal(
      formatCameraClockDisplay({ [CAMERA_CLOCK_WILDCARD]: "2026-07-23 19:26:15" }),
      "23 Jul 2026 · 19:26:15",
    );
    assert.equal(parseCameraClockAggregate("15"), undefined);
    assert.equal(parseCameraClockAggregate("19:26:15"), undefined);
  });

  it("does not apply UTC conversion — components format as given", () => {
    // 23:00 wall clock must stay 23:00, not shift via Date/UTC.
    assert.equal(
      formatCameraClockDisplay({
        [CAMERA_CLOCK_COMPONENT_KEYS.year]: "2026",
        [CAMERA_CLOCK_COMPONENT_KEYS.month]: "7",
        [CAMERA_CLOCK_COMPONENT_KEYS.day]: "23",
        [CAMERA_CLOCK_COMPONENT_KEYS.hour]: "23",
        [CAMERA_CLOCK_COMPONENT_KEYS.minute]: "0",
        [CAMERA_CLOCK_COMPONENT_KEYS.second]: "0",
      }),
      "23 Jul 2026 · 23:00:00",
    );
  });
});
