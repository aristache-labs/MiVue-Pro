import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";

export type QueueAction = "pause" | "resume" | "cancel" | "remove" | "retry";

export function isSidecarNmea(name: string): boolean {
  return /\.nmea$/i.test(name);
}

/** Visible queue rows (hide NMEA sidecars and completed transfers). */
export function filterVisibleQueueItems(items: readonly QueueItem[]): QueueItem[] {
  return items.filter((item) => !isSidecarNmea(item.localName) && item.status !== "completed");
}

/** Active / paused first, then waiting, then failed / cancelled. */
export function sortQueueForDisplay(items: readonly QueueItem[]): QueueItem[] {
  const rank = (status: QueueItemStatus): number => {
    if (status === "active") return 0;
    if (status === "paused") return 1;
    if (status === "queued") return 2;
    if (status === "failed") return 3;
    return 4;
  };
  return [...items].sort((a, b) => rank(a.status) - rank(b.status));
}

/**
 * Position among active + waiting items (1 = downloading/paused head).
 * Consecutive over the current visible order — no historical IDs.
 */
export function queueDisplayPosition(
  orderedVisible: readonly QueueItem[],
  itemId: string,
): number | undefined {
  const lane = orderedVisible.filter(
    (item) => item.status === "active" || item.status === "paused" || item.status === "queued",
  );
  const index = lane.findIndex((item) => item.id === itemId);
  return index < 0 ? undefined : index + 1;
}

export function actionsForStatus(status: QueueItemStatus): readonly QueueAction[] {
  switch (status) {
    case "active":
      return ["pause", "cancel"];
    case "paused":
      return ["resume", "cancel"];
    case "queued":
      return ["remove"];
    case "failed":
      return ["retry", "remove"];
    case "cancelled":
      return ["remove"];
    case "completed":
      return [];
    default:
      return [];
  }
}

export function isExpandedCard(status: QueueItemStatus): boolean {
  return status === "active" || status === "paused";
}

export function formatQueueSummary(items: readonly QueueItem[]): string {
  const downloading = items.filter((i) => i.status === "active").length;
  const paused = items.filter((i) => i.status === "paused").length;
  const waiting = items.filter((i) => i.status === "queued").length;
  const failed = items.filter((i) => i.status === "failed").length;

  if (items.length === 0) return "Queue is empty";

  const parts: string[] = [];
  if (downloading > 0) {
    parts.push(downloading === 1 ? "1 downloading" : `${downloading} downloading`);
  }
  if (paused > 0) {
    parts.push(paused === 1 ? "1 paused" : `${paused} paused`);
  }
  if (waiting > 0) {
    parts.push(waiting === 1 ? "1 waiting" : `${waiting} waiting`);
  }
  if (failed > 0 && parts.length === 0) {
    parts.push(failed === 1 ? "1 failed" : `${failed} failed`);
  }
  if (parts.length === 0) {
    const other = items.length;
    return other === 1 ? "1 item" : `${other} items`;
  }
  return parts.join(" · ");
}

export function formatSizeMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

/** Compact clip length: `3 min` / `1 min 5 sec`. */
export function formatDurationHuman(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s} sec`;
  if (s === 0) return m === 1 ? "1 min" : `${m} min`;
  return `${m} min ${s} sec`;
}

export function formatEtaRemaining(remainingSec: number): string {
  if (!Number.isFinite(remainingSec) || remainingSec < 0) return "";
  const total = Math.max(0, Math.ceil(remainingSec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s} sec remaining`;
  if (s === 0) return m === 1 ? "1 min remaining" : `${m} min remaining`;
  return `${m} min ${s} sec remaining`;
}

export function formatCompactDateTime(name: string, parseParts: (n: string) => { isoLocal: string; date: string; time: string } | undefined): string | undefined {
  const parts = parseParts(name);
  if (!parts) return undefined;
  const d = new Date(`${parts.isoLocal.replace(" ", "T")}`);
  if (!Number.isFinite(d.getTime())) {
    return `${parts.date} · ${parts.time.slice(0, 5)}`;
  }
  const date = d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date} · ${parts.time.slice(0, 5)}`;
}

/** EMA helper to damp speed/ETA flicker. */
export function smoothRate(previous: number, instant: number, alpha = 0.25): number {
  if (!Number.isFinite(instant) || instant <= 0) return previous;
  if (!Number.isFinite(previous) || previous <= 0) return instant;
  return previous * (1 - alpha) + instant * alpha;
}
