import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  OnlineMapWebView,
  SchematicRoute,
  TelemetryPanel,
  loadSiblingNmea,
  sampleIndexAtTime,
} from "@/components/gps";
import { IconButton } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { GpsSample } from "@/packages/parsers/src/index";

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ uri?: string; name?: string; kind?: string }>();
  const uri = typeof params.uri === "string" ? params.uri : "";
  const name = typeof params.name === "string" ? params.name : "Media";
  const kind = typeof params.kind === "string" ? params.kind : "other";
  const { shareLocalFile } = useDemoMode();
  const { colors } = useAppTheme();

  const isVideo = kind === "video" || name.toLowerCase().endsWith(".mp4");
  const isImage =
    kind === "image" ||
    name.toLowerCase().endsWith(".jpg") ||
    name.toLowerCase().endsWith(".jpeg");

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <Stack.Screen options={{ headerShown: false, presentation: "modal" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {uri && isImage ? (
          <Image source={{ uri }} style={styles.media} resizeMode="contain" accessibilityLabel={name} />
        ) : null}

        {uri && isVideo ? <VideoWithGps uri={uri} /> : null}

        {!uri || (!isVideo && !isImage) ? (
          <View style={styles.centerMessage}>
            <Ionicons name="document-outline" size={40} color={colors.textFaint} />
            <Text style={[styles.centerText, { color: colors.textMuted }]}>
              {uri ? "This file type has no in-app preview. Use Share to open elsewhere." : "Missing media URI."}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <BlurView intensity={60} tint="dark" style={styles.topBar}>
        <IconButton icon="close" tone="neutral" onPress={() => router.back()} accessibilityLabel="Close player" />
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {name}
        </Text>
        <IconButton
          icon="share-outline"
          tone="neutral"
          onPress={() =>
            void shareLocalFile({
              name,
              uri,
              sizeBytes: 0,
              kind: isVideo ? "video" : isImage ? "image" : "other",
            })
          }
          accessibilityLabel={`Share ${name}`}
        />
      </BlurView>
    </View>
  );
}

function VideoWithGps({ uri }: { readonly uri: string }) {
  const { colors, spacing } = useAppTheme();
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.play();
  });

  const [samples, setSamples] = useState<readonly GpsSample[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [gpsStatus, setGpsStatus] = useState("Loading GPS…");
  const [mapEnabled, setMapEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadSiblingNmea(uri);
      if (cancelled) return;
      if (loaded && loaded.length > 0) {
        setSamples(loaded);
        setGpsStatus(`${loaded.length} points · synced`);
      } else {
        setSamples([]);
        setGpsStatus("No GPS data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  useEffect(() => {
    if (samples.length === 0) return;
    const id = setInterval(() => {
      try {
        const t = player.currentTime;
        setActiveIndex(sampleIndexAtTime(samples, typeof t === "number" ? t : 0));
      } catch {
        // player may be disposed
      }
    }, 250);
    return () => clearInterval(id);
  }, [player, samples]);

  return (
    <View>
      <View style={styles.media}>
        <VideoView
          style={styles.videoView}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />
      </View>

      <View style={[styles.gpsBlock, { padding: spacing.lg, backgroundColor: colors.bg }]}>
        <Text style={[styles.gpsTitle, { color: colors.text }]}>GPS track</Text>
        <TelemetryPanel samples={samples} activeIndex={activeIndex} status={gpsStatus} />

        <View style={{ height: spacing.md }} />

        {samples.length > 0 ? (
          mapEnabled ? (
            <OnlineMapWebView samples={samples} activeIndex={activeIndex} height={200} />
          ) : (
            <SchematicRoute samples={samples} activeIndex={activeIndex} height={180} />
          )
        ) : (
          <View style={[styles.noGps, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Text style={[styles.noGpsText, { color: colors.textMuted }]}>
              Sidecar NMEA unavailable for this clip.
            </Text>
          </View>
        )}

        {samples.length > 0 ? (
          <>
            <Pressable
              onPress={() => setMapEnabled((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={mapEnabled ? "Use schematic map" : "Enable online map"}
              style={({ pressed }) => [
                styles.mapToggle,
                {
                  borderColor: colors.brand,
                  opacity: pressed ? 0.8 : 1,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Ionicons
                name={mapEnabled ? "map-outline" : "globe-outline"}
                size={16}
                color={colors.brand}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.mapToggleText, { color: colors.brand }]}>
                {mapEnabled ? "Use schematic map (local)" : "Enable online map"}
              </Text>
            </Pressable>
            <Text style={[styles.privacy, { color: colors.textFaint }]}>
              Schematic map is fully local. Online map sends the viewport area to tile servers only after
              you enable it. Public OSM tiles are not a guaranteed product dependency.
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 96, paddingBottom: 32 },
  media: { width: "100%", height: 240, backgroundColor: "#000" },
  videoView: { flex: 1 },
  centerMessage: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 80 },
  centerText: { textAlign: "center", marginTop: 12, fontSize: 13, lineHeight: 18, fontFamily: Type.font },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  topBarTitle: {
    color: "#F2F4F7",
    fontSize: 14,
    fontFamily: Type.fontSemi,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  gpsBlock: { gap: 0 },
  gpsTitle: { fontSize: 14, fontFamily: Type.fontSemi, marginBottom: 10 },
  noGps: {
    height: 120,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  noGpsText: { fontSize: 13, fontFamily: Type.font, textAlign: "center" },
  mapToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 12,
  },
  mapToggleText: { fontSize: 14, fontFamily: Type.fontSemi },
  privacy: { fontSize: 11, fontFamily: Type.font, lineHeight: 15, marginTop: 10 },
});
