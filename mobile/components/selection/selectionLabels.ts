/** Shared selection CTA / toolbar labels for Local + Library. */

export const SELECTION_TOOLBAR_ANIM_MS = 200;
export const SELECTION_TAB_ANIM_MS = 220;
export const SELECTION_TOOLBAR_H = 50;
/** @deprecated Prefer CONTEXTUAL_CTA_HEIGHT from contextualTabGeometry */
export { CONTEXTUAL_CTA_HEIGHT as SELECTION_CTA_H } from "@/components/selection/contextualTabGeometry";

export function selectedCountPhrase(count: number): string {
  return count === 1 ? "1 selected" : `${count} selected`;
}

/** Local bottom CTA — count lives here, not in the top toolbar. */
export function localDeleteCtaLabel(count: number, busy = false): string {
  if (busy) return "Deleting…";
  return `Delete · ${selectedCountPhrase(count)}`;
}

export function localDeleteCtaA11yLabel(count: number, busy = false): string {
  if (busy) return "Deleting selected items";
  if (count <= 0) return "Delete 0 selected items";
  return `Delete ${count} selected ${count === 1 ? "item" : "items"}`;
}

/**
 * Library bottom CTA.
 * Omit size when unknown / incomplete so we never show a misleading total.
 */
export function libraryDownloadCtaLabel(
  count: number,
  sizeLabel?: string | null,
  busy = false,
): string {
  if (busy) return "Adding to queue…";
  const base = `Download · ${selectedCountPhrase(count)}`;
  if (count <= 0) return base;
  if (sizeLabel && sizeLabel.length > 0 && sizeLabel !== "—") {
    return `${base} · ${sizeLabel}`;
  }
  return base;
}

export function libraryDownloadCtaA11yLabel(
  count: number,
  sizeLabel?: string | null,
  busy = false,
): string {
  if (busy) return "Adding selected recordings to download queue";
  if (count <= 0) return "Download 0 selected items";
  if (sizeLabel && sizeLabel.length > 0 && sizeLabel !== "—") {
    return `Download ${count} selected items, ${sizeLabel}`;
  }
  return `Download ${count} selected items`;
}

/**
 * Sum bytes only when every item has a known positive size.
 * Returns null when any size is missing/unknown.
 */
export function sumKnownSelectedBytes(
  items: readonly { readonly sizeBytes: number }[],
): number | null {
  if (items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    if (!Number.isFinite(item.sizeBytes) || item.sizeBytes <= 0) return null;
    total += item.sizeBytes;
  }
  return total;
}
