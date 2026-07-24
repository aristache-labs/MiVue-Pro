import type { CameraLibrarySort } from "@/components/camera/cameraLibraryModel";

/** Long-press delay to enter selection (ms). */
export const LOCAL_LONG_PRESS_MS = 500;

/** Floating selection dock content height. */
export const LOCAL_SELECTION_DOCK_HEIGHT = 52;
/** Gap between dock and tab bar / safe area. */
export const LOCAL_SELECTION_DOCK_GAP = 8;

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
