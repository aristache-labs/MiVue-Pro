import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import type { GpsSample } from "@/packages/parsers/src/index";
import { Type, useAppTheme } from "@/constants/Theme";

export interface MapFollowPose {
  readonly latitude: number;
  readonly longitude: number;
  readonly bearingDeg: number;
  readonly zoom: number;
  readonly index: number;
  readonly following: boolean;
}

interface OnlineMapWebViewProps {
  readonly samples: readonly GpsSample[];
  readonly pose: MapFollowPose | null;
  readonly height?: number;
  readonly onUnavailable?: () => void;
  readonly onUseLocalMap?: () => void;
  readonly onUserMoved?: () => void;
  readonly onRecenter?: () => void;
  readonly following: boolean;
}

/**
 * Leaflet online map (opt-in). Route geometry once; marker/camera via imperative inject.
 *
 * Limitation: map stays North-up. Heading is shown by rotating the marker chevron only —
 * Leaflet tile rotation is not used (avoids heavy/unstable deps).
 */
const MAP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; height: 100%; background: #0b1220; }
    .leaflet-control-attribution { font-size: 9px !important; }
    .laneory-marker {
      width: 0; height: 0; position: relative;
    }
    .laneory-chevron {
      width: 18px; height: 18px; margin-left: -9px; margin-top: -9px;
      border-radius: 50%;
      background: #14b8a6;
      border: 2px solid #042f2e;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center;
      transform-origin: 50% 50%;
    }
    .laneory-chevron::after {
      content: "";
      width: 0; height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-bottom: 8px solid #042f2e;
      margin-top: -2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    let map, pastLine, remainLine, marker, latlngs = [];
    let userMoved = false, follow = true, reduceMotion = false;
    let lastZoom = 16, suppressMove = false;
    const TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
    function init() {
      try {
        map = L.map("map", { zoomControl: false, attributionControl: true, preferCanvas: true });
        var layer = L.tileLayer(TILE, { maxZoom: 19, attribution: "&copy; OpenStreetMap" });
        layer.on("tileerror", function () { post({ type: "tileError" }); });
        layer.on("load", function () { post({ type: "tilesOk" }); });
        layer.addTo(map);
        map.on("dragstart", function () {
          if (suppressMove) return;
          userMoved = true; follow = false; post({ type: "userMoved" });
        });
        map.on("zoomstart", function () {
          if (suppressMove) return;
          userMoved = true; follow = false; post({ type: "userMoved" });
        });
        post({ type: "ready" });
      } catch (e) {
        post({ type: "initError" });
      }
    }
    function makeIcon(bearing) {
      var rot = (bearing || 0);
      return L.divIcon({
        className: "laneory-marker",
        html: '<div class="laneory-chevron" style="transform:rotate(' + rot + 'deg)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
    }
    function setRoute(points) {
      if (!map || !points || !points.length) return;
      latlngs = points.map(function (p) { return [p.lat, p.lon]; });
      if (pastLine) pastLine.remove();
      if (remainLine) remainLine.remove();
      remainLine = L.polyline(latlngs, { color: "#2dd4bf", weight: 4, opacity: 0.85 }).addTo(map);
      pastLine = L.polyline([], { color: "#64748b", weight: 4, opacity: 0.9 }).addTo(map);
      if (!map._laneoryFit) {
        suppressMove = true;
        map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 17 });
        map._laneoryFit = true;
        setTimeout(function () { suppressMove = false; }, 80);
        userMoved = false;
        follow = true;
      }
    }
    function splitLines(idx) {
      if (!latlngs.length) return;
      var i = Math.min(Math.max(0, idx | 0), latlngs.length - 1);
      var past = latlngs.slice(0, i + 1);
      var remain = latlngs.slice(i);
      if (pastLine) pastLine.setLatLngs(past);
      if (remainLine) remainLine.setLatLngs(remain.length ? remain : [latlngs[latlngs.length - 1]]);
    }
    function followCamera(lat, lon, zoom, bearing) {
      if (!map) return;
      var z = zoom || map.getZoom() || 16;
      lastZoom = z;
      suppressMove = true;
      var size = map.getSize();
      var target = L.latLng(lat, lon);
      // Center so marker sits ~50% x, ~68% y (more road ahead).
      var projected = map.project(target, z);
      var desired = L.point(size.x * 0.5, size.y * 0.68);
      var centerPoint = projected.subtract(desired).add(map.getSize().divideBy(2));
      var center = map.unproject(centerPoint, z);
      if (reduceMotion) {
        map.setView(center, z, { animate: false });
      } else {
        map.setView(center, z, { animate: true, duration: 0.28 });
      }
      setTimeout(function () { suppressMove = false; }, 100);
    }
    function updatePose(data) {
      if (!map || !latlngs.length) return;
      var lat = data.lat, lon = data.lon;
      var bearing = data.bearing || 0;
      var idx = data.index | 0;
      follow = !!data.following;
      reduceMotion = !!data.reduceMotion;
      splitLines(idx);
      if (!marker) {
        marker = L.marker([lat, lon], { icon: makeIcon(bearing), interactive: false }).addTo(map);
      } else {
        marker.setLatLng([lat, lon]);
        marker.setIcon(makeIcon(bearing));
      }
      if (follow && !userMoved) {
        followCamera(lat, lon, data.zoom, bearing);
      }
    }
    function recenter(data) {
      userMoved = false;
      follow = true;
      updatePose(Object.assign({}, data, { following: true }));
    }
    function onMsg(event) {
      try {
        var data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data) return;
        if (data.type === "setRoute") setRoute(data.points || []);
        if (data.type === "updatePose") updatePose(data);
        if (data.type === "recenter") recenter(data);
        if (data.type === "setReduceMotion") reduceMotion = !!data.value;
      } catch (e) {}
    }
    document.addEventListener("message", onMsg);
    window.addEventListener("message", onMsg);
    init();
  </script>
</body>
</html>`;

export function OnlineMapWebView({
  samples,
  pose,
  height = 220,
  onUnavailable,
  onUseLocalMap,
  onUserMoved,
  onRecenter,
  following,
}: OnlineMapWebViewProps) {
  const { colors, radius } = useAppTheme();
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const routeSent = useRef(false);
  const lastPoseKey = useRef("");
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);

  const inject = useCallback((payload: object) => {
    if (!ref.current) return;
    const json = JSON.stringify(payload);
    ref.current.injectJavaScript(
      `(function(){try{window.dispatchEvent(new MessageEvent("message",{data:${JSON.stringify(json)}}));}catch(e){} true;})();`,
    );
  }, []);

  const pushRoute = useCallback(() => {
    if (!ready.current || samples.length === 0) return;
    const points = samples.map((s) => ({ lat: s.latitude, lon: s.longitude }));
    inject({ type: "setRoute", points });
    routeSent.current = true;
    lastPoseKey.current = "";
  }, [samples, inject]);

  const pushPose = useCallback(() => {
    if (!ready.current || !routeSent.current || !pose) return;
    const key = `${pose.latitude.toFixed(6)}|${pose.longitude.toFixed(6)}|${pose.index}|${pose.zoom}|${following}|${Math.round(pose.bearingDeg)}`;
    if (key === lastPoseKey.current) return;
    lastPoseKey.current = key;
    inject({
      type: "updatePose",
      lat: pose.latitude,
      lon: pose.longitude,
      bearing: pose.bearingDeg,
      zoom: pose.zoom,
      index: pose.index,
      following,
      reduceMotion,
    });
  }, [pose, following, reduceMotion, inject]);

  useEffect(() => {
    if (ready.current && !routeSent.current) pushRoute();
  }, [pushRoute]);

  useEffect(() => {
    pushPose();
  }, [pushPose]);

  useEffect(() => {
    if (ready.current) inject({ type: "setReduceMotion", value: reduceMotion });
  }, [reduceMotion, inject]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (data.type === "ready") {
        ready.current = true;
        routeSent.current = false;
        pushRoute();
        pushPose();
      }
      if (data.type === "userMoved") onUserMoved?.();
      if (data.type === "initError" || data.type === "tileError") {
        setFailed(true);
        onUnavailable?.();
      }
    } catch {
      // ignore
    }
  };

  const retry = () => {
    setFailed(false);
    ready.current = false;
    routeSent.current = false;
    lastPoseKey.current = "";
    setRetryKey((k) => k + 1);
  };

  const handleRecenter = () => {
    if (!pose) return;
    onRecenter?.();
    inject({
      type: "recenter",
      lat: pose.latitude,
      lon: pose.longitude,
      bearing: pose.bearingDeg,
      zoom: pose.zoom,
      index: pose.index,
      following: true,
      reduceMotion,
    });
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
      {!following ? (
        <Pressable
          onPress={handleRecenter}
          accessibilityRole="button"
          accessibilityLabel="Recenter map on current GPS position"
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
      ) : null}
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
