import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import type { GpsSample } from "@/packages/parsers/src/index";
import { useAppTheme } from "@/constants/Theme";

interface OnlineMapWebViewProps {
  readonly samples: readonly GpsSample[];
  readonly activeIndex: number;
  readonly height?: number;
}

const MAP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; height: 100%; background: #0b1220; }
    .leaflet-control-attribution { font-size: 9px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    let map, route, progress, marker;
    const TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    function init() {
      map = L.map("map", { zoomControl: false, attributionControl: true });
      L.tileLayer(TILE, { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ready" }));
      }
    }
    function setRoute(points, activeIndex) {
      if (!map || !points || !points.length) return;
      const latlngs = points.map(function (p) { return [p.lat, p.lon]; });
      if (route) route.remove();
      if (progress) progress.remove();
      if (marker) marker.remove();
      route = L.polyline(latlngs, { color: "#64748b", weight: 4 }).addTo(map);
      const slice = latlngs.slice(0, Math.min(activeIndex + 1, latlngs.length));
      progress = L.polyline(slice, { color: "#14b8a6", weight: 5 }).addTo(map);
      const cur = latlngs[Math.min(activeIndex, latlngs.length - 1)];
      marker = L.circleMarker(cur, {
        radius: 7, color: "#042f2e", fillColor: "#14b8a6", fillOpacity: 1, weight: 2
      }).addTo(map);
      if (!map._laneoryFit) {
        map.fitBounds(route.getBounds(), { padding: [24, 24] });
        map._laneoryFit = true;
      } else {
        map.panTo(cur);
      }
    }
    function onMsg(event) {
      try {
        var data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.type === "setRoute") setRoute(data.points, data.activeIndex || 0);
      } catch (e) {}
    }
    document.addEventListener("message", onMsg);
    window.addEventListener("message", onMsg);
    init();
  </script>
</body>
</html>`;

/**
 * Online map after explicit user opt-in. Loads Leaflet + tiles over the network.
 * Tile host is not a guaranteed product dependency (see docs/mobile/data-flow.md).
 */
export function OnlineMapWebView({ samples, activeIndex, height = 200 }: OnlineMapWebViewProps) {
  const { colors, radius } = useAppTheme();
  const ref = useRef<WebView>(null);
  const ready = useRef(false);

  const pushRoute = () => {
    if (!ready.current || !ref.current) return;
    const points = samples.map((s) => ({ lat: s.latitude, lon: s.longitude }));
    const payload = JSON.stringify({ type: "setRoute", points, activeIndex });
    ref.current.injectJavaScript(
      `(function(){try{window.dispatchEvent(new MessageEvent("message",{data:${JSON.stringify(payload)}}));}catch(e){} true;})();`,
    );
  };

  useEffect(() => {
    pushRoute();
  }, [samples, activeIndex]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (data.type === "ready") {
        ready.current = true;
        pushRoute();
      }
    } catch {
      // ignore
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        { height, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
      ]}
    >
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html: MAP_HTML, baseUrl: "https://localhost/" }}
        onMessage={onMessage}
        style={styles.web}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  web: { flex: 1, backgroundColor: "transparent" },
});
