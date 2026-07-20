/**
 * Pure helpers for Local Library date/time pickers (ISO internal, localized display).
 */

import { isValidDayKey, parseMinutesOfDay } from "@/components/local/localLibraryFilters";

const FALLBACK_DAY = "1970-01-01";
const FALLBACK_TIME = "12:00";

/** Parse YYYY-MM-DD as local calendar date (noon to avoid DST edge). */
export function dayKeyToDate(dayKey: string): Date {
  if (!isValidDayKey(dayKey)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  }
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

export function dateToDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Localized date for picker field buttons (device locale). */
export function formatDayDisplay(dayKey: string | undefined): string {
  if (!dayKey || !isValidDayKey(dayKey)) return "Choose date";
  return dayKeyToDate(dayKey).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function hhmmToDate(hhmm: string | undefined, baseDay = FALLBACK_DAY): Date {
  const mins = parseMinutesOfDay(hhmm) ?? parseMinutesOfDay(FALLBACK_TIME)!;
  const base = dayKeyToDate(isValidDayKey(baseDay) ? baseDay : FALLBACK_DAY);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
}

export function dateToHhmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Localized time for picker field buttons (device locale, minute precision). */
export function formatTimeDisplay(hhmm: string | undefined): string {
  if (!hhmm || parseMinutesOfDay(hhmm) === undefined) return "Choose time";
  return hhmmToDate(hhmm).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * After changing From (start), ensure To is not before From.
 * Inclusive range: equal dates are valid.
 */
export function clampRangeAfterStart(
  rangeStart: string,
  rangeEnd: string | undefined,
): { rangeStart: string; rangeEnd: string } {
  const start = isValidDayKey(rangeStart) ? rangeStart : dateToDayKey(new Date());
  const end = rangeEnd && isValidDayKey(rangeEnd) ? rangeEnd : start;
  return { rangeStart: start, rangeEnd: end < start ? start : end };
}

/**
 * After changing To (end), if end < start move start down (or keep end = start).
 * Prefer keeping the newly chosen end and bumping start only when invalid.
 */
export function clampRangeAfterEnd(
  rangeStart: string | undefined,
  rangeEnd: string,
): { rangeStart: string; rangeEnd: string } {
  const end = isValidDayKey(rangeEnd) ? rangeEnd : dateToDayKey(new Date());
  const start = rangeStart && isValidDayKey(rangeStart) ? rangeStart : end;
  return { rangeStart: start > end ? end : start, rangeEnd: end };
}

export type PickerField =
  | "singleDay"
  | "rangeStart"
  | "rangeEnd"
  | "singleTime"
  | "timeFrom"
  | "timeTo";

export function pickerA11yLabel(field: PickerField): string {
  switch (field) {
    case "singleDay":
      return "Choose date";
    case "rangeStart":
      return "Choose start date";
    case "rangeEnd":
      return "Choose end date";
    case "singleTime":
      return "Choose time";
    case "timeFrom":
      return "Choose start time";
    case "timeTo":
      return "Choose end time";
    default:
      return "Choose value";
  }
}
