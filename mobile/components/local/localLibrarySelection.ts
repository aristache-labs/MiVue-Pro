import type { CameraLibrarySort } from "@/components/camera/cameraLibraryModel";

/** Long-press delay to enter selection (ms). */
export const LOCAL_LONG_PRESS_MS = 500;

/** Expands compact Sort control to ≥44×44 without inflating separator height. */
export const LOCAL_SECTION_SORT_HIT_SLOP = {
  top: 14,
  bottom: 14,
  left: 10,
  right: 10,
} as const;

/** @deprecated Prefer SELECTION_TOOLBAR_ANIM_MS from selectionLabels */
export { SELECTION_TOOLBAR_ANIM_MS as LOCAL_SELECTION_CONTEXT_ANIM_MS } from "@/components/selection/selectionLabels";

export type SelectAllCheckState = "unchecked" | "indeterminate" | "checked";

export function selectAllCheckState(
  selectedCount: number,
  filteredCount: number,
): SelectAllCheckState {
  if (filteredCount <= 0 || selectedCount <= 0) return "unchecked";
  if (selectedCount >= filteredCount) return "checked";
  return "indeterminate";
}

export function localSelectedCountLabel(count: number): string {
  return count === 1 ? "1 selected" : `${count} selected`;
}

export function localSortBarLabel(sort: CameraLibrarySort): string {
  switch (sort) {
    case "newest":
      return "Newest";
    case "oldest":
      return "Oldest";
    case "largest":
      return "Largest";
    case "smallest":
      return "Smallest";
    case "longest":
      return "Longest";
    case "shortest":
      return "Shortest";
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

export function localSelectionModeAnnouncement(count: number): string {
  const item = count === 1 ? "1 item selected" : `${count} items selected`;
  return `Selection mode. ${item}`;
}
