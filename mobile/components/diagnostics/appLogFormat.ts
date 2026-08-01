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
  /** Stable identity for noisy events whose message contains changing values. */
  readonly groupKey?: string;
};

export type AppLogGroup = AppLogEntry & {
  readonly occurrenceCount: number;
  readonly firstTs: string;
  readonly lastTs: string;
  /** Raw events represented by this presentation group, newest first. */
  readonly entries: readonly AppLogEntry[];
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

function localDayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10) || value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function appLogGroupIdentity(entry: AppLogEntry): string {
  if (entry.groupKey?.trim()) return entry.groupKey.trim();
  if (entry.category !== "download") return `message:${entry.message}`;

  const rules: readonly [event: string, pattern: RegExp][] = [
    ["speed", /^speed\s+(.+?)\s+\d+(?:\.\d+)?\s+(?:B|KB|MB)\/s(?:\s|$)/iu],
    ["queued", /^queued\s+(.+?)\s+\(\d+\s+bytes\)$/iu],
    ["started", /^started\s+(.+)$/iu],
    ["interrupted", /^interrupted\s+(.+?)\s+@\s/iu],
    ["paused", /^paused\s+(.+?)\s+@\s/iu],
    ["completed", /^completed\s+(.+?)\s+\(\d+\s+bytes\)$/iu],
    ["failed", /^failed\s+(.+?):\s/iu],
    ["cancelled", /^cancelled\s+(.+)$/iu],
  ];
  for (const [event, pattern] of rules) {
    const match = pattern.exec(entry.message);
    if (match?.[1]) return `legacy-queue:${event}:${match[1]}`;
  }
  const removed = /^removed while\s+([^:]+):\s+(.+)$/iu.exec(entry.message);
  if (removed?.[1] && removed[2]) return `legacy-queue:removed:${removed[1]}:${removed[2]}`;
  return `message:${entry.message}`;
}

/**
 * Groups the timeline for presentation only. Raw entries remain available for
 * filtering and export. A group never crosses a local calendar day, severity,
 * or subsystem boundary.
 */
export function groupAppLogsByLocalDay(entries: readonly AppLogEntry[]): AppLogGroup[] {
  const groups = new Map<string, AppLogGroup>();

  for (const entry of entries) {
    const identity = appLogGroupIdentity(entry);
    const day = localDayKey(entry.ts);
    const key = `${day}\u0000${entry.level}\u0000${entry.category}\u0000${identity}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        ...entry,
        id: `group:${JSON.stringify([day, entry.level, entry.category, identity])}`,
        occurrenceCount: 1,
        firstTs: entry.ts,
        lastTs: entry.ts,
        entries: [entry],
      });
      continue;
    }

    const isLater = entry.ts > current.lastTs;
    groups.set(key, {
      ...(isLater ? entry : current),
      id: current.id,
      occurrenceCount: current.occurrenceCount + 1,
      firstTs: entry.ts < current.firstTs ? entry.ts : current.firstTs,
      lastTs: isLater ? entry.ts : current.lastTs,
      entries: [...current.entries, entry].sort((a, b) => b.ts.localeCompare(a.ts)),
    });
  }

  return [...groups.values()].sort((a, b) => b.lastTs.localeCompare(a.lastTs));
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
