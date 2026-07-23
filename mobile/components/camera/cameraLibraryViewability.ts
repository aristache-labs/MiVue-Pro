/**
 * Collect remote file paths from SectionList viewability tokens.
 * Ignores section headers and non-file tokens.
 */
export function pathsFromViewableItems(
  viewableItems: ReadonlyArray<{ readonly item?: unknown }>,
): Set<string> {
  const next = new Set<string>();
  for (const token of viewableItems) {
    const item = token.item;
    if (!item || typeof item !== "object" || !("path" in item)) continue;
    const path = (item as { path: unknown }).path;
    if (typeof path === "string" && path.length > 0) next.add(path);
  }
  return next;
}

export function samePathSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const path of b) {
    if (!a.has(path)) return false;
  }
  return true;
}

/** SectionList virtualization — large enough window to avoid blank gaps, not full list. */
export const LIBRARY_LIST_VIRTUALIZATION = {
  initialNumToRender: 12,
  maxToRenderPerBatch: 20,
  updateCellsBatchingPeriod: 16,
  windowSize: 21,
} as const;

export const LIBRARY_THUMB_VIEWABILITY = {
  itemVisiblePercentThreshold: 1,
  minimumViewTime: 50,
} as const;
