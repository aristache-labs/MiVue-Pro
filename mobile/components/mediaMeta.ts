/** Parse Mio-style names like FILE260719-135021F.MP4. */
export function parseRecordedParts(
  name: string,
): { date: string; time: string; isoLocal: string } | undefined {
  const match = /^[A-Za-z]*(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/u.exec(name);
  if (!match) return undefined;
  const [, yy, mm, dd, hh, mi, ss] = match;
  const year = 2000 + Number(yy);
  return {
    date: `${dd}-${mm}-${year}`,
    time: `${hh}:${mi}:${ss}`,
    isoLocal: `${year}-${mm}-${dd} ${hh}:${mi}:${ss}`,
  };
}

/** @deprecated prefer parseRecordedParts */
export function parseRecordedAtFromName(name: string): string | undefined {
  return parseRecordedParts(name)?.isoLocal;
}

export function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Wall-clock time inside the clip: recording start (from filename) + playback offset. */
export function formatLiveClipTime(fileName: string, offsetSec: number): string {
  const parts = parseRecordedParts(fileName);
  if (!parts) return formatDuration(offsetSec);
  const [hh, mi, ss] = parts.time.split(":").map(Number);
  const total = (hh ?? 0) * 3600 + (mi ?? 0) * 60 + (ss ?? 0) + Math.max(0, Math.floor(offsetSec));
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Bytes/sec from average rate since start. */
export function transferRateBps(receivedBytes: number, startedAtMs: number): number | undefined {
  if (receivedBytes <= 0) return undefined;
  const elapsedSec = (Date.now() - startedAtMs) / 1000;
  if (elapsedSec < 0.5) return undefined;
  const rate = receivedBytes / elapsedSec;
  if (!Number.isFinite(rate) || rate < 1) return undefined;
  return rate;
}

export function formatTransferRate(bytesPerSec: number): string {
  const mib = bytesPerSec / (1024 * 1024);
  if (mib >= 0.1) return `${mib.toFixed(1)} MiB/s`;
  const kib = bytesPerSec / 1024;
  return `${kib.toFixed(0)} KiB/s`;
}

/** Remaining download time from average rate since start. */
export function formatEta(receivedBytes: number, totalBytes: number, startedAtMs: number): string | undefined {
  const rate = transferRateBps(receivedBytes, startedAtMs);
  if (rate === undefined || totalBytes <= 0) return undefined;
  const remainingSec = Math.ceil((totalBytes - receivedBytes) / rate);
  if (!Number.isFinite(remainingSec) || remainingSec < 0) return undefined;
  const h = Math.floor(remainingSec / 3600);
  const m = Math.floor((remainingSec % 3600) / 60);
  const s = remainingSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export interface RecordingMetaInput {
  readonly name: string;
  readonly sizeBytes?: number;
  readonly durationSeconds?: number;
}

/** Chips for date / time / size / length rows. */
export function recordingMetaChips(input: RecordingMetaInput): {
  icon: "calendar-outline" | "time-outline" | "server-outline" | "timer-outline";
  label: string;
}[] {
  const parts = parseRecordedParts(input.name);
  const chips: {
    icon: "calendar-outline" | "time-outline" | "server-outline" | "timer-outline";
    label: string;
  }[] = [];
  if (parts) {
    chips.push({ icon: "calendar-outline", label: parts.date });
    chips.push({ icon: "time-outline", label: parts.time });
  }
  if (input.sizeBytes !== undefined && input.sizeBytes > 0) {
    chips.push({ icon: "server-outline", label: formatBytesShort(input.sizeBytes) });
  }
  if (input.durationSeconds !== undefined && input.durationSeconds > 0) {
    chips.push({ icon: "timer-outline", label: formatDuration(input.durationSeconds) });
  }
  return chips;
}
