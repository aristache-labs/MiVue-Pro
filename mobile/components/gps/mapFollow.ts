import type { GpsSample } from "@/packages/parsers/src/index";

import {
  GPS_VIDEO_SYNC_TOLERANCE_SEC,
  lookupGpsAtVideoTime,
  type GpsLookupResult,
  type NormalizedGpsTrack,
} from "@/components/gps/sampleIndex";

export interface InterpolatedGpsPose {
  readonly latitude: number;
  readonly longitude: number;
  readonly bearingDeg: number;
  readonly speedKmh: number | undefined;
  readonly altitudeMeters: number | undefined;
  readonly index: number;
  /** 0–1 between index and index+1. */
  readonly frac: number;
  readonly status: GpsLookupResult["status"];
  readonly sample: GpsSample | undefined;
}

/** Haversine bearing in degrees [0, 360). */
export function bearingBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/** Shortest-path bearing blend. */
export function smoothBearing(prevDeg: number, nextDeg: number, alpha = 0.35): number {
  if (!Number.isFinite(prevDeg)) return nextDeg;
  if (!Number.isFinite(nextDeg)) return prevDeg;
  let delta = ((nextDeg - prevDeg + 540) % 360) - 180;
  return ((prevDeg + alpha * delta) + 360) % 360;
}

/**
 * Dynamic street-level zoom with hysteresis so minor speed noise does not thrash tiles.
 * 0–30 → 17, 30–80 → 16, 80+ → 15.
 */
export function zoomForSpeedKmh(speedKmh: number | undefined, previousZoom: number): number {
  const speed =
    speedKmh !== undefined && Number.isFinite(speedKmh) && speedKmh >= 0 ? speedKmh : 40;
  const prev = previousZoom || 16;

  if (prev >= 17) {
    if (speed < 35) return 17;
    if (speed < 85) return 16;
    return 15;
  }
  if (prev <= 15) {
    if (speed > 75) return 15;
    if (speed > 25) return 16;
    return 17;
  }
  // prev ≈ 16
  if (speed < 25) return 17;
  if (speed > 85) return 15;
  return 16;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate pose between the two samples surrounding video time.
 * Uses binary-search lookup; no full-track linear scan.
 */
export function interpolateGpsAtVideoTime(
  track: NormalizedGpsTrack,
  videoTimeSec: number,
  prevBearingDeg?: number,
  toleranceSec: number = GPS_VIDEO_SYNC_TOLERANCE_SEC,
): InterpolatedGpsPose | undefined {
  const lookup = lookupGpsAtVideoTime(track, videoTimeSec, toleranceSec);
  if (lookup.index < 0 || !lookup.sample || track.samples.length === 0) {
    return undefined;
  }

  const targetMs = track.startMs + Math.max(0, videoTimeSec) * 1000;
  let i0 = lookup.index;
  let i1 = lookup.index;

  if (targetMs <= track.timesMs[0]!) {
    i0 = 0;
    i1 = 0;
  } else if (targetMs >= track.timesMs[track.timesMs.length - 1]!) {
    i0 = track.timesMs.length - 1;
    i1 = i0;
  } else if (targetMs >= track.timesMs[lookup.index]!) {
    i0 = lookup.index;
    i1 = Math.min(lookup.index + 1, track.samples.length - 1);
  } else {
    i1 = lookup.index;
    i0 = Math.max(0, lookup.index - 1);
  }

  const t0 = track.timesMs[i0]!;
  const t1 = track.timesMs[i1]!;
  const frac = i0 === i1 || t1 === t0 ? 0 : Math.min(1, Math.max(0, (targetMs - t0) / (t1 - t0)));

  const a = track.samples[i0]!;
  const b = track.samples[i1]!;
  const latitude = lerp(a.latitude, b.latitude, frac);
  const longitude = lerp(a.longitude, b.longitude, frac);

  let rawBearing =
    a.courseDegrees !== undefined && Number.isFinite(a.courseDegrees)
      ? a.courseDegrees
      : i0 !== i1
        ? bearingBetween(a.latitude, a.longitude, b.latitude, b.longitude)
        : i0 > 0
          ? bearingBetween(
              track.samples[i0 - 1]!.latitude,
              track.samples[i0 - 1]!.longitude,
              a.latitude,
              a.longitude,
            )
          : 0;

  if (!Number.isFinite(rawBearing)) rawBearing = prevBearingDeg ?? 0;
  const bearingDeg =
    prevBearingDeg !== undefined ? smoothBearing(prevBearingDeg, rawBearing) : rawBearing;

  const speedKmh =
    a.speedKmh !== undefined && b.speedKmh !== undefined
      ? lerp(a.speedKmh, b.speedKmh, frac)
      : a.speedKmh;

  const altitudeMeters =
    a.altitudeMeters !== undefined && b.altitudeMeters !== undefined
      ? lerp(a.altitudeMeters, b.altitudeMeters, frac)
      : a.altitudeMeters;

  return {
    latitude,
    longitude,
    bearingDeg,
    speedKmh,
    altitudeMeters,
    index: i0,
    frac,
    status: lookup.status,
    sample: {
      ...a,
      latitude,
      longitude,
      speedKmh: speedKmh ?? a.speedKmh,
      altitudeMeters,
      courseDegrees: bearingDeg,
    },
  };
}
