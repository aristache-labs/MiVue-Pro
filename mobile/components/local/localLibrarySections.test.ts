import assert from "node:assert/strict";
import test from "node:test";

import type { LocalMediaFile } from "../../context/DemoModeContext";
import {
  buildLocalLibrarySections,
  dayKeyFromName,
  formatCompactDateTime,
  formatCountLabel,
  formatSectionHeading,
  LOCAL_LIBRARY_STICKY_HEADERS,
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

test("card date formatting stays available", () => {
  const line = formatCompactDateTime("FILE260719-135021F.MP4");
  assert.ok(line);
  assert.match(line!, /2026/);
  assert.match(line!, /13:50/);
});

test("section count label is correct", () => {
  assert.equal(formatCountLabel(1), "1 fișier");
  assert.equal(formatCountLabel(4), "4 fișiere");
  const sections = buildLocalLibrarySections([
    file("FILE260719-100000F.MP4"),
    file("FILE260719-110000F.MP4"),
    file("FILE260719-120000F.MP4"),
    file("FILE260719-130000F.MP4"),
  ]);
  assert.equal(sections[0]?.count, 4);
  assert.equal(sections[0]?.countLabel, "4 fișiere");
});

test("unknown dates land in stable section", () => {
  assert.equal(dayKeyFromName("random.mp4"), "unknown");
  assert.equal(formatSectionHeading("unknown"), "DATĂ NECUNOSCUTĂ");
  const sections = buildLocalLibrarySections([file("random.mp4"), file("FILE260719-100000F.MP4")]);
  assert.equal(sections[sections.length - 1]?.dayKey, "unknown");
  assert.equal(sections[sections.length - 1]?.title, "DATĂ NECUNOSCUTĂ");
});

test("section keys are stable day keys", () => {
  const sections = buildLocalLibrarySections([file("FILE260719-100000F.MP4")]);
  assert.equal(sections[0]?.key, "2026-07-19");
});

test("sticky headers flag is enabled for Local Library", () => {
  assert.equal(LOCAL_LIBRARY_STICKY_HEADERS, true);
});
