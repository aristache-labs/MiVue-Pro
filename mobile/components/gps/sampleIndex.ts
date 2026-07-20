import type { GpsSample } from "@/packages/parsers/src/index";

/** Map video seconds (from clip start) to nearest telemetry sample. */
export function sampleIndexAtTime(samples: readonly GpsSample[], currentTimeSec: number): number {
  if (samples.length === 0) return 0;
  const startMs = Date.parse(samples[0]!.recordedAt);
  if (!Number.isFinite(startMs)) return 0;
  const targetMs = startMs + Math.max(0, currentTimeSec) * 1000;
  let best = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples.length; i += 1) {
    const t = Date.parse(samples[i]!.recordedAt);
    if (!Number.isFinite(t)) continue;
    const delta = Math.abs(t - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}
