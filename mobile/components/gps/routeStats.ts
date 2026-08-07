import type { GpsSample } from "@/packages/parsers/src/index";

/**
 * Calculate distance between two GPS points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(point1: GpsSample, point2: GpsSample): number {
  const R = 6371; // Earth's radius in kilometers
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface RouteStats {
  totalDistanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pointCount: number;
}

/**
 * Calculate comprehensive route statistics from GPS track
 */
export function calculateRouteStats(track: readonly GpsSample[]): RouteStats | null {
  if (!track || track.length < 2) {
    return null;
  }

  let totalDistance = 0;
  let speedSum = 0;
  let maxSpeed = 0;
  let speedCount = 0;

  for (let i = 1; i < track.length; i++) {
    const prev = track[i - 1];
    const curr = track[i];

    // Calculate distance (skipping invalid coordinates like 0,0 usually from lack of fix)
    if (prev.latitude !== 0 && prev.longitude !== 0 && curr.latitude !== 0 && curr.longitude !== 0) {
      totalDistance += haversineDistance(prev, curr);
    }

    // Track speed statistics (using speedKmh directly from GpsSample)
    if (typeof curr.speedKmh === "number" && curr.speedKmh >= 0) {
      speedSum += curr.speedKmh;
      speedCount++;
      if (curr.speedKmh > maxSpeed) {
        maxSpeed = curr.speedKmh;
      }
    }
  }

  return {
    totalDistanceKm: totalDistance,
    avgSpeedKmh: speedCount > 0 ? speedSum / speedCount : 0,
    maxSpeedKmh: maxSpeed,
    pointCount: track.length,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}

/**
 * Format speed for display
 */
export function formatSpeed(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}
