export function localDeleteSelectionLabel(count: number): string {
  return count <= 0 ? "Delete local" : `Delete local · ${count}`;
}
