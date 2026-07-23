import type { LocalMediaFile } from "@/context/DemoModeContext";

/** Message when the installed binary cannot attach multiple files to one share sheet. */
export const MULTI_SHARE_UNSUPPORTED_MESSAGE =
  "Sharing multiple recordings requires a newer app build. Select one recording to share now.";

/**
 * expo-sharing (~14) exposes only shareAsync(uri) — no multi-URI API in the
 * current preview binary. An EAS Update cannot add native modules.
 */
export function supportsNativeMultiFileShare(): boolean {
  return false;
}

/** Complete Local library files only — not camera URLs or Queue partials. */
export function isShareEligibleLocalFile(file: LocalMediaFile): boolean {
  if (!file.uri || file.uri.length === 0) return false;
  if (file.sizeBytes <= 0) return false;
  if (/^https?:\/\//i.test(file.uri)) return false;
  if (/\.part(?:\.resume)?$/i.test(file.name) || /\.part(?:\.resume)?$/i.test(file.uri)) {
    return false;
  }
  if (/\/\.tmp\//i.test(file.uri) || /\.tmp$/i.test(file.name)) return false;
  return true;
}

export function filterShareEligibleLocalFiles(
  files: readonly LocalMediaFile[],
): LocalMediaFile[] {
  return files.filter(isShareEligibleLocalFile);
}

export function localShareActionLabel(count: number): string {
  return count <= 0 ? "Share" : `Share · ${count}`;
}

export function localShareA11yLabel(count: number): string {
  if (count <= 0) return "Share selected recordings";
  if (count === 1) return "Share 1 selected recording";
  return `Share ${count} selected recordings`;
}

export function localDeleteSelectionLabel(count: number): string {
  return count <= 0 ? "Delete local" : `Delete local · ${count}`;
}
