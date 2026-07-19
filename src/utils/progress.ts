import type { DownloadProgress } from "../transport/downloadTransport.js";

export interface ProgressSnapshot {
  readonly percent?: number;
  readonly bytesPerSecond: number;
  readonly etaSeconds?: number;
}

export function calculateProgress(progress: DownloadProgress): ProgressSnapshot {
  const percent = progress.totalBytes === undefined || progress.totalBytes === 0
    ? undefined
    : Math.min(100, (progress.bytesReceived / progress.totalBytes) * 100);
  const remaining = progress.totalBytes === undefined ? undefined : Math.max(0, progress.totalBytes - progress.bytesReceived);
  const etaSeconds = remaining === undefined || progress.bytesPerSecond <= 0
    ? undefined
    : remaining / progress.bytesPerSecond;
  return {
    ...(percent === undefined ? {} : { percent }),
    bytesPerSecond: progress.bytesPerSecond,
    ...(etaSeconds === undefined ? {} : { etaSeconds }),
  };
}

export class ProgressReporter {
  private lastRenderAt = 0;
  private lastBucket = -1;

  update(progress: DownloadProgress): void {
    const now = Date.now();
    const snapshot = calculateProgress(progress);
    const bucket = snapshot.percent === undefined ? -1 : Math.floor(snapshot.percent / 10);
    const interactive = process.stderr.isTTY === true;
    if (interactive && now - this.lastRenderAt < 200) return;
    if (!interactive && bucket === this.lastBucket && now - this.lastRenderAt < 2_000) return;
    this.lastRenderAt = now;
    this.lastBucket = bucket;

    const percent = snapshot.percent === undefined ? "  ?.?%" : `${snapshot.percent.toFixed(1).padStart(5)}%`;
    const eta = snapshot.etaSeconds === undefined ? "ETA --" : `ETA ${formatDuration(snapshot.etaSeconds)}`;
    const line = `${percent}  ${formatBytes(progress.bytesReceived)} / ${progress.totalBytes === undefined ? "?" : formatBytes(progress.totalBytes)}  ${formatBytes(snapshot.bytesPerSecond)}/s  ${eta}`;
    process.stderr.write(interactive ? `\r${line.padEnd(90)}` : `${line}\n`);
  }

  finish(): void {
    if (process.stderr.isTTY === true) process.stderr.write("\n");
  }
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes;
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "--";
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return minutes > 0 ? `${minutes}m${String(remainder).padStart(2, "0")}s` : `${remainder}s`;
}
