import AsyncStorage from "@react-native-async-storage/async-storage";

import { sanitizeDiagnosticLine } from "@/components/camera/cameraLibraryModel";
import { internalToolsEnabled } from "@/components/environment/resolveInternalTools";
import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";

import {
  APP_LOG_MAX_ENTRIES,
  appendToRing,
  formatDownloadRateBps,
  type AppLogCategory,
  type AppLogEntry,
  type AppLogLevel,
} from "./appLogFormat";

export type { AppLogCategory, AppLogEntry, AppLogLevel } from "./appLogFormat";
export {
  APP_LOG_MAX_ENTRIES,
  appendToRing,
  formatAppLogLine,
  formatDownloadRateBps,
} from "./appLogFormat";

export type QueueLogSnapshot = {
  readonly status: QueueItemStatus;
  readonly bytesReceived: number;
  readonly localName: string;
  readonly lastRateAtMs: number;
  readonly lastRateBytes: number;
};

const STORAGE_KEY = "@laneory/app_logs_v1";
/** Throttle download speed samples so progress ticks do not flood the ring. */
const DOWNLOAD_RATE_MIN_INTERVAL_MS = 2_500;

let entries: AppLogEntry[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | undefined;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function schedulePersist(): void {
  if (persistTimer !== undefined) return;
  persistTimer = setTimeout(() => {
    persistTimer = undefined;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => undefined);
  }, 400);
}

function makeEntry(
  level: AppLogLevel,
  category: AppLogCategory,
  message: string,
  now: Date = new Date(),
): AppLogEntry {
  seq += 1;
  return {
    id: `${now.getTime()}-${seq}`,
    ts: now.toISOString(),
    level,
    category,
    message: sanitizeDiagnosticLine(message),
  };
}

export function getAppLogs(): readonly AppLogEntry[] {
  return entries;
}

export function subscribeAppLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function hydrateAppLogs(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          entries = parsed
            .filter((row): row is AppLogEntry => {
              if (!row || typeof row !== "object") return false;
              const r = row as Record<string, unknown>;
              return (
                typeof r.id === "string" &&
                typeof r.ts === "string" &&
                typeof r.level === "string" &&
                typeof r.category === "string" &&
                typeof r.message === "string"
              );
            })
            .slice(0, APP_LOG_MAX_ENTRIES);
        }
      }
    } catch {
      entries = [];
    } finally {
      hydrated = true;
      hydratePromise = undefined;
      notify();
    }
  })();
  return hydratePromise;
}

export function appendAppLog(
  level: AppLogLevel,
  category: AppLogCategory,
  message: string,
): void {
  if (!internalToolsEnabled()) return;
  const entry = makeEntry(level, category, message);
  entries = appendToRing(entries, entry);
  notify();
  schedulePersist();
}

export const appLog = {
  info(category: AppLogCategory, message: string): void {
    appendAppLog("info", category, message);
  },
  warn(category: AppLogCategory, message: string): void {
    appendAppLog("warn", category, message);
  },
  error(category: AppLogCategory, message: string): void {
    appendAppLog("error", category, message);
  },
};

export async function clearAppLogs(): Promise<void> {
  entries = [];
  notify();
  if (persistTimer !== undefined) {
    clearTimeout(persistTimer);
    persistTimer = undefined;
  }
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}

/**
 * Diff queue snapshots and emit download / interrupt / rate / failure logs.
 * Returns the next snapshot map for the caller to keep in a ref.
 */
export function observeQueueForAppLogs(
  prev: ReadonlyMap<string, QueueLogSnapshot>,
  items: readonly QueueItem[],
  nowMs: number = Date.now(),
): Map<string, QueueLogSnapshot> {
  if (!internalToolsEnabled()) {
    return new Map(
      items.map((item) => [
        item.id,
        {
          status: item.status,
          bytesReceived: item.bytesReceived ?? 0,
          localName: item.localName,
          lastRateAtMs: nowMs,
          lastRateBytes: item.bytesReceived ?? 0,
        } satisfies QueueLogSnapshot,
      ]),
    );
  }

  const next = new Map<string, QueueLogSnapshot>();
  const seen = new Set<string>();

  for (const item of items) {
    seen.add(item.id);
    const bytes = item.bytesReceived ?? 0;
    const prior = prev.get(item.id);
    let lastRateAtMs = prior?.lastRateAtMs ?? nowMs;
    let lastRateBytes = prior?.lastRateBytes ?? bytes;

    if (!prior) {
      if (item.status === "queued" || item.status === "active") {
        appLog.info("download", `queued ${item.localName} (${item.expectedBytes} bytes)`);
      }
    } else if (prior.status !== item.status) {
      switch (item.status) {
        case "active":
          appLog.info("download", `started ${item.localName}`);
          lastRateAtMs = nowMs;
          lastRateBytes = bytes;
          break;
        case "waiting_for_connection":
          appLog.warn(
            "download",
            `interrupted ${item.localName} @ ${bytes}/${item.expectedBytes} bytes (waiting for connection)`,
          );
          break;
        case "paused":
          appLog.info("download", `paused ${item.localName} @ ${bytes} bytes`);
          break;
        case "completed":
          appLog.info("download", `completed ${item.localName} (${bytes} bytes)`);
          break;
        case "failed":
          appLog.error(
            "download",
            `failed ${item.localName}: ${item.errorMessage ?? "unknown error"}`,
          );
          break;
        case "cancelled":
          appLog.info("download", `cancelled ${item.localName}`);
          break;
        default:
          break;
      }
    } else if (item.status === "active" && bytes > lastRateBytes) {
      const elapsed = nowMs - lastRateAtMs;
      if (elapsed >= DOWNLOAD_RATE_MIN_INTERVAL_MS) {
        const bps = ((bytes - lastRateBytes) * 1000) / elapsed;
        const pct =
          item.expectedBytes > 0
            ? Math.min(100, Math.round((bytes / item.expectedBytes) * 100))
            : undefined;
        appLog.info(
          "download",
          `speed ${item.localName} ${formatDownloadRateBps(bps)}${
            pct !== undefined ? ` (${pct}%, ${bytes}/${item.expectedBytes})` : ` (${bytes} bytes)`
          }`,
        );
        lastRateAtMs = nowMs;
        lastRateBytes = bytes;
      }
    }

    next.set(item.id, {
      status: item.status,
      bytesReceived: bytes,
      localName: item.localName,
      lastRateAtMs,
      lastRateBytes,
    });
  }

  for (const [id, prior] of prev) {
    if (seen.has(id)) continue;
    if (prior.status === "active" || prior.status === "waiting_for_connection") {
      appLog.warn("download", `removed while ${prior.status}: ${prior.localName}`);
    }
  }

  return next;
}
