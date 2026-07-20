import type { GpsSample } from "@/packages/parsers/src/index";

/**
 * Maximum |videoTime − sampleTime| (seconds) to treat GPS as synchronized.
 * Beyond this, UI shows "GPS out of range" (before first / after last / sparse gap).
 */
export const GPS_VIDEO_SYNC_TOLERANCE_SEC = 2;

export type GpsSyncStatus =
  | "waiting"
  | "unavailable"
  | "partial"
  | "synchronized"
  | "out_of_range";

export interface NormalizedGpsTrack {
  readonly samples: readonly GpsSample[];
  /** Epoch ms parallel to `samples`, ascending. */
  readonly timesMs: readonly number[];
  readonly startMs: number;
  /** True when coverage looks incomplete relative to clip length (if known). */
  readonly partial: boolean;
}

export interface GpsLookupResult {
  readonly status: Exclude<GpsSyncStatus, "waiting">;
  readonly index: number;
  readonly sample: GpsSample | undefined;
  /** |target − nearest| in seconds. */
  readonly deltaSec: number;
}

function isValidSample(sample: GpsSample): boolean {
  const t = Date.parse(sample.recordedAt);
  if (!Number.isFinite(t)) return false;
  if (!Number.isFinite(sample.latitude) || !Number.isFinite(sample.longitude)) return false;
  if (Math.abs(sample.latitude) > 90 || Math.abs(sample.longitude) > 180) return false;
  if (sample.latitude === 0 && sample.longitude === 0) return false;
  if (!Number.isFinite(sample.speedKmh)) return false;
  if (sample.altitudeMeters !== undefined) {
    if (!Number.isFinite(sample.altitudeMeters)) return false;
  }
  return true;
}

/**
 * Filter invalid points, sort by time once. Optional `clipDurationSec` marks sparse tracks partial.
 */
export function normalizeGpsTrack(
  raw: readonly GpsSample[],
  clipDurationSec?: number,
): NormalizedGpsTrack {
  const pairs: { sample: GpsSample; t: number }[] = [];
  for (const sample of raw) {
    if (!isValidSample(sample)) continue;
    pairs.push({ sample, t: Date.parse(sample.recordedAt) });
  }
  pairs.sort((a, b) => a.t - b.t);

  // Deduplicate identical timestamps (keep first).
  const samples: GpsSample[] = [];
  const timesMs: number[] = [];
  for (const p of pairs) {
    if (timesMs.length > 0 && timesMs[timesMs.length - 1] === p.t) continue;
    samples.push(p.sample);
    timesMs.push(p.t);
  }

  const startMs = timesMs[0] ?? 0;
  let partial = false;
  if (samples.length > 0 && samples.length < 3) {
    partial = true;
  } else if (
    samples.length > 0 &&
    clipDurationSec !== undefined &&
    Number.isFinite(clipDurationSec) &&
    clipDurationSec > 5
  ) {
    const spanSec = (timesMs[timesMs.length - 1]! - startMs) / 1000;
    if (spanSec < clipDurationSec * 0.5) partial = true;
  }

  return { samples, timesMs, startMs, partial };
}

/** Binary search nearest timestamp index (timesMs must be sorted ascending). */
export function nearestTimeIndex(timesMs: readonly number[], targetMs: number): number {
  const n = timesMs.length;
  if (n === 0) return 0;
  if (targetMs <= timesMs[0]!) return 0;
  if (targetMs >= timesMs[n - 1]!) return n - 1;

  let lo = 0;
  let hi = n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = timesMs[mid]!;
    if (t === targetMs) return mid;
    if (t < targetMs) lo = mid + 1;
    else hi = mid - 1;
  }
  // lo is insertion point; compare lo and lo-1
  const a = Math.max(0, lo - 1);
  const b = Math.min(n - 1, lo);
  return Math.abs(timesMs[a]! - targetMs) <= Math.abs(timesMs[b]! - targetMs) ? a : b;
}

export function lookupGpsAtVideoTime(
  track: NormalizedGpsTrack,
  videoTimeSec: number,
  toleranceSec: number = GPS_VIDEO_SYNC_TOLERANCE_SEC,
): GpsLookupResult {
  if (track.samples.length === 0) {
    return { status: "unavailable", index: -1, sample: undefined, deltaSec: Number.POSITIVE_INFINITY };
  }

  const safeT = Number.isFinite(videoTimeSec) ? Math.max(0, videoTimeSec) : 0;
  const targetMs = track.startMs + safeT * 1000;
  const index = nearestTimeIndex(track.timesMs, targetMs);
  const nearestMs = track.timesMs[index]!;
  const deltaSec = Math.abs(nearestMs - targetMs) / 1000;
  const sample = track.samples[index];

  const first = track.timesMs[0]!;
  const last = track.timesMs[track.timesMs.length - 1]!;
  const tolMs = toleranceSec * 1000;

  if (targetMs < first - tolMs || targetMs > last + tolMs || deltaSec > toleranceSec) {
    return {
      status: "out_of_range",
      index,
      sample,
      deltaSec,
    };
  }

  if (track.partial) {
    return { status: "partial", index, sample, deltaSec };
  }

  return { status: "synchronized", index, sample, deltaSec };
}

/**
 * Back-compat helper: linear-friendly API that normalizes then binary-searches.
 * Prefer `normalizeGpsTrack` + `lookupGpsAtVideoTime` in hot paths.
 */
export function sampleIndexAtTime(samples: readonly GpsSample[], currentTimeSec: number): number {
  const track = normalizeGpsTrack(samples);
  if (track.samples.length === 0) return 0;
  return lookupGpsAtVideoTime(track, currentTimeSec).index;
}

export function gpsStatusLabel(status: GpsSyncStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting for GPS data";
    case "unavailable":
      return "GPS unavailable";
    case "partial":
      return "Partial GPS data";
    case "synchronized":
      return "Synchronized";
    case "out_of_range":
      return "GPS out of range";
    default:
      return "GPS unavailable";
  }
}

export function gpsStatusA11yLabel(status: GpsSyncStatus): string {
  switch (status) {
    case "synchronized":
      return "GPS synchronized";
    case "waiting":
      return "Waiting for GPS data";
    case "unavailable":
      return "GPS unavailable";
    case "partial":
      return "Partial GPS data";
    case "out_of_range":
      return "GPS out of range";
    default:
      return "GPS unavailable";
  }
}
