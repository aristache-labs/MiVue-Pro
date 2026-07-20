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
  interpolateGpsAtVideoTime,
  loadSiblingNmea,
  zoomForSpeedKmh,
} from "@/components/gps";
import {
  gpsStatusA11yLabel,
  gpsStatusLabel,
  normalizeGpsTrack,
  type GpsSyncStatus,
  type NormalizedGpsTrack,
} from "@/components/gps/sampleIndex";
import type { MapFollowPose } from "@/components/gps/OnlineMapWebView";
import { PlayerMetaCard } from "@/components/player/PlayerMetaCard";
import { truncatePlayerFilename } from "@/components/player/playerMeta";
import { createUiActionGate } from "@/components/queue/queuePresentation";
import { IconButton } from "@/components/ui";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { FileCategory, GpsSample } from "@/packages/parsers/src/index";

type MapMode = "local" | "online";
type PlaybackUiStatus = "loading" | "ready" | "buffering" | "error" | "unsupported";

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ uri?: string; name?: string; kind?: string }>();
  const uri = typeof params.uri === "string" ? params.uri : "";
  const name = typeof params.name === "string" ? params.name : "Media";
  const kind = typeof params.kind === "string" ? params.kind : "other";
  const { shareLocalFile, files } = useDemoMode();
  const { colors, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isVideo = kind === "video" || name.toLowerCase().endsWith(".mp4");
  const isImage =
    kind === "image" ||
    name.toLowerCase().endsWith(".jpg") ||
    name.toLowerCase().endsWith(".jpeg");

  const [sizeBytes, setSizeBytes] = useState(0);
  const [durationSec, setDurationSec] = useState<number | undefined>();
  const [fileMissing, setFileMissing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const category: FileCategory | undefined = useMemo(() => {
    if (isImage) return "photo";
    const remote = files.find((f) => f.name === name);
    if (!remote) return undefined;
    if (
      remote.category === "normal" ||
      remote.category === "parking" ||
      remote.category === "event" ||
      remote.category === "photo"
    ) {
      return remote.category;
    }
    return undefined;
  }, [files, name, isImage]);

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
            <View style={styles.titleCenter}>
              <Text
                style={[styles.topBarTitle, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {title}
              </Text>
              {category ? (
                <View
                  style={[
                    styles.catBadge,
                    { backgroundColor: categoryColor(category, scheme) + "22" },
                  ]}
                  accessibilityLabel={CATEGORY_LABEL[category]}
                >
                  <Text
                    style={[styles.catBadgeText, { color: categoryColor(category, scheme) }]}
                    numberOfLines={1}
                  >
                    {CATEGORY_LABEL[category]}
                  </Text>
                </View>
              ) : null}
            </View>
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
        </View>
      ) : null}

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        bounces={false}
        scrollEnabled={!fullscreen}
      >
        {!fullscreen && !fileMissing ? (
          <PlayerMetaCard name={name} sizeBytes={sizeBytes} durationSeconds={durationSec} />
        ) : null}

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
            onDuration={setDurationSec}
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
  onDuration,
}: {
  readonly uri: string;
  readonly clipName: string;
  readonly fullscreen: boolean;
  readonly onFullscreenChange: (value: boolean) => void;
  readonly onClose: () => void;
  readonly onDuration: (seconds: number) => void;
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
  const [playStatus, setPlayStatus] = useState<PlaybackUiStatus>("loading");
  const [slowLoad, setSlowLoad] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [following, setFollowing] = useState(true);
  const [mapPose, setMapPose] = useState<MapFollowPose | null>(null);
  const [telemetryFrame, setTelemetryFrame] = useState<GpsSample | undefined>(undefined);

  const wasPlayingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastUiTick = useRef(0);
  const retryGate = useRef(createUiActionGate());
  const savedTimeRef = useRef(0);
  const bearingRef = useRef(0);
  const zoomRef = useRef(16);
  const followingRef = useRef(true);
  followingRef.current = following;

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

  // Throttled GPS/UI sync (~5 Hz). Interpolates pose; does not recreate map/player.
  useEffect(() => {
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      try {
        const d = player.duration;
        if (typeof d === "number" && Number.isFinite(d) && d > 0 && d !== durationRef.current) {
          setDurationSec(d);
          onDuration(d);
        }
        const t = typeof player.currentTime === "number" ? player.currentTime : 0;
        savedTimeRef.current = t;

        const now = Date.now();
        if (now - lastUiTick.current < 180) return;
        lastUiTick.current = now;

        if (player.status === "loading" && playStatusRef.current === "ready") {
          setPlayStatus("buffering");
        } else if (player.status === "readyToPlay" && playStatusRef.current === "buffering") {
          setPlayStatus("ready");
        }

        setVideoTimeSec((prev) => (Math.abs(prev - t) >= 0.05 ? t : prev));

        const currentTrack = trackRef.current;
        if (currentTrack && currentTrack.samples.length > 0) {
          const pose = interpolateGpsAtVideoTime(currentTrack, t, bearingRef.current);
          if (!pose) return;
          bearingRef.current = pose.bearingDeg;
          zoomRef.current = zoomForSpeedKmh(pose.speedKmh, zoomRef.current);
          if (pose.index !== activeIndexRef.current) setActiveIndex(pose.index);
          if (pose.status !== gpsStatusRef.current) setGpsStatus(pose.status);
          setTelemetryFrame(pose.sample);
          setMapPose({
            latitude: pose.latitude,
            longitude: pose.longitude,
            bearingDeg: pose.bearingDeg,
            zoom: zoomRef.current,
            index: pose.index,
            following: followingRef.current,
          });
        }
      } catch {
        // player may be disposed
      }
    }, 180);
    return () => clearInterval(id);
  }, [player, onDuration]);

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

  const frame = telemetryFrame ?? track?.samples[activeIndex];
  const showGpsChrome = !fullscreen;
  const mapModeLabel = mapMode === "online" ? "Online map" : "Local schematic";
  const isFollowingUi =
    following && mapMode === "online" && (gpsStatus === "synchronized" || gpsStatus === "partial");
  const isExploreUi = mapMode === "online" && !following && !gpsWaiting && (track?.samples.length ?? 0) > 0;
  const headerStatusLabel = gpsWaiting
    ? gpsStatusLabel("waiting")
    : isExploreUi
      ? "Explore mode"
      : isFollowingUi
        ? "Following"
        : gpsStatusLabel(gpsStatus);
  const statusTextColor =
    isFollowingUi || gpsStatus === "synchronized" ? colors.brand : colors.textMuted;

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
              accessibilityLabel={
                isExploreUi
                  ? "Explore mode"
                  : isFollowingUi
                    ? "Following GPS on map"
                    : gpsStatusA11yLabel(gpsWaiting ? "waiting" : gpsStatus)
              }
            >
              {gpsWaiting ||
              gpsStatus === "synchronized" ||
              gpsStatus === "partial" ||
              isFollowingUi ? (
                <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
              ) : null}
              <Text
                style={[styles.gpsStatusText, { color: statusTextColor }]}
                numberOfLines={1}
              >
                {headerStatusLabel}
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
                pose={mapPose}
                height={220}
                following={following}
                onUseLocalMap={() => setMapMode("local")}
                onUserMoved={() => setFollowing(false)}
                onRecenter={() => setFollowing(true)}
              />
            ) : (
              <SchematicRoute samples={track.samples} activeIndex={activeIndex} height={160} />
            )
          ) : (
            <View style={[styles.noGps, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.noGpsText, { color: colors.textMuted }]}>GPS unavailable</Text>
            </View>
          )}

          {track && track.samples.length > 0 ? (
            <Text style={[styles.privacyInline, { color: colors.textFaint }]}>
              Local schematic works entirely on this device. Online map requests only the visible map
              area from the configured tile provider after you enable it. Laneory does not upload the
              video or the complete GPS track.
            </Text>
          ) : null}
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
              setFollowing(true);
              setMapMenuOpen(false);
            }}
            a11y="Use online map"
            colors={colors}
          />
          <MenuRow
            label="Local schematic"
            selected={mapMode === "local"}
            onPress={() => {
              setMapMode("local");
              setMapMenuOpen(false);
            }}
            a11y="Use local schematic map"
            colors={colors}
          />
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
    fontSize: 15,
    fontFamily: Type.fontSemi,
    textAlign: "center",
    maxWidth: "100%",
  },
  titleCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    minWidth: 0,
  },
  catBadge: {
    marginTop: 2,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  catBadgeText: { fontSize: 10, fontFamily: Type.fontSemi },
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
  privacyInline: {
    fontSize: 11,
    fontFamily: Type.font,
    lineHeight: 15,
    marginTop: 10,
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
});
