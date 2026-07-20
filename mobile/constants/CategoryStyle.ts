import type { FileCategory } from "../packages/parsers/src/index";
import { CATEGORY_COLORS, type ColorScheme } from "./Theme";

/** UI placeholders only — not camera thumbnails. */
export function categoryColor(category: FileCategory, scheme: ColorScheme): string {
  return CATEGORY_COLORS[category][scheme];
}

export const CATEGORY_LABEL: Record<FileCategory | "all", string> = {
  all: "All",
  normal: "Normal",
  event: "Event",
  parking: "Parking",
  photo: "Photo",
  unknown: "Other",
};

export const CATEGORY_ICON: Record<FileCategory | "all", string> = {
  all: "apps-outline",
  normal: "videocam-outline",
  event: "alert-circle-outline",
  parking: "car-outline",
  photo: "image-outline",
  unknown: "help-circle-outline",
};

/** Backwards-compatible static map (light scheme) for call sites not yet theme-aware. */
export const CATEGORY_COLOR: Record<FileCategory, string> = {
  normal: CATEGORY_COLORS.normal.light,
  event: CATEGORY_COLORS.event.light,
  parking: CATEGORY_COLORS.parking.light,
  photo: CATEGORY_COLORS.photo.light,
  unknown: CATEGORY_COLORS.unknown.light,
};
