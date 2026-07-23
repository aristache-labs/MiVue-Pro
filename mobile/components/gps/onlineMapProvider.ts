/**
 * Online map tile provider — single config surface for Leaflet WebView.
 *
 * Current source: public OSM raster tiles (`tile.openstreetmap.org`).
 * Suitable for current/dev usage; not a guaranteed commercial product dependency.
 * Do not bulk-download, prefetch regions, or hardcode API secrets here.
 */
export interface MapTileSource {
  readonly id: "openstreetmap-raster";
  readonly tileUrlTemplate: string;
  readonly attributionHtml: string;
  readonly maxZoom: number;
  /** Identifies the app in tile requests when the transport supports it. */
  readonly requestedWith: string;
}

export interface OnlineMapProviderConfig {
  readonly tileSource: MapTileSource;
  readonly pastRouteColor: string;
  readonly remainRouteColor: string;
  readonly routeWeight: number;
  readonly mapBackground: string;
}

export const OPENSTREETMAP_TILE_SOURCE: MapTileSource = {
  id: "openstreetmap-raster",
  tileUrlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attributionHtml: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
  requestedWith: "Laneory/1.0 (local dashcam library)",
};

export const DEFAULT_ONLINE_MAP_PROVIDER: OnlineMapProviderConfig = {
  tileSource: OPENSTREETMAP_TILE_SOURCE,
  pastRouteColor: "#64748b",
  remainRouteColor: "#14b8a6",
  routeWeight: 3,
  mapBackground: "#e8eef4",
};

/** Inject provider constants into the Leaflet bootstrap script (no secrets). */
export function buildLeafletBootstrapConfig(
  provider: OnlineMapProviderConfig = DEFAULT_ONLINE_MAP_PROVIDER,
): string {
  return JSON.stringify({
    tileUrl: provider.tileSource.tileUrlTemplate,
    attribution: provider.tileSource.attributionHtml,
    maxZoom: provider.tileSource.maxZoom,
    pastColor: provider.pastRouteColor,
    remainColor: provider.remainRouteColor,
    routeWeight: provider.routeWeight,
    mapBg: provider.mapBackground,
    requestedWith: provider.tileSource.requestedWith,
  });
}

export const MAP_MODE_OPTIONS = ["Online map", "Local schematic"] as const;
export type MapModeOptionLabel = (typeof MAP_MODE_OPTIONS)[number];

/** Persisted Settings preference (`DemoModeContext.mapPreference`). */
export type MapPreferenceValue = "online" | "schematic";

/** Player map component mode (`online` WebView vs `local` schematic). */
export type PlayerMapMode = "online" | "local";

export function mapPreferenceToPlayerMode(preference: MapPreferenceValue): PlayerMapMode {
  return preference === "online" ? "online" : "local";
}

export function playerModeToMapPreference(mode: PlayerMapMode): MapPreferenceValue {
  return mode === "online" ? "online" : "schematic";
}
