type ViewableToken = {
  readonly item?: unknown;
  readonly section?: { readonly key?: string } | null;
};

function remotePathFromTokenItem(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  if ("path" in item && typeof (item as { path: unknown }).path === "string") {
    const path = (item as { path: string }).path;
    return path.length > 0 ? path : undefined;
  }
  if (
    "file" in item &&
    (item as { file?: unknown }).file &&
    typeof (item as { file: unknown }).file === "object" &&
    "path" in ((item as { file: { path?: unknown } }).file) &&
    typeof (item as { file: { path: unknown } }).file.path === "string"
  ) {
    const path = (item as { file: { path: string } }).file.path;
    return path.length > 0 ? path : undefined;
  }
  return undefined;
}

function sectionKeyFromTokenItem(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  if ("sectionKey" in item && typeof (item as { sectionKey: unknown }).sectionKey === "string") {
    const key = (item as { sectionKey: string }).sectionKey;
    return key.length > 0 ? key : undefined;
  }
  return undefined;
}

/**
 * Collect remote file paths from list viewability tokens.
 * Supports SectionList RemoteFile items and FlatList CameraLibraryFileRow items.
 */
export function pathsFromViewableItems(
  viewableItems: ReadonlyArray<ViewableToken>,
): Set<string> {
  const next = new Set<string>();
  for (const token of viewableItems) {
    const path = remotePathFromTokenItem(token.item);
    if (path) next.add(path);
  }
  return next;
}

/**
 * Section key for the sticky overlay — first viewable file wins.
 * Returns undefined when the viewport has no file tokens (keep previous key).
 */
export function stickySectionKeyFromViewableItems(
  viewableItems: ReadonlyArray<ViewableToken>,
): string | undefined {
  for (const token of viewableItems) {
    const fromRow = sectionKeyFromTokenItem(token.item);
    if (fromRow) return fromRow;
    const path = remotePathFromTokenItem(token.item);
    if (path) {
      const fromSection = token.section?.key;
      if (typeof fromSection === "string" && fromSection.length > 0) return fromSection;
    }
  }
  return undefined;
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
