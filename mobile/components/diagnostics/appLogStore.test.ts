import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendToRing,
  buildAppLogExportText,
  filterAppLogs,
  formatAppLogLine,
  formatDownloadRateBps,
  groupAppLogsByLocalDay,
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
    assert.equal(filterAppLogs(entries, { query: "STALL" }).length, 1);
    assert.equal(filterAppLogs(entries, { query: "connection" }).length, 1);
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

  it("groups changing samples by event identity across the same local day", () => {
    const at = (day: number, hour: number) => new Date(2026, 7, day, hour, 0, 0).toISOString();
    const entries: AppLogEntry[] = [
      {
        id: "latest-speed",
        ts: at(1, 21),
        level: "info",
        category: "download",
        message: "speed FILE.MP4 192.6 KB/s (39%, 126547892/321637064)",
        groupKey: "queue:speed:FILE.MP4",
      },
      {
        id: "other-event",
        ts: at(1, 20),
        level: "info",
        category: "connection",
        message: "refresh start",
      },
      {
        id: "older-speed",
        ts: at(1, 19),
        level: "info",
        category: "download",
        message: "speed FILE.MP4 696.6 KB/s (38%, 120895412/321637064)",
        groupKey: "queue:speed:FILE.MP4",
      },
      {
        id: "previous-day",
        ts: at(2, 1),
        level: "info",
        category: "download",
        message: "speed FILE.MP4 300.0 KB/s (40%, 130000000/321637064)",
        groupKey: "queue:speed:FILE.MP4",
      },
    ];

    const grouped = groupAppLogsByLocalDay(entries);
    assert.equal(grouped.length, 3);
    const sameDay = grouped.find(
      (entry) => entry.groupKey === "queue:speed:FILE.MP4" && entry.lastTs === at(1, 21),
    );
    assert.equal(sameDay?.occurrenceCount, 2);
    assert.equal(sameDay?.firstTs, at(1, 19));
    assert.equal(sameDay?.lastTs, at(1, 21));
    assert.match(sameDay?.message ?? "", /192\.6 KB\/s/);
    assert.deepEqual(
      sameDay?.entries.map((entry) => entry.id),
      ["latest-speed", "older-speed"],
    );
  });

  it("groups legacy download speed messages that predate structured keys", () => {
    const latest = new Date(2026, 7, 1, 21, 20, 56).toISOString();
    const earlier = new Date(2026, 7, 1, 21, 20, 38).toISOString();
    const grouped = groupAppLogsByLocalDay([
      {
        id: "latest",
        ts: latest,
        level: "info",
        category: "download",
        message: "speed FILE260731-193514F.MP4 192.6 KB/s (39%, 126547892/321637064)",
      },
      {
        id: "earlier",
        ts: earlier,
        level: "info",
        category: "download",
        message: "speed FILE260731-193514F.MP4 609.5 KB/s (37%, 118966480/321637064)",
      },
    ]);

    assert.equal(grouped.length, 1);
    assert.equal(grouped[0]?.occurrenceCount, 2);
    assert.match(grouped[0]?.message ?? "", /192\.6 KB\/s/);
    assert.deepEqual(
      grouped[0]?.entries.map((entry) => entry.id),
      ["latest", "earlier"],
    );
  });

  it("groups identical unstructured messages but keeps severity separate", () => {
    const ts = new Date(2026, 7, 1, 12, 0, 0).toISOString();
    const base: AppLogEntry = {
      id: "1",
      ts,
      level: "warn",
      category: "connection",
      message: "camera response delayed",
    };
    const grouped = groupAppLogsByLocalDay([
      base,
      { ...base, id: "2", ts: new Date(2026, 7, 1, 11, 0, 0).toISOString() },
      { ...base, id: "3", level: "error" },
    ]);

    assert.equal(grouped.length, 2);
    assert.equal(grouped.find((entry) => entry.level === "warn")?.occurrenceCount, 2);
    assert.equal(grouped.find((entry) => entry.level === "error")?.occurrenceCount, 1);
  });
});
