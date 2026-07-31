export type AppLogLevel = "info" | "warn" | "error";
export const APP_LOG_CATEGORIES = [
  "app",
  "load",
  "navigation",
  "ui",
  "connection",
  "download",
  "library",
  "playback",
  "storage",
  "settings",
  "background",
] as const;

export type AppLogCategory = (typeof APP_LOG_CATEGORIES)[number];

export type AppLogEntry = {
  readonly id: string;
  readonly ts: string;
  readonly level: AppLogLevel;
  readonly category: AppLogCategory;
  readonly message: string;
};

export const APP_LOG_MAX_ENTRIES = 500;

export function formatAppLogLine(entry: AppLogEntry): string {
  const time = entry.ts.slice(11, 19) || entry.ts;
  return `${time} [${entry.level}/${entry.category}] ${entry.message}`;
}

export function formatDownloadRateBps(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return "0 B/s";
  if (bps < 1024) return `${Math.round(bps)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
}

/** Pure ring append — newest first. */
export function appendToRing(
  current: readonly AppLogEntry[],
  entry: AppLogEntry,
  maxEntries: number = APP_LOG_MAX_ENTRIES,
): AppLogEntry[] {
  return [entry, ...current].slice(0, Math.max(1, maxEntries));
}

export type AppLogCategoryFilter = "all" | AppLogCategory;
export type AppLogLevelFilter = "all" | AppLogLevel;

export const APP_LOG_CATEGORY_FILTERS: readonly AppLogCategoryFilter[] = [
  "all",
  ...APP_LOG_CATEGORIES,
];

export const APP_LOG_LEVEL_FILTERS: readonly AppLogLevelFilter[] = [
  "all",
  "info",
  "warn",
  "error",
];

export function filterAppLogs(
  entries: readonly AppLogEntry[],
  opts: {
    readonly category?: AppLogCategoryFilter;
    readonly level?: AppLogLevelFilter;
    readonly query?: string;
  } = {},
): AppLogEntry[] {
  const category = opts.category ?? "all";
  const level = opts.level ?? "all";
  const query = opts.query?.trim().toLocaleLowerCase() ?? "";
  return entries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (level !== "all" && entry.level !== level) return false;
    if (
      query.length > 0 &&
      !entry.message.toLocaleLowerCase().includes(query) &&
      !entry.category.toLocaleLowerCase().includes(query) &&
      !entry.level.toLocaleLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });
}

export function isAppLogLevel(value: unknown): value is AppLogLevel {
  return value === "info" || value === "warn" || value === "error";
}

export function isAppLogCategory(value: unknown): value is AppLogCategory {
  return typeof value === "string" && APP_LOG_CATEGORIES.includes(value as AppLogCategory);
}

export function buildAppLogExportText(
  entries: readonly AppLogEntry[],
  opts: { readonly title?: string; readonly exportedAt?: string } = {},
): string {
  const title = opts.title ?? "Laneory developer logs";
  const exportedAt = opts.exportedAt ?? new Date().toISOString();
  const header = [`${title}`, `exportedAt=${exportedAt}`, `count=${entries.length}`, ""];
  const body = entries.map((entry) => `${entry.ts} [${entry.level}/${entry.category}] ${entry.message}`);
  return [...header, ...body].join("\n");
}
