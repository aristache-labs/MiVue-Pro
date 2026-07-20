import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  OnlineMapWebView,
  SchematicRoute,
  TelemetryPanel,
  loadSiblingNmea,
  sampleIndexAtTime,
} from "@/components/gps";
import { recordingMetaChips } from "@/components/mediaMeta";
import { IconButton, MediaMetaRow } from "@/components/ui";
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
  const insets = useSafeAreaInsets();

  const isVideo = kind === "video" || name.toLowerCase().endsWith(".mp4");
  const isImage =
    kind === "image" ||
    name.toLowerCase().endsWith(".jpg") ||
    name.toLowerCase().endsWith(".jpeg");

  const [sizeBytes, setSizeBytes] = useState(0);
  const [durationSec, setDurationSec] = useState<number | undefined>();

  useEffect(() => {
    if (!uri) return;
    void (async () => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && "size" in info && typeof info.size === "number") {
          setSizeBytes(info.size);
        }
      } catch {
        setSizeBytes(0);
      }
    })();
  }, [uri]);

  const metaChips = useMemo(
    () =>
      recordingMetaChips({
        name,
        sizeBytes: sizeBytes > 0 ? sizeBytes : undefined,
        durationSeconds: durationSec,
      }),
    [name, sizeBytes, durationSec],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />

      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.bg,
            paddingTop: Math.max(insets.top, 8),
          },
        ]}
      >
        <IconButton icon="close" tone="ghost" onPress={() => router.back()} accessibilityLabel="Close player" />
        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {metaChips.length > 0 ? (
            <View style={styles.metaWrap}>
              <MediaMetaRow chips={metaChips} compact />
            </View>
          ) : null}
        </View>
        <IconButton
          icon="share-outline"
          tone="ghost"
          onPress={() =>
            void shareLocalFile({
              name,
              uri,
              sizeBytes,
              kind: isVideo ? "video" : isImage ? "image" : "other",
            })
          }
          accessibilityLabel={`Share ${name}`}
        />
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        bounces={false}
      >
        {uri && isImage ? (
          <Image
            source={{ uri }}
            style={[styles.media, { backgroundColor: colors.bg }]}
            resizeMode="contain"
            accessibilityLabel={name}
          />
        ) : null}

        {uri && isVideo ? (
          <VideoWithGps uri={uri} onDuration={(sec) => setDurationSec(sec)} />
        ) : null}

        {!uri || (!isVideo && !isImage) ? (
          <View style={styles.centerMessage}>
            <Ionicons name="document-outline" size={40} color={colors.textFaint} />
            <Text style={[styles.centerText, { color: colors.textMuted }]}>
              {uri ? "This file type has no in-app preview. Use Share to open elsewhere." : "Missing media URI."}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function VideoWithGps({
  uri,
  onDuration,
}: {
  readonly uri: string;
  readonly onDuration: (seconds: number) => void;
}) {
  const { colors, spacing } = useAppTheme();
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.play();
  });

  const [samples, setSamples] = useState<readonly GpsSample[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoTimeSec, setVideoTimeSec] = useState(0);
  const [mapEnabled, setMapEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadSiblingNmea(uri);
      if (cancelled) return;
      setSamples(loaded && loaded.length > 0 ? loaded : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const d = player.duration;
        if (typeof d === "number" && Number.isFinite(d) && d > 0) {
          onDuration(d);
        }
        const t = typeof player.currentTime === "number" ? player.currentTime : 0;
        setVideoTimeSec(t);
        if (samples.length > 0) {
          setActiveIndex(sampleIndexAtTime(samples, t));
        }
      } catch {
        // player may be disposed
      }
    }, 250);
    return () => clearInterval(id);
  }, [player, samples, onDuration]);

  const frame = samples[activeIndex];

  return (
    <View style={{ backgroundColor: colors.bg }}>
      <View style={[styles.media, { backgroundColor: colors.bg }]}>
        <VideoView
          style={styles.videoView}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
          contentFit="contain"
        />
      </View>

      <View style={[styles.gpsBlock, { padding: spacing.md, backgroundColor: colors.bg }]}>
        <Text style={[styles.gpsTitle, { color: colors.text }]}>GPS track</Text>
        <TelemetryPanel frame={frame} sampleCount={samples.length} videoTimeSec={videoTimeSec} />

        <View style={{ height: spacing.sm }} />

        {samples.length > 0 ? (
          mapEnabled ? (
            <OnlineMapWebView samples={samples} activeIndex={activeIndex} height={200} />
          ) : (
            <SchematicRoute samples={samples} activeIndex={activeIndex} height={160} />
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
  scrollContent: { paddingTop: 0 },
  media: { width: "100%", height: 220 },
  videoView: { flex: 1 },
  centerMessage: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 },
  centerText: { textAlign: "center", marginTop: 12, fontSize: 13, lineHeight: 18, fontFamily: Type.font },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  topBarCenter: { flex: 1, marginHorizontal: 4, alignItems: "center" },
  topBarTitle: {
    fontSize: 14,
    fontFamily: Type.fontSemi,
    textAlign: "center",
  },
  metaWrap: { marginTop: 6, width: "100%", maxWidth: 340 },
  gpsBlock: { gap: 0 },
  gpsTitle: { fontSize: 14, fontFamily: Type.fontSemi, marginBottom: 8 },
  noGps: {
    height: 100,
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
  privacy: { fontSize: 11, fontFamily: Type.font, lineHeight: 15, marginTop: 8 },
});
