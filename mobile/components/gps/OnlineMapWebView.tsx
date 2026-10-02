import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import {
  DEFAULT_ONLINE_MAP_PROVIDER,
  buildLeafletBootstrapConfig,
  type OnlineMapProviderConfig,
} from "@/components/gps/onlineMapProvider";
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
  readonly provider?: OnlineMapProviderConfig;
}

/**
 * Leaflet online map (opt-in). Route once; marker/camera via imperative inject.
 * North-up only — heading rotates the marker chevron (no fragile map rotation).
 */
function buildMapHtml(provider: OnlineMapProviderConfig): string {
  const cfg = buildLeafletBootstrapConfig(provider);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; height: 100%; background: ${provider.mapBackground}; }
    .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.82) !important; }
    .laneory-marker { width: 0; height: 0; position: relative; }
    .laneory-chevron {
      width: 18px; height: 18px; margin-left: -9px; margin-top: -9px;
      border-radius: 50%; background: #14b8a6; border: 2px solid #042f2e;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.55);
      transform-origin: 50% 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .laneory-chevron::after {
      content: ""; width: 0; height: 0;
      border-left: 4px solid transparent; border-right: 4px solid transparent;
      border-bottom: 8px solid #042f2e; margin-top: -2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var CFG = ${cfg};
    let map, pastLine, remainLine, marker, latlngs = [], tileLayer;
    let userMoved = false, follow = true, reduceMotion = false, suppressMove = false;
    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
    function init() {
      try {
        map = L.map("map", { zoomControl: false, attributionControl: true, preferCanvas: true });
        tileLayer = L.tileLayer(CFG.tileUrl, {
          maxZoom: CFG.maxZoom,
          attribution: CFG.attribution
        });
        tileLayer.on("tileerror", function () { post({ type: "tileError" }); });
        tileLayer.on("load", function () { post({ type: "tilesOk" }); });
        tileLayer.addTo(map);
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
      return L.divIcon({
        className: "laneory-marker",
        html: '<div class="laneory-chevron" style="transform:rotate(' + (bearing || 0) + 'deg)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
    }
    function setRoute(points) {
      if (!map || !points || !points.length) return;
      latlngs = points.map(function (p) { return [p.lat, p.lon]; });
      if (pastLine) pastLine.remove();
      if (remainLine) remainLine.remove();
      remainLine = L.polyline(latlngs, {
        color: CFG.remainColor, weight: CFG.routeWeight, opacity: 0.75
      }).addTo(map);
      pastLine = L.polyline([], {
        color: CFG.pastColor, weight: CFG.routeWeight, opacity: 0.8
      }).addTo(map);
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
      if (pastLine) pastLine.setLatLngs(latlngs.slice(0, i + 1));
      var remain = latlngs.slice(i);
      if (remainLine) remainLine.setLatLngs(remain.length ? remain : [latlngs[latlngs.length - 1]]);
    }
    function followCamera(lat, lon, zoom) {
      if (!map) return;
      var z = zoom || map.getZoom() || 16;
      suppressMove = true;
      var size = map.getSize();
      var projected = map.project(L.latLng(lat, lon), z);
      var desired = L.point(size.x * 0.5, size.y * 0.68);
      var centerPoint = projected.subtract(desired).add(size.divideBy(2));
      var center = map.unproject(centerPoint, z);
      map.setView(center, z, { animate: !reduceMotion, duration: reduceMotion ? 0 : 0.28 });
      setTimeout(function () { suppressMove = false; }, 100);
    }
    function updatePose(data) {
      if (!map || !latlngs.length) return;
      follow = !!data.following;
      reduceMotion = !!data.reduceMotion;
      splitLines(data.index | 0);
      if (!marker) {
        marker = L.marker([data.lat, data.lon], { icon: makeIcon(data.bearing), interactive: false }).addTo(map);
      } else {
        marker.setLatLng([data.lat, data.lon]);
        marker.setIcon(makeIcon(data.bearing));
      }
      if (follow && !userMoved) followCamera(data.lat, data.lon, data.zoom);
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
}

export function OnlineMapWebView({
  samples,
  pose,
  height = 220,
  onUnavailable,
  onUseLocalMap,
  onUserMoved,
  onRecenter,
  following,
  provider = DEFAULT_ONLINE_MAP_PROVIDER,
}: OnlineMapWebViewProps) {
  const { colors, radius } = useAppTheme();
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const routeSent = useRef(false);
  const lastPoseKey = useRef("");
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const html = useMemo(() => buildMapHtml(provider), [provider]);

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
    inject({
      type: "setRoute",
      points: samples.map((s) => ({ lat: s.latitude, lon: s.longitude })),
    });
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
        {
          height,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: provider.mapBackground,
        },
      ]}
    >
      <WebView
        key={retryKey}
        ref={ref}
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://localhost/" }}
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
        applicationNameForUserAgent={provider.tileSource.requestedWith}
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
  loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
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
    zIndex: 2,
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
