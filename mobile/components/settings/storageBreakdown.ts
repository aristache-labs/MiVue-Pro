import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import type { FileCategory } from "@/packages/parsers/src/index";

export type StorageCategoryKey = "normal" | "parking" | "event" | "photo" | "unknown";

export interface StorageBucket {
  readonly count: number;
  readonly bytes: number;
}

export interface StorageBreakdown {
  readonly total: StorageBucket;
  readonly normal: StorageBucket;
  readonly parking: StorageBucket;
  readonly event: StorageBucket;
  readonly photo: StorageBucket;
  readonly unknown: StorageBucket;
  /** False when any item had a non-finite or negative size (omit precise byte totals in UI). */
  readonly allSizesKnown: boolean;
}

/** Minimal input for aggregation — works for local and remote files. */
export interface StorageSizedItem {
  readonly category: FileCategory;
  readonly sizeBytes: number;
  /** Optional stable id (e.g. remote path) for deduplication. */
  readonly id?: string;
}

function emptyBucket(): { count: number; bytes: number } {
  return { count: 0, bytes: 0 };
}

function asCategoryKey(category: FileCategory): StorageCategoryKey {
  switch (category) {
    case "normal":
    case "parking":
    case "event":
    case "photo":
    case "unknown":
      return category;
    default:
      return "unknown";
  }
}

/** Pure aggregation of file counts and sizes by category. No I/O. */
export function aggregateStorageBreakdown(
  items: readonly StorageSizedItem[],
): StorageBreakdown {
  const normal = emptyBucket();
  const parking = emptyBucket();
  const event = emptyBucket();
  const photo = emptyBucket();
  const unknown = emptyBucket();
  const byKey: Record<StorageCategoryKey, { count: number; bytes: number }> = {
    normal,
    parking,
    event,
    photo,
    unknown,
  };
  const seen = new Set<string>();
  let allSizesKnown = true;

  for (const item of items) {
    const id = item.id?.trim();
    if (id !== undefined && id.length > 0) {
      if (seen.has(id)) continue;
      seen.add(id);
    }

    if (!Number.isFinite(item.sizeBytes) || item.sizeBytes < 0) {
      allSizesKnown = false;
    }
    const bytes =
      Number.isFinite(item.sizeBytes) && item.sizeBytes > 0 ? item.sizeBytes : 0;

    const key = asCategoryKey(item.category);
    byKey[key].count += 1;
    byKey[key].bytes += bytes;
  }

  const total = {
    count: normal.count + parking.count + event.count + photo.count + unknown.count,
    bytes: normal.bytes + parking.bytes + event.bytes + photo.bytes + unknown.bytes,
  };

  return {
    total,
    normal,
    parking,
    event,
    photo,
    unknown,
    allSizesKnown,
  };
}

/** “1 file · 210 MB” / “0 files” when empty. Omits size when totals are not fully known. */
export function formatStorageStatLine(
  count: number,
  bytes: number,
  options?: { readonly allSizesKnown?: boolean },
): string {
  const filesLabel = count === 1 ? "1 file" : `${count} files`;
  const sizesOk = options?.allSizesKnown !== false;
  if (!sizesOk || count === 0 || !Number.isFinite(bytes) || bytes <= 0) {
    return filesLabel;
  }
  return `${filesLabel} · ${formatMediaSizeMbGb(bytes)}`;
}

/** Spoken summary for Camera SD card listed files (not card capacity). */
export function formatCameraListedFilesAccessibility(
  count: number,
  bytes: number,
  options?: { readonly allSizesKnown?: boolean },
): string {
  const filesLabel = count === 1 ? "1 camera file" : `${count} camera files`;
  const sizesOk = options?.allSizesKnown !== false;
  if (!sizesOk || count === 0 || !Number.isFinite(bytes) || bytes <= 0) {
    return `${filesLabel} listed`;
  }
  const compact = formatMediaSizeMbGb(bytes);
  const spoken = compact
    .replace(/\sGB$/i, " gigabytes")
    .replace(/\sMB$/i, " megabytes");
  return `${filesLabel}, ${spoken} listed`;
}

export type StorageStatRow = {
  readonly key: StorageCategoryKey;
  readonly title: string;
  readonly line: string;
};

/**
 * Category rows for Settings storage UI (no Total — that belongs in the section summary).
 * Other only when unknown > 0.
 */
export function storageBreakdownRows(breakdown: StorageBreakdown): readonly StorageStatRow[] {
  const sizeOpts = { allSizesKnown: breakdown.allSizesKnown };
  const rows: StorageStatRow[] = [
    {
      key: "normal",
      title: "Normal",
      line: formatStorageStatLine(breakdown.normal.count, breakdown.normal.bytes, sizeOpts),
    },
    {
      key: "parking",
      title: "Parking",
      line: formatStorageStatLine(breakdown.parking.count, breakdown.parking.bytes, sizeOpts),
    },
    {
      key: "event",
      title: "Events",
      line: formatStorageStatLine(breakdown.event.count, breakdown.event.bytes, sizeOpts),
    },
    {
      key: "photo",
      title: "Photos",
      line: formatStorageStatLine(breakdown.photo.count, breakdown.photo.bytes, sizeOpts),
    },
  ];
  if (breakdown.unknown.count > 0) {
    rows.push({
      key: "unknown",
      title: "Other",
      line: formatStorageStatLine(breakdown.unknown.count, breakdown.unknown.bytes, sizeOpts),
    });
  }
  return rows;
}
