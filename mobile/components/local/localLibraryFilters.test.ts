import assert from "node:assert/strict";
import test from "node:test";

import type { LocalMediaFile } from "../../context/DemoModeContext";
import {
  buildLocalLibrarySections,
} from "./localLibrarySections";
import {
  assertManagedLocalMediaUri,
  deleteLocalFilesSequential,
  isManagedLocalMediaUri,
} from "./localLibraryDelete";
import {
  buildFilterChips,
  clearFilterGroup,
  countActiveFilterGroups,
  countLocalCategories,
  categoryFromLocalName,
  EMPTY_FILTERS,
  fileMatchesFilters,
  filterNormalizedFiles,
  minutesInTimeRange,
  normalizeLocalFile,
  pruneSelectionToUris,
  sanitizeLocalFiltersForCategoryScope,
  scopeNormalizedFiles,
  showLocalCategorySectionInFilters,
  type LocalLibraryFilters,
} from "./localLibraryFilters";

function file(
  name: string,
  opts: Partial<LocalMediaFile> = {},
): LocalMediaFile {
  const kind = /\.(jpg|jpeg|png)$/i.test(name) ? "image" : "video";
  return {
    name,
    uri: `file:///docs/downloads/${name}`,
    sizeBytes: opts.sizeBytes ?? 1_000_000,
    kind: opts.kind ?? kind,
  };
}

function norm(
  name: string,
  category?: "normal" | "parking" | "event" | "photo" | "unknown",
) {
  const map = category
    ? new Map([[name, category]])
    : undefined;
  return normalizeLocalFile(file(name), map);
}

test("any filters keep all including unknown date", () => {
  const items = [norm("FILE260719-100000F.MP4"), normalizeLocalFile(file("RANDOM.MP4"))];
  const out = filterNormalizedFiles(items, EMPTY_FILTERS);
  assert.equal(out.length, 2);
});

test("single date inclusive", () => {
  const items = [
    norm("FILE260719-100000F.MP4"),
    norm("FILE260720-100000F.MP4"),
    normalizeLocalFile(file("NODATE.MP4")),
  ];
  const filters: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    dateMode: "single",
    singleDay: "2026-07-19",
  };
  const out = filterNormalizedFiles(items, filters);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.file.name, "FILE260719-100000F.MP4");
});

test("inclusive date range", () => {
  const items = [
    norm("FILE260718-100000F.MP4"),
    norm("FILE260719-100000F.MP4"),
    norm("FILE260720-100000F.MP4"),
    norm("FILE260721-100000F.MP4"),
  ];
  const filters: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    dateMode: "range",
    rangeStart: "2026-07-19",
    rangeEnd: "2026-07-20",
  };
  const names = filterNormalizedFiles(items, filters).map((i) => i.file.name);
  assert.deepEqual(names, ["FILE260719-100000F.MP4", "FILE260720-100000F.MP4"]);
});

test("single time exact match", () => {
  const items = [norm("FILE260719-134500F.MP4"), norm("FILE260719-134600F.MP4")];
  const filters: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    timeMode: "single",
    singleTime: "13:45",
  };
  assert.equal(filterNormalizedFiles(items, filters).length, 1);
});

test("normal time range inclusive", () => {
  assert.equal(minutesInTimeRange(12 * 60, 12 * 60, 18 * 60), true);
  assert.equal(minutesInTimeRange(18 * 60, 12 * 60, 18 * 60), true);
  assert.equal(minutesInTimeRange(11 * 60 + 59, 12 * 60, 18 * 60), false);
});

test("overnight time range includes both sides of midnight", () => {
  assert.equal(minutesInTimeRange(23 * 60 + 30, 22 * 60, 6 * 60), true);
  assert.equal(minutesInTimeRange(5 * 60 + 30, 22 * 60, 6 * 60), true);
  assert.equal(minutesInTimeRange(12 * 60, 22 * 60, 6 * 60), false);
  const items = [
    norm("FILE260719-233000F.MP4"),
    norm("FILE260719-053000F.MP4"),
    norm("FILE260719-120000F.MP4"),
  ];
  const filters: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    timeMode: "range",
    timeFrom: "22:00",
    timeTo: "06:00",
  };
  assert.equal(filterNormalizedFiles(items, filters).length, 2);
});

test("category multi-select OR includes Photos", () => {
  const items = [
    norm("FILE260719-100000F.MP4", "normal"),
    norm("PARK260719-100000F.MP4", "parking"),
    norm("EVNT260719-100000F.MP4", "event"),
    normalizeLocalFile(file("SHOT260719-100000F.JPG")),
  ];
  const filters: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    categories: ["parking", "photo"],
  };
  const out = filterNormalizedFiles(items, filters);
  assert.equal(out.length, 2);
  assert.ok(out.some((i) => i.category === "parking"));
  assert.ok(out.some((i) => i.category === "photo"));
});

test("top category scope All Normal Parking Event Photos", () => {
  const items = [
    norm("FILE260719-100000F.MP4", "normal"),
    norm("PARK260719-100000F.MP4", "parking"),
    norm("EVNT260719-100000F.MP4", "event"),
    normalizeLocalFile(file("SHOT260719-100000F.JPG")),
  ];
  const counts = countLocalCategories(items);
  assert.equal(counts.all, 4);
  assert.equal(counts.normal, 1);
  assert.equal(counts.parking, 1);
  assert.equal(counts.event, 1);
  assert.equal(counts.photo, 1);
  assert.equal(scopeNormalizedFiles(items, "parking").length, 1);
  assert.equal(scopeNormalizedFiles(items, "photo")[0]?.category, "photo");
  assert.equal(showLocalCategorySectionInFilters("all"), true);
  assert.equal(showLocalCategorySectionInFilters("normal"), false);
  const dirty: LocalLibraryFilters = { ...EMPTY_FILTERS, categories: ["parking"] };
  assert.deepEqual(sanitizeLocalFiltersForCategoryScope(dirty, "event").categories, []);
  assert.deepEqual(sanitizeLocalFiltersForCategoryScope(dirty, "all").categories, ["parking"]);
});

test("categoryFromLocalName works without camera metadata", () => {
  assert.equal(categoryFromLocalName("PARK260723-075837F.MP4"), "parking");
  assert.equal(categoryFromLocalName("FILE260721-204110F.MP4"), "normal");
  assert.equal(categoryFromLocalName("EVNT260719-100000F.MP4"), "event");
  assert.equal(categoryFromLocalName("IMG260719-100000F.JPG", "image"), "photo");
  const orphan = normalizeLocalFile(file("PARK260723-075837F.MP4"));
  assert.equal(orphan.category, "parking");
  const counts = countLocalCategories([
    normalizeLocalFile(file("PARK260723-075837F.MP4")),
    normalizeLocalFile(file("FILE260721-204110F.MP4")),
    normalizeLocalFile(file("FILE260721-204200F.MP4")),
  ]);
  assert.equal(counts.all, 3);
  assert.equal(counts.parking, 1);
  assert.equal(counts.normal, 2);
  assert.equal(counts.event, 0);
});

test("videos and photos media type", () => {
  const items = [
    normalizeLocalFile(file("FILE260719-100000F.MP4"), new Map([["FILE260719-100000F.MP4", "normal"]])),
    normalizeLocalFile(file("SHOT260719-100000F.JPG")),
  ];
  const videos = filterNormalizedFiles(items, { ...EMPTY_FILTERS, mediaTypes: ["video"] });
  const photos = filterNormalizedFiles(items, { ...EMPTY_FILTERS, mediaTypes: ["photo" as never] });
  assert.equal(videos.length, 1);
  // invalid cast avoided — use image
  const photosOk = filterNormalizedFiles(items, { ...EMPTY_FILTERS, mediaTypes: ["image"] });
  assert.equal(photosOk.length, 1);
  assert.equal(photos.length, 0);
});

test("AND between category and media type groups", () => {
  const items = [
    normalizeLocalFile(file("PARK260719-100000F.MP4"), new Map([["PARK260719-100000F.MP4", "parking"]])),
    normalizeLocalFile(file("NORM260719-100000F.MP4"), new Map([["NORM260719-100000F.MP4", "normal"]])),
    normalizeLocalFile(file("SHOT260719-100000F.JPG")),
  ];
  const filters: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    categories: ["parking"],
    mediaTypes: ["video"],
  };
  const out = filterNormalizedFiles(items, filters);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.file.name, "PARK260719-100000F.MP4");
});

test("invalid or missing date excluded when date filter active", () => {
  const item = normalizeLocalFile(file("BROKEN.MP4"));
  assert.equal(
    fileMatchesFilters(item, { ...EMPTY_FILTERS, dateMode: "single", singleDay: "2026-07-19" }),
    false,
  );
  assert.equal(fileMatchesFilters(item, { ...EMPTY_FILTERS, dateMode: "single", singleDay: "bad" }), false);
});

test("active filter group count and chips", () => {
  const filters: LocalLibraryFilters = {
    dateMode: "range",
    rangeStart: "2026-07-19",
    rangeEnd: "2026-07-20",
    timeMode: "range",
    timeFrom: "13:00",
    timeTo: "18:00",
    categories: ["parking"],
    mediaTypes: ["image"],
  };
  assert.equal(countActiveFilterGroups(filters), 4);
  const chips = buildFilterChips(filters);
  assert.ok(chips.some((c) => c.group === "date"));
  assert.ok(chips.some((c) => c.label === "Parking"));
  const cleared = clearFilterGroup(filters, "cat-parking");
  assert.equal(cleared.categories.length, 0);
  assert.equal(countActiveFilterGroups(cleared), 3);
});

test("prune selection keeps only visible uris", () => {
  const selected = new Set(["a", "b", "c"]);
  assert.deepEqual([...pruneSelectionToUris(selected, ["a", "c"])].sort(), ["a", "c"]);
});

test("path traversal and external paths rejected", () => {
  const dir = "file:///docs/downloads";
  assert.equal(isManagedLocalMediaUri("file:///docs/downloads/FILE.MP4", dir), true);
  assert.equal(isManagedLocalMediaUri("file:///docs/downloads/../etc/passwd", dir), false);
  assert.equal(isManagedLocalMediaUri("file:///other/FILE.MP4", dir), false);
  assert.equal(isManagedLocalMediaUri("file:///docs/downloads/.thumbs/x.jpg", dir), false);
  assert.throws(() => assertManagedLocalMediaUri("file:///evil/x.MP4", dir));
});

test("batch delete sequential with partial failure and double-safe gate", async () => {
  const dir = "file:///docs/downloads";
  const uris = [
    "file:///docs/downloads/A.MP4",
    "file:///docs/downloads/../escape.MP4",
    "file:///docs/downloads/B.MP4",
  ];
  let calls = 0;
  const result = await deleteLocalFilesSequential(uris, dir, async () => {
    calls += 1;
  });
  assert.equal(result.deleted, 2);
  assert.equal(result.failed, 1);
  assert.equal(calls, 2);
});

test("filter pipeline handles thousands of files", () => {
  const items = [];
  for (let i = 0; i < 3000; i += 1) {
    const day = 10 + (i % 10);
    const hh = String(i % 24).padStart(2, "0");
    const name = `FILE2607${day}-${hh}0000F.MP4`;
    items.push(norm(name, i % 2 === 0 ? "parking" : "normal"));
  }
  const filters: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    dateMode: "range",
    rangeStart: "2026-07-12",
    rangeEnd: "2026-07-15",
    categories: ["parking"],
    mediaTypes: ["video"],
  };
  const t0 = Date.now();
  const out = filterNormalizedFiles(items, filters);
  const ms = Date.now() - t0;
  assert.ok(out.length > 0);
  assert.ok(ms < 500, `filter took ${ms}ms`);
});

test("sticky section counts reflect filtered results", () => {
  const items = [
    norm("FILE260719-100000F.MP4", "parking"),
    norm("FILE260719-110000F.MP4", "normal"),
    norm("FILE260720-100000F.MP4", "parking"),
  ];
  const filtered = filterNormalizedFiles(items, {
    ...EMPTY_FILTERS,
    categories: ["parking"],
  }).map((n) => n.file);
  const sections = buildLocalLibrarySections(filtered);
  assert.equal(sections.reduce((n, s) => n + s.count, 0), 2);
  assert.ok(sections.every((s) => s.count === s.data.length));
});

test("empty filtered state when library has files", () => {
  const items = [norm("FILE260719-100000F.MP4", "normal")];
  const out = filterNormalizedFiles(items, {
    ...EMPTY_FILTERS,
    categories: ["parking"],
  });
  assert.equal(out.length, 0);
  assert.ok(items.length > 0);
});

test("select all scope is filtered list only", () => {
  const items = [
    norm("FILE260719-100000F.MP4", "parking"),
    norm("FILE260719-110000F.MP4", "normal"),
  ];
  const filtered = filterNormalizedFiles(items, {
    ...EMPTY_FILTERS,
    categories: ["parking"],
  });
  const allUris = filtered.map((i) => i.file.uri);
  assert.equal(allUris.length, 1);
  assert.ok(!allUris.includes(items[1]!.file.uri));
});
