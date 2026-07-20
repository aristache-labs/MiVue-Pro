import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Camera,
  type MapViewProps,
} from "react-native-maps";

import {
  GOOGLE_FOLLOW_PITCH_DEG,
  lookAheadCoordinate,
} from "@/components/gps/mapFollow";
import {
  GOOGLE_MAPS_MARKER_OUTLINE,
  GOOGLE_MAPS_MARKER_TEAL,
  GOOGLE_MAPS_PAST_ROUTE,
  GOOGLE_MAPS_REMAIN_ROUTE,
  GOOGLE_MAPS_ROUTE_WIDTH,
} from "@/components/gps/onlineMapProvider";
import {
  isGoogleMapsSdkConfigured,
  type GoogleRecordedRouteMapProps,
  type MapFollowPose,
} from "@/components/gps/GoogleRecordedRouteMap.types";
import { Type, useAppTheme } from "@/constants/Theme";

export type { MapFollowPose, GoogleRecordedRouteMapProps };

function DirectionMarker() {
  return (
    <View style={styles.markerOuter} pointerEvents="none">
      <View style={styles.markerInner}>
        <View style={styles.markerArrow} />
      </View>
    </View>
  );
}

/**
 * Native Google Maps (PROVIDER_GOOGLE) — recorded GPS route follow.
 * No Places / Routes / Directions / location permission / My Location.
 */
export function GoogleRecordedRouteMap({
  samples,
  pose,
  height = 220,
  following,
  onUnavailable,
  onUseLocalMap,
  onUserMoved,
  onRecenter,
}: GoogleRecordedRouteMapProps) {
  const { colors, radius } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const programmaticMoveRef = useRef(false);
  const programmaticClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCameraKey = useRef("");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  const configured = isGoogleMapsSdkConfigured();

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as { remove?: () => void } | undefined)?.remove?.();
      if (programmaticClearTimer.current) clearTimeout(programmaticClearTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!configured) {
      setInitFailed(true);
      onUnavailable?.();
    }
  }, [configured, onUnavailable]);

  const coords = useMemo(
    () => samples.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
    [samples],
  );

  const pastCoords = useMemo(() => {
    if (!pose || coords.length === 0) return coords.slice(0, 1);
    const i = Math.min(Math.max(0, pose.index), coords.length - 1);
    return coords.slice(0, i + 1);
  }, [coords, pose]);

  const remainCoords = useMemo(() => {
    if (!pose || coords.length === 0) return coords;
    const i = Math.min(Math.max(0, pose.index), coords.length - 1);
    const slice = coords.slice(i);
    return slice.length > 0 ? slice : [coords[coords.length - 1]!];
  }, [coords, pose]);

  const initialRegion = useMemo(() => {
    if (coords.length === 0) {
      return { latitude: 0, longitude: 0, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    let minLat = coords[0]!.latitude;
    let maxLat = minLat;
    let minLon = coords[0]!.longitude;
    let maxLon = minLon;
    for (const c of coords) {
      minLat = Math.min(minLat, c.latitude);
      maxLat = Math.max(maxLat, c.latitude);
      minLon = Math.min(minLon, c.longitude);
      maxLon = Math.max(maxLon, c.longitude);
    }
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.004, (maxLat - minLat) * 1.6 || 0.01),
      longitudeDelta: Math.max(0.004, (maxLon - minLon) * 1.6 || 0.01),
    };
  }, [coords]);

  const markProgrammatic = useCallback(() => {
    programmaticMoveRef.current = true;
    if (programmaticClearTimer.current) clearTimeout(programmaticClearTimer.current);
    programmaticClearTimer.current = setTimeout(() => {
      programmaticMoveRef.current = false;
    }, 400);
  }, []);

  const applyFollowCamera = useCallback(
    (p: MapFollowPose) => {
      if (!mapRef.current || !mapReady) return;
      const look = lookAheadCoordinate(p.latitude, p.longitude, p.bearingDeg, 30);
      const key = `${look.latitude.toFixed(5)}|${look.longitude.toFixed(5)}|${Math.round(p.bearingDeg)}|${p.zoom}|${following}`;
      if (key === lastCameraKey.current && following) return;
      lastCameraKey.current = key;

      const camera: Camera = {
        center: look,
        pitch: GOOGLE_FOLLOW_PITCH_DEG,
        heading: p.bearingDeg,
        zoom: p.zoom,
        altitude: 600,
      };

      markProgrammatic();
      if (reduceMotion) {
        void mapRef.current.setCamera(camera);
      } else {
        void mapRef.current.animateCamera(camera, { duration: 280 });
      }
    },
    [mapReady, following, reduceMotion, markProgrammatic],
  );

  useEffect(() => {
    if (!pose || !following || !mapReady || initFailed) return;
    applyFollowCamera(pose);
  }, [pose, following, mapReady, initFailed, applyFollowCamera]);

  const onUserGesture: NonNullable<MapViewProps["onPanDrag"]> = () => {
    if (programmaticMoveRef.current) return;
    onUserMoved?.();
  };

  const handleRecenter = () => {
    onRecenter?.();
    if (pose) {
      lastCameraKey.current = "";
      applyFollowCamera({ ...pose, following: true });
    }
  };

  if (initFailed || !configured) {
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
        <Text style={[styles.fallbackTitle, { color: colors.text }]}>
          Online map unavailable
        </Text>
        <Text style={[styles.fallbackSub, { color: colors.textMuted }]}>
          Google Maps is not configured for this build. Use Local schematic or add
          GOOGLE_MAPS_IOS_API_KEY / GOOGLE_MAPS_ANDROID_API_KEY and rebuild the native client.
        </Text>
        <Pressable
          onPress={onUseLocalMap}
          accessibilityRole="button"
          accessibilityLabel="Use local schematic"
          style={({ pressed }) => [
            styles.fallbackBtn,
            { borderColor: colors.brand, opacity: pressed ? 0.75 : 1, minHeight: 44 },
          ]}
        >
          <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 13 }}>
            Use local schematic
          </Text>
        </Pressable>
      </View>
    );
  }

  const markerCoord = pose
    ? { latitude: pose.latitude, longitude: pose.longitude }
    : coords[0];

  return (
    <View
      style={[
        styles.wrap,
        {
          height,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceMuted,
        },
      ]}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        mapType="standard"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsTraffic={false}
        showsIndoors={false}
        showsBuildings={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled
        pitchEnabled
        scrollEnabled
        zoomEnabled
        onMapReady={() => setMapReady(true)}
        onPanDrag={onUserGesture}
        onMapLoaded={() => setMapReady(true)}
      >
        {pastCoords.length > 1 ? (
          <Polyline
            coordinates={pastCoords}
            strokeColor={GOOGLE_MAPS_PAST_ROUTE}
            strokeWidth={GOOGLE_MAPS_ROUTE_WIDTH}
            lineCap="round"
            lineJoin="round"
            zIndex={1}
          />
        ) : null}
        {remainCoords.length > 1 ? (
          <Polyline
            coordinates={remainCoords}
            strokeColor={GOOGLE_MAPS_REMAIN_ROUTE}
            strokeWidth={GOOGLE_MAPS_ROUTE_WIDTH}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        ) : null}
        {markerCoord ? (
          <Marker
            coordinate={markerCoord}
            flat
            rotation={pose?.bearingDeg ?? 0}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={10}
          >
            <DirectionMarker />
          </Marker>
        ) : null}
      </MapView>

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
          <Text style={{ color: colors.text, fontFamily: Type.fontSemi, fontSize: 12 }}>
            Recenter
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  map: { flex: 1 },
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
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  fallbackTitle: {
    fontFamily: Type.fontSemi,
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  fallbackSub: {
    fontFamily: Type.font,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  fallbackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  markerOuter: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  markerInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GOOGLE_MAPS_MARKER_TEAL,
    borderWidth: 2,
    borderColor: GOOGLE_MAPS_MARKER_OUTLINE,
    alignItems: "center",
    justifyContent: "center",
  },
  markerArrow: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: GOOGLE_MAPS_MARKER_OUTLINE,
  },
});
