import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendToRing,
  buildAppLogExportText,
  filterAppLogs,
  formatAppLogLine,
  formatDownloadRateBps,
  type AppLogEntry,
} from "./appLogFormat";

describe("appLogFormat", () => {
  it("keeps newest-first ring within max", () => {
    const a: AppLogEntry = {
      id: "1",
      ts: "2026-01-01T00:00:00.000Z",
      level: "info",
      category: "app",
      message: "a",
    };
    const b: AppLogEntry = { ...a, id: "2", message: "b" };
    const c: AppLogEntry = { ...a, id: "3", message: "c" };
    const ring = appendToRing(appendToRing([a], b, 2), c, 2);
    assert.deepEqual(
      ring.map((e) => e.message),
      ["c", "b"],
    );
  });

  it("formats line and rate", () => {
    assert.match(
      formatAppLogLine({
        id: "1",
        ts: "2026-07-31T12:34:56.000Z",
        level: "warn",
        category: "connection",
        message: "lost",
      }),
      /12:34:56 \[warn\/connection\] lost/,
    );
    assert.equal(formatDownloadRateBps(512), "512 B/s");
    assert.equal(formatDownloadRateBps(2048), "2.0 KB/s");
    assert.equal(formatDownloadRateBps(2 * 1024 * 1024), "2.00 MB/s");
  });

  it("filters by category and level", () => {
    const entries: AppLogEntry[] = [
      {
        id: "1",
        ts: "2026-01-01T00:00:00.000Z",
        level: "info",
        category: "connection",
        message: "ok",
      },
      {
        id: "2",
        ts: "2026-01-01T00:00:01.000Z",
        level: "error",
        category: "download",
        message: "fail",
      },
      {
        id: "3",
        ts: "2026-01-01T00:00:02.000Z",
        level: "warn",
        category: "download",
        message: "stall",
      },
    ];
    assert.equal(filterAppLogs(entries, { category: "download" }).length, 2);
    assert.equal(filterAppLogs(entries, { level: "error" }).length, 1);
    assert.equal(filterAppLogs(entries, { category: "download", level: "warn" }).length, 1);
  });

  it("builds export text", () => {
    const text = buildAppLogExportText(
      [
        {
          id: "1",
          ts: "2026-01-01T00:00:00.000Z",
          level: "info",
          category: "app",
          message: "hello",
        },
      ],
      { title: "Test logs", exportedAt: "2026-01-01T01:00:00.000Z" },
    );
    assert.match(text, /^Test logs/);
    assert.match(text, /count=1/);
    assert.match(text, /\[info\/app\] hello/);
  });
});
