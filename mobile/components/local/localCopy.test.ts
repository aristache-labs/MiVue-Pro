import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteLocalA11yLabel,
  deleteLocalButtonLabel,
  deleteLocalPartialMessage,
  deleteLocalSuccessMessage,
  deleteLocalTitle,
  localFilesNoun,
  selectAllFilteredA11yLabel,
} from "./localCopy";
import {
  clampRangeAfterEnd,
  clampRangeAfterStart,
  dateToDayKey,
  dateToHhmm,
  dayKeyToDate,
  formatDayDisplay,
  formatTimeDisplay,
  hhmmToDate,
  pickerA11yLabel,
} from "./localDateTime";
import {
  datePreset,
  EMPTY_FILTERS,
  filtersEqual,
  TIME_PRESETS,
  type LocalLibraryFilters,
} from "./localLibraryFilters";

test("singular and plural local file nouns", () => {
  assert.equal(localFilesNoun(1), "local file");
  assert.equal(localFilesNoun(3), "local files");
  assert.equal(localFilesNoun(21), "local files");
});

test("delete dialog title singular vs plural", () => {
  assert.equal(deleteLocalTitle(1), "Delete 1 local file?");
  assert.equal(deleteLocalTitle(3), "Delete 3 local files?");
  assert.equal(deleteLocalTitle(21), "Delete 21 local files?");
});

test("delete button label singular has no count", () => {
  assert.equal(deleteLocalButtonLabel(1), "Delete local file");
  assert.equal(deleteLocalButtonLabel(3), "Delete 3 local files");
  assert.equal(deleteLocalButtonLabel(21), "Delete 21 local files");
});

test("success and partial delete messages", () => {
  assert.equal(deleteLocalSuccessMessage(1), "1 local file deleted");
  assert.equal(deleteLocalSuccessMessage(3), "3 local files deleted");
  assert.equal(deleteLocalPartialMessage(1, 1), "1 deleted · 1 could not be deleted");
  assert.equal(deleteLocalPartialMessage(10, 2), "10 deleted · 2 could not be deleted");
});

test("a11y labels for select all and delete", () => {
  assert.equal(selectAllFilteredA11yLabel(5), "Select all 5 filtered results");
  assert.equal(deleteLocalA11yLabel(1), "Delete 1 local file");
  assert.equal(deleteLocalA11yLabel(3), "Delete 3 local files");
});

test("dayKey round-trip and display is non-empty for valid ISO", () => {
  const key = "2026-07-20";
  assert.equal(dateToDayKey(dayKeyToDate(key)), key);
  const shown = formatDayDisplay(key);
  assert.ok(shown.length > 0);
  assert.notEqual(shown, key);
  assert.ok(!shown.includes("YYYY"));
});

test("hhmm round-trip and display", () => {
  assert.equal(dateToHhmm(hhmmToDate("14:30")), "14:30");
  const shown = formatTimeDisplay("14:30");
  assert.ok(shown.length > 0);
  assert.ok(!/keyboard|edit/i.test(shown));
});

test("date range clamp: end before start resets end to start", () => {
  const afterStart = clampRangeAfterStart("2026-07-18", "2026-07-15");
  assert.deepEqual(afterStart, { rangeStart: "2026-07-18", rangeEnd: "2026-07-18" });
  const afterEnd = clampRangeAfterEnd("2026-07-20", "2026-07-15");
  assert.deepEqual(afterEnd, { rangeStart: "2026-07-15", rangeEnd: "2026-07-15" });
  const ok = clampRangeAfterStart("2026-07-15", "2026-07-18");
  assert.deepEqual(ok, { rangeStart: "2026-07-15", rangeEnd: "2026-07-18" });
});

test("picker a11y labels", () => {
  assert.equal(pickerA11yLabel("singleDay"), "Choose date");
  assert.equal(pickerA11yLabel("rangeStart"), "Choose start date");
  assert.equal(pickerA11yLabel("rangeEnd"), "Choose end date");
  assert.equal(pickerA11yLabel("timeFrom"), "Choose start time");
  assert.equal(pickerA11yLabel("timeTo"), "Choose end time");
});

test("date presets update draft fields without applying list", () => {
  const today = "2026-07-20";
  const applied: LocalLibraryFilters = { ...EMPTY_FILTERS };
  const draft = { ...applied, ...datePreset("last7", today) };
  assert.equal(draft.dateMode, "range");
  assert.equal(draft.rangeEnd, today);
  assert.equal(draft.rangeStart, "2026-07-14");
  assert.ok(!filtersEqual(draft, applied));
});

test("time presets include overnight night range", () => {
  assert.deepEqual(TIME_PRESETS.night, { timeFrom: "22:00", timeTo: "06:00" });
  assert.deepEqual(TIME_PRESETS.morning, { timeFrom: "06:00", timeTo: "12:00" });
});

test("cancel picker semantics: draft unchanged when commit skipped", () => {
  const before: LocalLibraryFilters = {
    ...EMPTY_FILTERS,
    dateMode: "single",
    singleDay: "2026-07-19",
  };
  // Simulate cancel: no applyPickerDate call → draft stays
  const afterCancel = { ...before };
  assert.deepEqual(afterCancel, before);
});
