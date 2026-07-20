import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import type { GpsSample } from "@/packages/parsers/src/index";
import { Type, useAppTheme } from "@/constants/Theme";

interface OnlineMapWebViewProps {
  readonly samples: readonly GpsSample[];
  readonly activeIndex: number;
  readonly height?: number;
  readonly onUnavailable?: () => void;
  readonly onUseLocalMap?: () => void;
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
    let map, route, progress, marker, latlngs = [], userMoved = false, tilesOk = false;
    const TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
    function init() {
      try {
        map = L.map("map", { zoomControl: false, attributionControl: true });
        var layer = L.tileLayer(TILE, { maxZoom: 19, attribution: "&copy; OpenStreetMap" });
        layer.on("tileerror", function () { post({ type: "tileError" }); });
        layer.on("load", function () { tilesOk = true; post({ type: "tilesOk" }); });
        layer.addTo(map);
        map.on("dragstart", function () { userMoved = true; post({ type: "userMoved" }); });
        map.on("zoomstart", function () { userMoved = true; post({ type: "userMoved" }); });
        post({ type: "ready" });
      } catch (e) {
        post({ type: "initError" });
      }
    }
    function setRoute(points) {
      if (!map || !points || !points.length) return;
      latlngs = points.map(function (p) { return [p.lat, p.lon]; });
      if (route) route.remove();
      route = L.polyline(latlngs, { color: "#64748b", weight: 4 }).addTo(map);
      if (!map._laneoryFit) {
        map.fitBounds(route.getBounds(), { padding: [24, 24] });
        map._laneoryFit = true;
        userMoved = false;
      }
      updateMarker(0, true);
    }
    function updateMarker(activeIndex, forcePan) {
      if (!map || !latlngs.length) return;
      var idx = Math.min(Math.max(0, activeIndex | 0), latlngs.length - 1);
      var slice = latlngs.slice(0, idx + 1);
      if (progress) progress.setLatLngs(slice);
      else progress = L.polyline(slice, { color: "#14b8a6", weight: 5 }).addTo(map);
      var cur = latlngs[idx];
      if (marker) marker.setLatLng(cur);
      else {
        marker = L.circleMarker(cur, {
          radius: 7, color: "#042f2e", fillColor: "#14b8a6", fillOpacity: 1, weight: 2
        }).addTo(map);
      }
      if (forcePan || !userMoved) map.panTo(cur, { animate: false });
    }
    function recenter(activeIndex) {
      userMoved = false;
      updateMarker(activeIndex, true);
    }
    function onMsg(event) {
      try {
        var data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data) return;
        if (data.type === "setRoute") setRoute(data.points || []);
        if (data.type === "updateMarker") updateMarker(data.activeIndex || 0, false);
        if (data.type === "recenter") recenter(data.activeIndex || 0);
      } catch (e) {}
    }
    document.addEventListener("message", onMsg);
    window.addEventListener("message", onMsg);
    init();
  </script>
</body>
</html>`;

/**
 * Online map after explicit user opt-in. Route geometry injected once; marker updates only.
 * Tile host is not a guaranteed product dependency.
 */
export function OnlineMapWebView({
  samples,
  activeIndex,
  height = 200,
  onUnavailable,
  onUseLocalMap,
}: OnlineMapWebViewProps) {
  const { colors, radius } = useAppTheme();
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const routeSent = useRef(false);
  const lastIndex = useRef(-1);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const tileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inject = useCallback((payload: object) => {
    if (!ref.current) return;
    const json = JSON.stringify(payload);
    ref.current.injectJavaScript(
      `(function(){try{window.dispatchEvent(new MessageEvent("message",{data:${JSON.stringify(json)}}));}catch(e){} true;})();`,
    );
  }, []);

  const pushRoute = useCallback(() => {
    if (!ready.current || !ref.current || samples.length === 0) return;
    const points = samples.map((s) => ({ lat: s.latitude, lon: s.longitude }));
    inject({ type: "setRoute", points });
    routeSent.current = true;
    lastIndex.current = -1;
  }, [samples, inject]);

  const pushMarker = useCallback(
    (index: number) => {
      if (!ready.current || !routeSent.current) return;
      if (index === lastIndex.current) return;
      lastIndex.current = index;
      inject({ type: "updateMarker", activeIndex: index });
    },
    [inject],
  );

  useEffect(() => {
    if (ready.current && !routeSent.current) pushRoute();
  }, [pushRoute]);

  useEffect(() => {
    pushMarker(activeIndex);
  }, [activeIndex, pushMarker]);

  useEffect(() => {
    return () => {
      if (tileTimer.current) clearTimeout(tileTimer.current);
    };
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (data.type === "ready") {
        ready.current = true;
        routeSent.current = false;
        pushRoute();
        pushMarker(activeIndex);
        if (tileTimer.current) clearTimeout(tileTimer.current);
        tileTimer.current = setTimeout(() => {
          // Soft timeout if tiles never load — do not infinite-retry.
          setFailed((prev) => prev);
        }, 12_000);
      }
      if (data.type === "initError" || data.type === "tileError") {
        setFailed(true);
        onUnavailable?.();
      }
      if (data.type === "tilesOk" && tileTimer.current) {
        clearTimeout(tileTimer.current);
        tileTimer.current = null;
      }
    } catch {
      // ignore
    }
  };

  const retry = () => {
    setFailed(false);
    ready.current = false;
    routeSent.current = false;
    lastIndex.current = -1;
    setRetryKey((k) => k + 1);
  };

  if (failed) {
    return (
      <View
        style={[
          styles.wrap,
          styles.fallback,
          {
            height,
            borderColor: colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceMuted,
          },
        ]}
      >
        <Text style={[styles.fallbackTitle, { color: colors.text }]}>Online map unavailable</Text>
        <View style={styles.fallbackRow}>
          <Pressable
            onPress={onUseLocalMap}
            accessibilityRole="button"
            accessibilityLabel="Use local map"
            style={({ pressed }) => [
              styles.fallbackBtn,
              { borderColor: colors.brand, opacity: pressed ? 0.75 : 1, minHeight: 44 },
            ]}
          >
            <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 13 }}>
              Use local map
            </Text>
          </Pressable>
          <Pressable
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel="Retry online map"
            style={({ pressed }) => [
              styles.fallbackBtn,
              { borderColor: colors.border, opacity: pressed ? 0.75 : 1, minHeight: 44 },
            ]}
          >
            <Text style={{ color: colors.text, fontFamily: Type.fontSemi, fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        { height, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
      ]}
    >
      <WebView
        key={retryKey}
        ref={ref}
        originWhitelist={["*"]}
        source={{ html: MAP_HTML, baseUrl: "https://localhost/" }}
        onMessage={onMessage}
        onError={() => {
          setFailed(true);
          onUnavailable?.();
        }}
        onHttpError={() => {
          setFailed(true);
          onUnavailable?.();
        }}
        style={styles.web}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} accessibilityLabel="Map loading" />
          </View>
        )}
      />
      <Pressable
        onPress={() => inject({ type: "recenter", activeIndex })}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        style={({ pressed }) => [
          styles.recenter,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={{ color: colors.text, fontFamily: Type.fontSemi, fontSize: 12 }}>Recenter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  web: { flex: 1, backgroundColor: "transparent" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  recenter: {
    position: "absolute",
    right: 8,
    bottom: 8,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: { alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  fallbackTitle: { fontFamily: Type.fontSemi, fontSize: 14, marginBottom: 12, textAlign: "center" },
  fallbackRow: { flexDirection: "row", gap: 10 },
  fallbackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
