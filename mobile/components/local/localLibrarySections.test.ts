import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { LocalMediaFile } from "../../context/DemoModeContext";
import {
  buildLocalLibraryFileRows,
  buildLocalLibrarySections,
  dayKeyFromName,
  formatCompactDateTime,
  formatCountLabel,
  formatSectionHeading,
  LOCAL_ACTION_HIT,
  LOCAL_LIBRARY_LIST_BOTTOM_PADDING,
  LOCAL_LIBRARY_STICKY_HEADERS,
  stickySectionKeyFromLocalViewableItems,
} from "./localLibrarySections";

function file(name: string, uri = `file://${name}`): LocalMediaFile {
  return { name, uri, sizeBytes: 1024, kind: "video" };
}

test("files group by calendar day", () => {
  const sections = buildLocalLibrarySections([
    file("FILE260719-135021F.MP4"),
    file("FILE260719-140000F.MP4"),
    file("FILE260718-100000F.MP4"),
  ]);
  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.dayKey, "2026-07-19");
  assert.equal(sections[0]?.count, 2);
  assert.equal(sections[1]?.dayKey, "2026-07-18");
  assert.equal(sections[1]?.count, 1);
});

test("sections sort descending by day", () => {
  const sections = buildLocalLibrarySections([
    file("FILE260717-100000F.MP4"),
    file("FILE260719-100000F.MP4"),
    file("FILE260718-100000F.MP4"),
  ]);
  assert.deepEqual(
    sections.map((s) => s.dayKey),
    ["2026-07-19", "2026-07-18", "2026-07-17"],
  );
});

test("files keep newest-first order inside a section", () => {
  const sections = buildLocalLibrarySections([
    file("FILE260719-120000F.MP4"),
    file("FILE260719-150000F.MP4"),
    file("FILE260719-130000F.MP4"),
  ]);
  assert.deepEqual(
    sections[0]?.data.map((f) => f.name),
    ["FILE260719-150000F.MP4", "FILE260719-130000F.MP4", "FILE260719-120000F.MP4"],
  );
});

test("oldest reverses day order and within-day order", () => {
  const sections = buildLocalLibrarySections(
    [
      file("FILE260719-150000F.MP4"),
      file("FILE260719-120000F.MP4"),
      file("FILE260718-100000F.MP4"),
    ],
    "oldest",
  );
  assert.deepEqual(
    sections.map((s) => s.dayKey),
    ["2026-07-18", "2026-07-19"],
  );
  assert.deepEqual(
    sections[1]?.data.map((f) => f.name),
    ["FILE260719-120000F.MP4", "FILE260719-150000F.MP4"],
  );
});

test("non-date sort uses a single flat section", () => {
  const sections = buildLocalLibrarySections(
    [
      { name: "A.MP4", uri: "file://A", sizeBytes: 10, kind: "video" },
      { name: "B.MP4", uri: "file://B", sizeBytes: 99, kind: "video" },
    ],
    "largest",
  );
  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.key, "all-largest");
  assert.deepEqual(
    sections[0]?.data.map((f) => f.name),
    ["B.MP4", "A.MP4"],
  );
});

test("Local screen wires shared sort sheet without Name options", () => {
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const model = readFileSync(join(__dirname, "../camera/cameraLibraryModel.ts"), "utf8");
  assert.match(local, /LocalDateSectionHeader/);
  assert.match(local, /local-sort-sheet/);
  assert.match(local, /cameraSortOptionsForCategory/);
  assert.match(local, /buildLocalLibrarySections\(filteredFiles, sort, durationByName\)/);
  assert.doesNotMatch(model, /Name A/);
  assert.doesNotMatch(model, /nameAsc/);
});

test("card date formatting stays available", () => {
  const line = formatCompactDateTime("FILE260719-135021F.MP4");
  assert.ok(line);
  assert.match(line!, /2026/);
  assert.match(line!, /13:50/);
});

test("section count label is correct", () => {
  assert.equal(formatCountLabel(1), "1 file");
  assert.equal(formatCountLabel(4), "4 files");
  const sections = buildLocalLibrarySections([
    file("FILE260719-100000F.MP4"),
    file("FILE260719-110000F.MP4"),
    file("FILE260719-120000F.MP4"),
    file("FILE260719-130000F.MP4"),
  ]);
  assert.equal(sections[0]?.count, 4);
  assert.equal(sections[0]?.countLabel, "4 files");
});

test("unknown dates land in stable section", () => {
  assert.equal(dayKeyFromName("random.mp4"), "unknown");
  assert.equal(formatSectionHeading("unknown"), "UNKNOWN DATE");
  const sections = buildLocalLibrarySections([file("random.mp4"), file("FILE260719-100000F.MP4")]);
  assert.equal(sections[sections.length - 1]?.dayKey, "unknown");
  assert.equal(sections[sections.length - 1]?.title, "UNKNOWN DATE");
});

test("section headings use English en-GB", () => {
  assert.equal(formatSectionHeading("2026-07-19"), "SUNDAY, 19 JULY 2026");
  assert.match(formatCompactDateTime("FILE260719-135021F.MP4") ?? "", /Jul/);
  assert.doesNotMatch(formatCompactDateTime("FILE260719-135021F.MP4") ?? "", /iul/i);
});

test("section keys are stable day keys", () => {
  const sections = buildLocalLibrarySections([file("FILE260719-100000F.MP4")]);
  assert.equal(sections[0]?.key, "2026-07-19");
});

test("sticky headers flag remains for Local sticky UX contract", () => {
  assert.equal(LOCAL_LIBRARY_STICKY_HEADERS, true);
});

test("flat rows omit empty calendar gaps and keep unique keys", () => {
  const sections = buildLocalLibrarySections([
    file("FILE260719-100000F.MP4"),
    file("FILE260719-110000F.MP4"),
    file("FILE260717-100000F.MP4"),
  ]);
  assert.deepEqual(
    sections.map((s) => s.dayKey),
    ["2026-07-19", "2026-07-17"],
  );
  const rows = buildLocalLibraryFileRows(sections);
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((r) => r.key)).size, 3);
  assert.equal(rows.some((r) => r.sectionKey === "2026-07-18"), false);
  let boundary = -1;
  for (let i = 0; i < rows.length - 1; i += 1) {
    if (rows[i]?.sectionKey === "2026-07-19" && rows[i + 1]?.sectionKey === "2026-07-17") {
      boundary = i;
      break;
    }
  }
  assert.ok(boundary >= 0);
  assert.equal(rows[0]?.sectionTitle, "SUNDAY, 19 JULY 2026");
  assert.ok(rows.every((r) => r.file && r.sectionKey));
});

test("viewability without files keeps previous sticky key (helper returns undefined)", () => {
  assert.equal(stickySectionKeyFromLocalViewableItems([]), undefined);
  assert.equal(
    stickySectionKeyFromLocalViewableItems([
      { item: { sectionKey: "2026-07-19", file: file("FILE260719-100000F.MP4") } },
      { item: { sectionKey: "2026-07-17", file: file("FILE260717-100000F.MP4") } },
    ]),
    "2026-07-19",
  );
  assert.equal(stickySectionKeyFromLocalViewableItems([{ item: { title: "header" } }]), undefined);
});

test("local action hit boxes are at least 44pt", () => {
  assert.ok(LOCAL_ACTION_HIT >= 44);
});

test("local list bottom padding clears tab bar", () => {
  assert.ok(LOCAL_LIBRARY_LIST_BOTTOM_PADDING >= 80);
});

test("refresh rebuilds the same section keys without duplication", () => {
  const files = [
    file("FILE260719-100000F.MP4"),
    file("FILE260719-110000F.MP4"),
    file("FILE260718-100000F.MP4"),
  ];
  const a = buildLocalLibrarySections(files);
  const b = buildLocalLibrarySections(files);
  assert.deepEqual(
    a.map((s) => s.key),
    b.map((s) => s.key),
  );
  assert.equal(a.length, new Set(a.map((s) => s.key)).size);
});
