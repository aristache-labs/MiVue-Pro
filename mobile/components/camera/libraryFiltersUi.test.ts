import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  cameraSortOptionsForCategory,
  EMPTY_CAMERA_FILTERS,
  filterAndSortRemoteFiles,
  formatCountAbbrev,
  matchesSearch,
  sanitizeFiltersForCategoryScope,
  showCategorySectionInFilters,
  type CameraLibraryFilters,
} from "./cameraLibraryModel";
import type { RemoteFile } from "@/packages/parsers/src/index";

function file(partial: Partial<RemoteFile> & Pick<RemoteFile, "name" | "path" | "category">): RemoteFile {
  return {
    sizeBytes: 20_000_000,
    recordedAt: "2026-07-19 14:05:20",
    durationSeconds: 20,
    camera: "front",
    mediaFormat: "H264",
    writable: false,
    ...partial,
  };
}

const sample: readonly RemoteFile[] = [
  file({
    name: "PARK260719-140520F.MP4",
    path: "/SD/Parking/F/PARK260719-140520F.MP4",
    category: "parking",
    recordedAt: "2026-07-19 14:05:20",
  }),
  file({
    name: "FILE260719-135922F.MP4",
    path: "/SD/Normal/F/FILE260719-135922F.MP4",
    category: "normal",
    recordedAt: "2026-07-19 13:59:22",
  }),
  file({
    name: "IMG260719-090011F.JPG",
    path: "/SD/Photo/F/IMG260719-090011F.JPG",
    category: "photo",
    recordedAt: "2026-07-19 09:00:11",
    durationSeconds: undefined,
    sizeBytes: 2_000_000,
  }),
];

test("five category cells use shared LibraryCategoryTabs without horizontal ScrollView", () => {
  const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const cats = readFileSync(join(__dirname, "../library/LibraryCategoryTabs.tsx"), "utf8");
  assert.match(index, /testID="camera-category-row"/);
  assert.match(index, /LibraryCategoryTabs/);
  assert.match(cats, /LIBRARY_CATEGORY_GAP/);
  assert.match(cats, /formatCountAbbrev/);
  assert.equal(
    index.includes("horizontal\n          showsHorizontalScrollIndicator={false}\n          style={{ maxHeight: 40"),
    false,
  );
});

test("large counts abbreviate visually and keep full a11y value", () => {
  assert.deepEqual(formatCountAbbrev(135), { display: "135", a11y: "135" });
  assert.deepEqual(formatCountAbbrev(1200), { display: "1.2K", a11y: "1200" });
  assert.deepEqual(formatCountAbbrev(12400), { display: "12.4K", a11y: "12400" });
});

test("Category filter section only for All scope", () => {
  assert.equal(showCategorySectionInFilters("all"), true);
  assert.equal(showCategorySectionInFilters("normal"), false);
  assert.equal(showCategorySectionInFilters("parking"), false);
  assert.equal(showCategorySectionInFilters("event"), false);
  assert.equal(showCategorySectionInFilters("photo"), false);
});

test("Duration filter section is gone from Filters", () => {
  assert.equal(showCategorySectionInFilters("all"), true);
});

test("sanitize clears conflicting category filters when scope is not All", () => {
  const dirty: CameraLibraryFilters = {
    ...EMPTY_CAMERA_FILTERS,
    categories: ["parking", "photo"],
    durationMinSec: 60,
  };
  const normal = sanitizeFiltersForCategoryScope(dirty, "normal");
  assert.deepEqual(normal.categories, []);
  assert.equal(normal.durationMinSec, 60);
  const photo = sanitizeFiltersForCategoryScope(dirty, "photo");
  assert.deepEqual(photo.categories, []);
  assert.equal(photo.durationMinSec, undefined);
});

test("search by filename fragments", () => {
  const park = sample[0]!;
  assert.equal(matchesSearch(park, "PARK260719"), true);
  assert.equal(matchesSearch(park, "140520"), true);
  assert.equal(matchesSearch(park, ".MP4"), true);
  assert.equal(matchesSearch(park, "zzz"), false);
});

test("search by date and time formats", () => {
  const park = sample[0]!;
  assert.equal(matchesSearch(park, "2026-07-19"), true);
  assert.equal(matchesSearch(park, "19.07.2026"), true);
  assert.equal(matchesSearch(park, "19/07/2026"), true);
  assert.equal(matchesSearch(park, "19 Jul 2026"), true);
  assert.equal(matchesSearch(park, "19 July 2026"), true);
  assert.equal(matchesSearch(park, "14:05"), true);
  assert.equal(matchesSearch(park, "1405"), true);
  assert.equal(matchesSearch(park, "14"), true);
});

test("combined AND search respects category scope and filters", () => {
  const hits = filterAndSortRemoteFiles({
    files: sample,
    category: "parking",
    search: "parking 19 jul 14",
    filters: EMPTY_CAMERA_FILTERS,
    sort: "newest",
    downloadedNames: new Set(),
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.name, "PARK260719-140520F.MP4");

  const none = filterAndSortRemoteFiles({
    files: sample,
    category: "normal",
    search: "parking 19 jul 14",
    filters: EMPTY_CAMERA_FILTERS,
    sort: "newest",
    downloadedNames: new Set(),
  });
  assert.equal(none.length, 0);
});

test("in_queue filter uses active queue names only", () => {
  const hits = filterAndSortRemoteFiles({
    files: sample,
    category: "all",
    search: "",
    filters: { ...EMPTY_CAMERA_FILTERS, downloaded: "in_queue" },
    sort: "newest",
    downloadedNames: new Set(),
    queuedNames: new Set(["FILE260719-135922F.MP4"]),
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.category, "normal");
});

test("photo sort options hide duration sorts", () => {
  const opts = cameraSortOptionsForCategory("photo");
  assert.equal(opts.some((o) => o.id === "longest"), false);
  assert.equal(opts.some((o) => o.id === "newest"), true);
});

test("detail sheet has no Status row; uses StaticBackdropSheet", () => {
  const sheet = readFileSync(join(__dirname, "RemoteDetailSheet.tsx"), "utf8");
  assert.equal(sheet.includes('label="Status"'), false);
  assert.match(sheet, /metaCols/);
  assert.match(sheet, /StaticBackdropSheet/);

  const action = readFileSync(join(__dirname, "CompactDownloadAction.tsx"), "utf8");
  assert.match(action, /Download/);
  assert.match(action, /downloadChip/);
  assert.match(action, /stopPropagation/);
});

test("filter sheet uses Show X results and StaticBackdropSheet", () => {
  const src = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  assert.match(src, /Show \{draftCount\} results/);
  assert.match(src, /StaticBackdropSheet/);
  assert.match(src, /showCategorySectionInFilters/);
  assert.equal(src.includes("showDurationSectionInFilters"), false);
  assert.match(src, /In queue/);
  assert.match(src, /DateTimePicker/);
  assert.equal(src.includes("TIME_PRESETS"), false);
});

test("library clear-all does not reset main category", () => {
  const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  assert.match(index, /setFilters\(EMPTY_CAMERA_FILTERS\)/);
  assert.match(index, /Clear all/);
  // Clear-all handler must not setCategory("all")
  const clearBlock = index.slice(index.indexOf("Clear all") - 280, index.indexOf("Clear all"));
  assert.equal(clearBlock.includes('setCategory("all")'), false);
});
