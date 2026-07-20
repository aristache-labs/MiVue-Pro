/** Centralized Local Library copy — singular/plural for delete flows. */

export function localFilesNoun(count: number): string {
  return count === 1 ? "local file" : "local files";
}

export function deleteLocalTitle(count: number): string {
  return `Delete ${count} ${localFilesNoun(count)}?`;
}

/** Confirm button label: singular has no count; plural includes N. */
export function deleteLocalButtonLabel(count: number): string {
  return count === 1 ? "Delete local file" : `Delete ${count} local files`;
}

export function deleteLocalSuccessMessage(deleted: number): string {
  return `${deleted} ${localFilesNoun(deleted)} deleted`;
}

export function deleteLocalPartialMessage(deleted: number, failed: number): string {
  return `${deleted} deleted · ${failed} could not be deleted`;
}

export function deleteLocalA11yLabel(count: number): string {
  return `Delete ${count} ${localFilesNoun(count)}`;
}

export function selectAllFilteredA11yLabel(count: number): string {
  return `Select all ${count} filtered results`;
}
