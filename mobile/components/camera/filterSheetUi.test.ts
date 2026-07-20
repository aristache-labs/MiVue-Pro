import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  cameraFilterDraftIssue,
  EMPTY_CAMERA_FILTERS,
  showCategorySectionInFilters,
} from "./cameraLibraryModel";

test("Size and Duration sections are removed from Filters UI", () => {
  const src = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  assert.equal(src.includes(">Duration<"), false);
  assert.equal(src.includes(">Size<"), false);
  assert.equal(src.includes("Under 1 min"), false);
  assert.equal(src.includes("Under 100 MB"), false);
  assert.equal(src.includes("showDurationSectionInFilters"), false);
});

test("Time presets Morning Afternoon Evening Night are removed", () => {
  const src = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  assert.equal(src.includes("TIME_PRESETS"), false);
  assert.equal(src.includes("Morning"), false);
  assert.equal(src.includes("Afternoon"), false);
  assert.equal(src.includes("Evening"), false);
  assert.equal(src.includes('"Night"'), false);
  assert.match(src, /Single time/);
  assert.match(src, /Time range/);
  assert.match(src, /label="Any"/);
});

test("Single time and Time range show native picker fields", () => {
  const src = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  assert.match(src, /draft\.timeMode === "single"/);
  assert.match(src, /draft\.timeMode === "range"/);
  assert.match(src, /openPicker\("singleTime"\)/);
  assert.match(src, /openPicker\("timeFrom"\)/);
  assert.match(src, /openPicker\("timeTo"\)/);
  assert.match(src, /DateTimePicker/);
});

test("Category appears only for All scope", () => {
  assert.equal(showCategorySectionInFilters("all"), true);
  assert.equal(showCategorySectionInFilters("normal"), false);
  assert.equal(showCategorySectionInFilters("photo"), false);
  const src = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  assert.match(src, /showCategory/);
  assert.match(src, /Download state/);
});

test("header is Reset / Filters / X without Close text", () => {
  const src = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  assert.match(src, /Reset filters/);
  assert.match(src, /Close filters/);
  assert.match(src, /name="close"/);
  assert.equal(src.includes(">Close<"), false);
  assert.match(src, /sheetTitle/);
  assert.match(src, /headerSide/);
});

test("Reset only changes draft; Show X results applies", () => {
  const src = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  assert.match(src, /setDraft\(EMPTY_CAMERA_FILTERS\)/);
  assert.match(src, /Show \{draftCount\} results/);
  assert.match(src, /onApply\(/);
  assert.match(src, /requestClose\(\)/);
  assert.equal(isCameraFiltersEmptySafe(), true);
});

function isCameraFiltersEmptySafe(): boolean {
  // Reset target is empty filters
  return (
    EMPTY_CAMERA_FILTERS.dateMode === "any" &&
    EMPTY_CAMERA_FILTERS.timeMode === "any" &&
    EMPTY_CAMERA_FILTERS.downloaded === "any"
  );
}

test("draft validation for incomplete time/date", () => {
  assert.equal(cameraFilterDraftIssue(EMPTY_CAMERA_FILTERS), undefined);
  assert.match(
    cameraFilterDraftIssue({ ...EMPTY_CAMERA_FILTERS, timeMode: "single" }) ?? "",
    /time/i,
  );
  assert.match(
    cameraFilterDraftIssue({
      ...EMPTY_CAMERA_FILTERS,
      timeMode: "range",
      timeFrom: "22:00",
    }) ?? "",
    /From and To/i,
  );
  assert.equal(
    cameraFilterDraftIssue({
      ...EMPTY_CAMERA_FILTERS,
      timeMode: "range",
      timeFrom: "22:00",
      timeTo: "03:00",
    }),
    undefined,
  );
});

test("Filters and media details share StaticBackdropSheet", () => {
  const filter = readFileSync(join(__dirname, "CameraFilterSheet.tsx"), "utf8");
  const detail = readFileSync(join(__dirname, "RemoteDetailSheet.tsx"), "utf8");
  const shell = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");
  assert.match(filter, /StaticBackdropSheet/);
  assert.match(detail, /StaticBackdropSheet/);
  assert.match(shell, /animationType="none"/);
  assert.match(shell, /MEDIA_SCRIM_COLOR/);
  assert.match(shell, /translateY/);
  assert.equal(shell.includes("opacity:"), false);
  assert.match(shell, /isReduceMotionEnabled/);
  assert.equal(filter.includes('animationType="slide"'), false);
  assert.equal(detail.includes('animationType="slide"'), false);
});

test("backdrop is sibling of sheet host — not nested inside animated tree as only child wrapper for both", () => {
  const shell = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");
  assert.match(shell, /styles\.scrim/);
  assert.match(shell, /styles\.sheetHost/);
  assert.match(shell, /absoluteFillObject/);
  // Scrim style must not include transform
  const scrimBlock = shell.slice(shell.indexOf("scrim:"), shell.indexOf("sheetHost:"));
  assert.equal(scrimBlock.includes("transform"), false);
  assert.equal(scrimBlock.includes("translateY"), false);
});
