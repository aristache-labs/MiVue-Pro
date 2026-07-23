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
}

/** Minimal input for aggregation — works for local and remote files. */
export interface StorageSizedItem {
  readonly category: FileCategory;
  readonly sizeBytes: number;
}

function emptyBucket(): { count: number; bytes: number } {
  return { count: 0, bytes: 0 };
}

function safeBytes(sizeBytes: number): number {
  return Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0;
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

  for (const item of items) {
    const key = asCategoryKey(item.category);
    byKey[key].count += 1;
    byKey[key].bytes += safeBytes(item.sizeBytes);
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
  };
}

/** “1 file · 210 MB” / “0 files” when empty. */
export function formatStorageStatLine(count: number, bytes: number): string {
  const filesLabel = count === 1 ? "1 file" : `${count} files`;
  if (count === 0 || !Number.isFinite(bytes) || bytes <= 0) {
    return filesLabel;
  }
  return `${filesLabel} · ${formatMediaSizeMbGb(bytes)}`;
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
  const rows: StorageStatRow[] = [
    {
      key: "normal",
      title: "Normal",
      line: formatStorageStatLine(breakdown.normal.count, breakdown.normal.bytes),
    },
    {
      key: "parking",
      title: "Parking",
      line: formatStorageStatLine(breakdown.parking.count, breakdown.parking.bytes),
    },
    {
      key: "event",
      title: "Events",
      line: formatStorageStatLine(breakdown.event.count, breakdown.event.bytes),
    },
    {
      key: "photo",
      title: "Photos",
      line: formatStorageStatLine(breakdown.photo.count, breakdown.photo.bytes),
    },
  ];
  if (breakdown.unknown.count > 0) {
    rows.push({
      key: "unknown",
      title: "Other",
      line: formatStorageStatLine(breakdown.unknown.count, breakdown.unknown.bytes),
    });
  }
  return rows;
}
