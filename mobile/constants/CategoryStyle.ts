import type { FileCategory } from "../packages/parsers/src/index";

/** UI placeholders only — not camera thumbnails. */
export const CATEGORY_COLOR: Record<FileCategory, string> = {
  normal: "#1f4b3a",
  event: "#8b3a2a",
  parking: "#3a4a6b",
  photo: "#5a4a2a",
  unknown: "#555555",
};

export const CATEGORY_LABEL: Record<FileCategory | "all", string> = {
  all: "All",
  normal: "Normal",
  event: "Event",
  parking: "Parking",
  photo: "Photo",
  unknown: "Other",
};
