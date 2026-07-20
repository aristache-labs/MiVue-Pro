/**
 * Online map provider for Laneory — Google Maps SDK only (native).
 * No Places / Routes / Directions / Map Tiles / Map ID / cloud styling.
 *
 * Keys: GOOGLE_MAPS_IOS_API_KEY + GOOGLE_MAPS_ANDROID_API_KEY (env / EAS Secrets).
 * Never commit real keys.
 */

export const MAP_MODE_OPTIONS = ["Online map", "Local schematic"] as const;
export type MapModeOptionLabel = (typeof MAP_MODE_OPTIONS)[number];

export const GOOGLE_MAPS_PAST_ROUTE = "#64748b";
export const GOOGLE_MAPS_REMAIN_ROUTE = "#14b8a6";
export const GOOGLE_MAPS_ROUTE_WIDTH = 3.5;
export const GOOGLE_MAPS_MARKER_TEAL = "#14b8a6";
export const GOOGLE_MAPS_MARKER_OUTLINE = "#042f2e";

/** Services that must never be enabled for this feature. */
export const FORBIDDEN_GOOGLE_MAP_APIS = [
  "Places API",
  "Routes API",
  "Directions API",
  "Roads API",
  "Street View Static API",
  "Geocoding API",
  "Map Tiles API",
  "Navigation SDK",
] as const;

export const ALLOWED_GOOGLE_MAP_APIS = ["Maps SDK for iOS", "Maps SDK for Android"] as const;
