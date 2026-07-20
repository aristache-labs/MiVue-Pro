import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  OnlineMapWebView,
  SchematicRoute,
  TelemetryPanel,
  loadSiblingNmea,
} from "@/components/gps";
import {
  gpsStatusA11yLabel,
  gpsStatusLabel,
  lookupGpsAtVideoTime,
  normalizeGpsTrack,
  type GpsSyncStatus,
  type NormalizedGpsTrack,
} from "@/components/gps/sampleIndex";
import { formatPlayerCompactMeta, truncatePlayerFilename } from "@/components/player/playerMeta";
import { createUiActionGate } from "@/components/queue/queuePresentation";
import { IconButton } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";

type MapMode = "local" | "online";
type PlaybackUiStatus = "loading" | "ready" | "buffering" | "error" | "unsupported";

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
  const [fileMissing, setFileMissing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!uri) {
      setFileMissing(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (cancelled) return;
        if (!info.exists) {
          setFileMissing(true);
          setSizeBytes(0);
          return;
        }
        setFileMissing(false);
        if ("size" in info && typeof info.size === "number") setSizeBytes(info.size);
      } catch {
        if (!cancelled) {
          setFileMissing(true);
          setSizeBytes(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const meta = useMemo(() => formatPlayerCompactMeta(name, sizeBytes), [name, sizeBytes]);
  const title = truncatePlayerFilename(name);

  const close = useCallback(() => {
    router.back();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />

      {!fullscreen ? (
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.bg,
              paddingTop: Math.max(insets.top, 8),
            },
          ]}
        >
          <View style={styles.titleRow}>
            <IconButton
              icon="close"
              tone="ghost"
              size={28}
              onPress={close}
              accessibilityLabel="Close video player"
            />
            <Text
              style={[styles.topBarTitle, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {title}
            </Text>
            <IconButton
              icon="share-outline"
              tone="ghost"
              size={28}
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
          {meta.when || meta.size ? (
            <View style={styles.metaWrap}>
              <Text
                style={[styles.metaLeft, { color: colors.textMuted }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.35}
              >
                {meta.when ?? "—"}
              </Text>
              {meta.size ? (
                <Text
                  style={[styles.metaRight, { color: colors.textMuted }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.35}
                >
                  {meta.size}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        bounces={false}
        scrollEnabled={!fullscreen}
      >
        {fileMissing ? (
          <View style={styles.centerMessage}>
            <Text style={[styles.centerText, { color: colors.text }]}>
              Video file is no longer available on this device.
            </Text>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close video player"
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: colors.brand,
                  opacity: pressed ? 0.85 : 1,
                  marginTop: 16,
                  minHeight: 44,
                },
              ]}
            >
              <Text style={{ color: colors.onBrand, fontFamily: Type.fontBold }}>Close</Text>
            </Pressable>
          </View>
        ) : null}

        {!fileMissing && uri && isImage ? (
          <View style={[styles.media, { backgroundColor: colors.bg }]}>
            <Image
              source={{ uri }}
              style={styles.videoView}
              resizeMode="contain"
              accessibilityLabel={name}
            />
          </View>
        ) : null}

        {!fileMissing && uri && isVideo ? (
          <VideoWithGps
            uri={uri}
            clipName={name}
            fullscreen={fullscreen}
            onFullscreenChange={setFullscreen}
            onClose={close}
          />
        ) : null}

        {!fileMissing && (!uri || (!isVideo && !isImage)) ? (
          <View style={styles.centerMessage}>
            <Ionicons name="document-outline" size={40} color={colors.textFaint} />
            <Text style={[styles.centerText, { color: colors.textMuted }]}>
              {uri
                ? "This file type has no in-app preview. Use Share to open elsewhere."
                : "Missing media URI."}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function VideoWithGps({
  uri,
  clipName,
  fullscreen,
  onFullscreenChange,
  onClose,
}: {
  readonly uri: string;
  readonly clipName: string;
  readonly fullscreen: boolean;
  readonly onFullscreenChange: (value: boolean) => void;
  readonly onClose: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0;
    instance.staysActiveInBackground = false;
    instance.play();
  });

  const [track, setTrack] = useState<NormalizedGpsTrack | null>(null);
  const [gpsWaiting, setGpsWaiting] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoTimeSec, setVideoTimeSec] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<GpsSyncStatus>("waiting");
  const [mapMode, setMapMode] = useState<MapMode>("local");
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [playStatus, setPlayStatus] = useState<PlaybackUiStatus>("loading");
  const [slowLoad, setSlowLoad] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const wasPlayingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastUiTick = useRef(0);
  const retryGate = useRef(createUiActionGate());
  const savedTimeRef = useRef(0);

  // Load NMEA once; normalize/sort once.
  useEffect(() => {
    let cancelled = false;
    setGpsWaiting(true);
    void (async () => {
      const loaded = await loadSiblingNmea(uri);
      if (cancelled || !mountedRef.current) return;
      setGpsWaiting(false);
      if (!loaded || loaded.length === 0) {
        setTrack({ samples: [], timesMs: [], startMs: 0, partial: false });
        setGpsStatus("unavailable");
        return;
      }
      const normalized = normalizeGpsTrack(loaded, durationSec > 0 ? durationSec : undefined);
      setTrack(normalized);
      if (normalized.samples.length === 0) setGpsStatus("unavailable");
      else if (normalized.partial) setGpsStatus("partial");
      else setGpsStatus("synchronized");
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  // Re-evaluate partial when duration becomes known.
  useEffect(() => {
    if (!track || track.samples.length === 0 || durationSec <= 0) return;
    const again = normalizeGpsTrack(track.samples, durationSec);
    if (again.partial !== track.partial) setTrack(again);
  }, [durationSec]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional

  // Player status + cleanup
  useEffect(() => {
    mountedRef.current = true;
    const slowTimer = setTimeout(() => {
      if (mountedRef.current) setSlowLoad(true);
    }, 4000);

    const onStatus = (payload: { status: string; error?: { message?: string } }) => {
      if (!mountedRef.current) return;
      if (payload.status === "loading") setPlayStatus("loading");
      else if (payload.status === "readyToPlay") {
        setPlayStatus("ready");
        setSlowLoad(false);
      } else if (payload.status === "error") {
        const msg = (payload.error?.message ?? "").toLowerCase();
        if (msg.includes("unsupported") || msg.includes("format") || msg.includes("codec")) {
          setPlayStatus("unsupported");
        } else {
          setPlayStatus("error");
        }
      }
    };

    const subStatus = player.addListener("statusChange", onStatus);
    const subPlaying = player.addListener("playingChange", (p: { isPlaying: boolean }) => {
      wasPlayingRef.current = p.isPlaying;
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(slowTimer);
      subStatus.remove();
      subPlaying.remove();
      try {
        player.pause();
      } catch {
        // disposed
      }
    };
  }, [player]);

  const trackRef = useRef(track);
  trackRef.current = track;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const gpsStatusRef = useRef(gpsStatus);
  gpsStatusRef.current = gpsStatus;
  const playStatusRef = useRef(playStatus);
  playStatusRef.current = playStatus;
  const durationRef = useRef(durationSec);
  durationRef.current = durationSec;

  // Throttled GPS/UI sync (~4–5 Hz). Does not recreate player or map geometry.
  useEffect(() => {
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      try {
        const d = player.duration;
        if (typeof d === "number" && Number.isFinite(d) && d > 0 && d !== durationRef.current) {
          setDurationSec(d);
        }
        const t = typeof player.currentTime === "number" ? player.currentTime : 0;
        savedTimeRef.current = t;

        const now = Date.now();
        if (now - lastUiTick.current < 220) return;
        lastUiTick.current = now;

        if (player.status === "loading" && playStatusRef.current === "ready") {
          setPlayStatus("buffering");
        } else if (player.status === "readyToPlay" && playStatusRef.current === "buffering") {
          setPlayStatus("ready");
        }

        setVideoTimeSec((prev) => (Math.abs(prev - t) >= 0.05 ? t : prev));

        const currentTrack = trackRef.current;
        if (currentTrack && currentTrack.samples.length > 0) {
          const lookup = lookupGpsAtVideoTime(currentTrack, t);
          if (lookup.index !== activeIndexRef.current) setActiveIndex(lookup.index);
          if (lookup.status !== gpsStatusRef.current) setGpsStatus(lookup.status);
        }
      } catch {
        // player may be disposed
      }
    }, 200);
    return () => clearInterval(id);
  }, [player]);

  // Background: do not force play on resume if user had paused.
  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next !== "active") {
        try {
          wasPlayingRef.current = player.playing;
        } catch {
          // ignore
        }
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [player]);

  const frame = track?.samples[activeIndex];
  const showGpsChrome = !fullscreen;
  const mapModeLabel = mapMode === "online" ? "Online map" : "Local map";

  const retryPlayback = () => {
    void retryGate.current(async () => {
      const resumeAt = savedTimeRef.current;
      setPlayStatus("loading");
      try {
        player.replace(uri);
        player.currentTime = resumeAt;
        player.play();
      } catch {
        setPlayStatus("error");
      }
    });
  };

  const statusDotColor =
    gpsStatus === "synchronized"
      ? colors.brand
      : gpsStatus === "partial"
        ? colors.warn
        : colors.textMuted;

  return (
    <View style={{ backgroundColor: colors.bg }}>
      <View style={[styles.media, { backgroundColor: "#000" }]}>
        <VideoView
          style={styles.videoView}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
          contentFit="contain"
          fullscreenOptions={{ enable: true, orientation: "landscape" }}
          onFullscreenEnter={() => onFullscreenChange(true)}
          onFullscreenExit={() => onFullscreenChange(false)}
        />

        {(playStatus === "loading" || playStatus === "buffering") && (
          <View style={styles.overlay} pointerEvents="none" accessibilityLabel="Video buffering">
            <ActivityIndicator size="large" color="#fff" />
            {playStatus === "loading" && slowLoad ? (
              <Text style={styles.overlayText}>Loading video…</Text>
            ) : null}
          </View>
        )}

        {(playStatus === "error" || playStatus === "unsupported") && (
          <View style={[styles.overlay, styles.errorOverlay]}>
            <Text style={styles.overlayText}>
              {playStatus === "unsupported"
                ? "This video format is not supported on this device."
                : "Unable to play this video."}
            </Text>
            <View style={styles.errorActions}>
              {playStatus === "error" ? (
                <Pressable
                  onPress={retryPlayback}
                  accessibilityRole="button"
                  accessibilityLabel="Retry video playback"
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1, minHeight: 44 },
                  ]}
                >
                  <Text style={{ color: colors.onBrand, fontFamily: Type.fontBold }}>Retry</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close video player"
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: "rgba(255,255,255,0.15)",
                    opacity: pressed ? 0.85 : 1,
                    minHeight: 44,
                  },
                ]}
              >
                <Text style={{ color: "#fff", fontFamily: Type.fontBold }}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {showGpsChrome ? (
        <View style={[styles.gpsBlock, { padding: spacing.md, backgroundColor: colors.bg }]}>
          <View style={styles.gpsHeader}>
            <Text style={[styles.gpsTitle, { color: colors.text }]}>GPS track</Text>
            <View
              style={styles.gpsStatusWrap}
              accessible
              accessibilityLabel={gpsStatusA11yLabel(gpsWaiting ? "waiting" : gpsStatus)}
            >
              {gpsWaiting || gpsStatus === "synchronized" || gpsStatus === "partial" ? (
                <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
              ) : null}
              <Text
                style={[
                  styles.gpsStatusText,
                  {
                    color:
                      gpsStatus === "synchronized"
                        ? colors.brand
                        : gpsWaiting
                          ? colors.textMuted
                          : colors.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {gpsWaiting ? gpsStatusLabel("waiting") : gpsStatusLabel(gpsStatus)}
              </Text>
            </View>
          </View>

          <View style={styles.mapModeRow}>
            <Pressable
              onPress={() => setMapMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose map type"
              hitSlop={8}
              style={({ pressed }) => [
                styles.mapModeBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                  opacity: pressed ? 0.8 : 1,
                  minHeight: 44,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontFamily: Type.fontSemi, fontSize: 13 }}>
                {mapModeLabel} ▾
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPrivacyOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Map privacy"
              hitSlop={8}
              style={({ pressed }) => [
                styles.privacyLink,
                { opacity: pressed ? 0.7 : 1, minHeight: 44 },
              ]}
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontFamily: Type.font, fontSize: 12, marginLeft: 4 }}>
                Map privacy
              </Text>
            </Pressable>
          </View>

          <TelemetryPanel frame={frame} videoTimeSec={videoTimeSec} clipName={clipName} />

          <View style={{ height: spacing.sm }} />

          {gpsWaiting ? (
            <View style={[styles.noGps, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.brand} />
              <Text style={[styles.noGpsText, { color: colors.textMuted, marginTop: 8 }]}>
                Waiting for GPS data
              </Text>
            </View>
          ) : track && track.samples.length > 0 ? (
            mapMode === "online" ? (
              <OnlineMapWebView
                samples={track.samples}
                activeIndex={activeIndex}
                height={200}
                onUseLocalMap={() => setMapMode("local")}
              />
            ) : (
              <SchematicRoute samples={track.samples} activeIndex={activeIndex} height={160} />
            )
          ) : (
            <View style={[styles.noGps, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.noGpsText, { color: colors.textMuted }]}>GPS unavailable</Text>
            </View>
          )}
        </View>
      ) : null}

      <Modal visible={mapMenuOpen} transparent animationType="fade" onRequestClose={() => setMapMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMapMenuOpen(false)} />
        <View style={[styles.menuCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <MenuRow
            label="Online map"
            selected={mapMode === "online"}
            onPress={() => {
              setMapMode("online");
              setMapMenuOpen(false);
            }}
            a11y="Use online map"
            colors={colors}
          />
          <MenuRow
            label="Local schematic map"
            selected={mapMode === "local"}
            onPress={() => {
              setMapMode("local");
              setMapMenuOpen(false);
            }}
            a11y="Use local schematic map"
            colors={colors}
          />
          <MenuRow
            label="Map privacy"
            selected={false}
            onPress={() => {
              setMapMenuOpen(false);
              setPrivacyOpen(true);
            }}
            a11y="Map privacy"
            colors={colors}
          />
        </View>
      </Modal>

      <Modal visible={privacyOpen} transparent animationType="fade" onRequestClose={() => setPrivacyOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setPrivacyOpen(false)} />
        <View style={[styles.privacyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.privacyTitle, { color: colors.text }]}>Map privacy</Text>
          <Text style={[styles.privacyBody, { color: colors.textMuted }]}>
            Local schematic map works entirely on this device.
          </Text>
          <Text style={[styles.privacyBody, { color: colors.textMuted }]}>
            When Online map is enabled, the visible map area is requested from the configured tile
            provider. Laneory does not upload the video or the complete GPS track.
          </Text>
          <Text style={[styles.privacyBody, { color: colors.textMuted }]}>
            Public map tiles may be unavailable and are not guaranteed as a product dependency.
          </Text>
          <Pressable
            onPress={() => setPrivacyOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.brand,
                opacity: pressed ? 0.85 : 1,
                marginTop: 16,
                minHeight: 44,
                alignSelf: "stretch",
              },
            ]}
          >
            <Text style={{ color: colors.onBrand, fontFamily: Type.fontBold }}>Done</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function MenuRow({
  label,
  selected,
  onPress,
  a11y,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  a11y: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y}
      style={({ pressed }) => [
        styles.menuRow,
        { opacity: pressed ? 0.75 : 1, minHeight: 44 },
      ]}
    >
      <Text style={{ color: colors.text, fontFamily: Type.fontSemi, fontSize: 15, flex: 1 }}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 0 },
  media: {
    width: "100%",
    aspectRatio: 16 / 9,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  videoView: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 24,
  },
  errorOverlay: { backgroundColor: "rgba(0,0,0,0.72)" },
  overlayText: {
    color: "#fff",
    fontFamily: Type.fontSemi,
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  errorActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  centerMessage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  centerText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Type.font,
  },
  topBar: {
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Type.fontSemi,
    textAlign: "center",
    marginHorizontal: 4,
  },
  metaWrap: {
    marginTop: 4,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  metaLeft: { flex: 1, fontSize: 12, fontFamily: Type.font, lineHeight: 16 },
  metaRight: { fontSize: 12, fontFamily: Type.monoMed, lineHeight: 16 },
  gpsBlock: { gap: 0 },
  gpsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
    minHeight: 28,
  },
  gpsTitle: { fontSize: 14, fontFamily: Type.fontSemi, flexShrink: 0 },
  gpsStatusWrap: { flexDirection: "row", alignItems: "center", flexShrink: 1, minWidth: 0 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  gpsStatusText: { fontSize: 12, fontFamily: Type.fontSemi, flexShrink: 1 },
  mapModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  mapModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  privacyLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  noGps: {
    minHeight: 100,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noGpsText: { fontSize: 13, fontFamily: Type.font, textAlign: "center" },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  menuCard: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "35%",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  privacyCard: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "22%",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  privacyTitle: { fontSize: 18, fontFamily: Type.fontBold, marginBottom: 10 },
  privacyBody: { fontSize: 13, fontFamily: Type.font, lineHeight: 19, marginTop: 8 },
});
