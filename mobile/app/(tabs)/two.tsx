import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { parseRecordedParts, transferRateBps } from "@/components/mediaMeta";
import {
  actionsForStatus,
  filterVisibleQueueItems,
  formatCompactDateTime,
  formatDurationHuman,
  formatEtaRemaining,
  formatQueueSummary,
  formatSizeMb,
  isExpandedCard,
  queueDisplayPosition,
  smoothRate,
  sortQueueForDisplay,
  type QueueAction,
} from "@/components/queue/queuePresentation";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { QueueItem } from "@/packages/local-db/src/index";

const THUMB_W = 72;
const THUMB_H = 54;

function kindFromName(name: string): "video" | "image" | "other" {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) return "image";
  return "other";
}

function statusBadge(status: QueueItem["status"]): {
  label: string;
  fg: string;
  bg: string;
} {
  // Colors resolved in component via theme tokens.
  return {
    label:
      status === "active"
        ? "Downloading"
        : status === "paused"
          ? "Paused"
          : status === "queued"
            ? "Queued"
            : status === "failed"
              ? "Failed"
              : status === "cancelled"
                ? "Cancelled"
                : "Done",
    fg: status,
    bg: status,
  };
}

export default function QueueScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const navigation = useNavigation();
  const {
    demoMode,
    queueItems,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    removeFromQueue,
    enqueueDownload,
    lastError,
    downloadDir,
    files,
  } = useDemoMode();

  const startedAtRef = useRef(new Map<string, number>());
  const smoothedRateRef = useRef(new Map<string, number>());
  const busyRef = useRef<string | undefined>(undefined);
  const lastAnnouncedRef = useRef<Map<string, string>>(new Map());
  const [, setTick] = useState(0);

  const visibleItems = useMemo(
    () => sortQueueForDisplay(filterVisibleQueueItems(queueItems)),
    [queueItems],
  );

  const summary = useMemo(() => formatQueueSummary(visibleItems), [visibleItems]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.navTitleWrap}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Download queue</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
      ),
    });
  }, [navigation, summary, colors.text, colors.textMuted]);

  useEffect(() => {
    const hasActive = visibleItems.some((i) => i.status === "active");
    if (!hasActive) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [visibleItems]);

  // Announce meaningful status transitions (not every percent tick).
  useEffect(() => {
    for (const item of visibleItems) {
      const prev = lastAnnouncedRef.current.get(item.id);
      if (prev === item.status) continue;
      lastAnnouncedRef.current.set(item.id, item.status);
      if (prev === undefined && item.status === "queued") continue;
      let message: string | undefined;
      if (item.status === "active") message = `Download started for ${item.localName}`;
      else if (item.status === "paused") message = `Download paused for ${item.localName}`;
      else if (item.status === "failed") message = `Download failed for ${item.localName}`;
      else if (item.status === "cancelled") message = `Download cancelled for ${item.localName}`;
      if (message) void AccessibilityInfo.announceForAccessibility(message);
    }
  }, [visibleItems]);

  const durationByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) {
      if (f.durationSeconds !== undefined) map.set(f.name, f.durationSeconds);
    }
    return map;
  }, [files]);

  const runAction = useCallback(
    async (item: QueueItem, action: QueueAction) => {
      const key = `${item.id}:${action}`;
      if (busyRef.current) return;
      busyRef.current = key;
      try {
        if (action === "pause") await pauseDownload(item.id);
        else if (action === "resume") await resumeDownload(item.id);
        else if (action === "cancel") await cancelDownload(item.id);
        else if (action === "remove") {
          // Queued items must be cancelled (still in the transfer lane).
          if (item.status === "queued") await cancelDownload(item.id);
          else await removeFromQueue(item.id);
        } else if (action === "retry") {
          const remote = files.find((f) => f.name === item.localName);
          await removeFromQueue(item.id);
          if (remote) await enqueueDownload(remote);
        }
      } finally {
        busyRef.current = undefined;
      }
    },
    [pauseDownload, resumeDownload, cancelDownload, removeFromQueue, enqueueDownload, files],
  );

  const badgeColors = (status: QueueItem["status"]) => {
    switch (status) {
      case "active":
        return { fg: colors.brand, bg: colors.brandSoft };
      case "paused":
        return { fg: colors.warn, bg: colors.warnSoft };
      case "queued":
        return { fg: colors.textMuted, bg: colors.surfaceMuted };
      case "failed":
        return { fg: colors.danger, bg: colors.dangerSoft };
      case "cancelled":
        return { fg: colors.textMuted, bg: colors.surfaceMuted };
      default:
        return { fg: colors.success, bg: colors.successSoft };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingHorizontal: spacing.lg }]}>
      {demoMode ? (
        <View style={[styles.demoRow, { paddingTop: spacing.md }]}>
          <Badge label="Demo Mode" tone="demo" icon="flask-outline" />
        </View>
      ) : (
        <View style={{ height: spacing.sm }} />
      )}

      {lastError ? <Text style={[styles.error, { color: colors.danger }]}>{lastError}</Text> : null}

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 96 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="cloud-download-outline"
            title="No downloads in queue"
            subtitle="Files added from Library will appear here."
          />
        }
        renderItem={({ item }) => {
          const kind = kindFromName(item.localName);
          const localUri = downloadDir.endsWith("/")
            ? `${downloadDir}${item.localName}`
            : `${downloadDir}/${item.localName}`;
          const when = formatCompactDateTime(item.localName, parseRecordedParts);
          const durationSec = durationByName.get(item.localName);
          const durationLabel =
            durationSec !== undefined && durationSec > 0 ? formatDurationHuman(durationSec) : undefined;
          const sizeLabel =
            item.expectedBytes > 0 ? formatSizeMb(item.expectedBytes) : undefined;

          const received = item.bytesReceived ?? 0;
          const total = item.expectedBytes > 0 ? item.expectedBytes : 0;
          const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
          const expanded = isExpandedCard(item.status);
          const actions = actionsForStatus(item.status);
          const position = queueDisplayPosition(visibleItems, item.id);
          const badge = statusBadge(item.status);
          const tone = badgeColors(item.status);

          if (item.status === "active" && received > 0 && !startedAtRef.current.has(item.id)) {
            startedAtRef.current.set(item.id, Date.now());
          }
          if (item.status !== "active") {
            startedAtRef.current.delete(item.id);
            smoothedRateRef.current.delete(item.id);
          }

          const startedAt = startedAtRef.current.get(item.id);
          let rateLabel: string | undefined;
          let etaLabel: string | undefined;
          if (item.status === "active" && startedAt !== undefined && received > 0 && total > 0) {
            const instant = transferRateBps(received, startedAt);
            if (instant !== undefined) {
              const prev = smoothedRateRef.current.get(item.id) ?? 0;
              const smoothed = smoothRate(prev, instant);
              smoothedRateRef.current.set(item.id, smoothed);
              const mib = smoothed / (1024 * 1024);
              rateLabel =
                mib >= 0.1
                  ? `${mib.toFixed(1).replace(".", ",")} MB/s`
                  : `${(smoothed / 1024).toFixed(0)} KB/s`;
              const remaining = (total - received) / smoothed;
              if (Number.isFinite(remaining) && remaining > 0 && received / total > 0.02) {
                etaLabel = formatEtaRemaining(remaining);
              }
            }
          }

          const metaSecond = [sizeLabel, durationLabel].filter(Boolean).join(" · ");

          const a11yStatus =
            item.status === "active"
              ? `Downloading ${item.localName}, ${percent} percent`
              : item.status === "queued" && position !== undefined
                ? `Queued in position ${position}`
                : `${badge.label} ${item.localName}`;

          return (
            <Card
              style={[
                styles.card,
                {
                  padding: expanded ? 14 : 12,
                  borderRadius: radius.md,
                  opacity: item.status === "queued" ? 0.96 : 1,
                },
              ]}
              accessibilityLabel={a11yStatus}
            >
              <View style={styles.row}>
                <View style={styles.thumbWrap} importantForAccessibility="no-hide-descendants">
                  <VideoThumbnail uri={localUri} kind={kind} width={THUMB_W} height={THUMB_H} />
                </View>

                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {item.localName}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: tone.fg }]}>
                        {item.status === "queued" && position !== undefined
                          ? `Queued · #${position}`
                          : badge.label}
                      </Text>
                    </View>
                  </View>

                  {when ? (
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                      {when}
                    </Text>
                  ) : null}

                  {metaSecond ? (
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                      {metaSecond}
                    </Text>
                  ) : null}
                </View>
              </View>

              {expanded ? (
                <View style={styles.progressBlock}>
                  {item.status === "active" && received === 0 ? (
                    <View style={styles.waitingRow}>
                      <ActivityIndicator size="small" color={colors.brand} />
                      <Text style={[styles.waitingText, { color: colors.textMuted }]}>
                        Starting download…
                      </Text>
                    </View>
                  ) : (
                    <>
                      {total > 0 ? (
                        <Text style={[styles.progressMeta, { color: colors.textMuted }]}>
                          {formatSizeMb(received)} / {formatSizeMb(total)}
                          {rateLabel ? ` · ${rateLabel}` : ""}
                        </Text>
                      ) : null}

                      <View style={styles.barRow}>
                        <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${Math.max(percent, percent > 0 ? percent : 2)}%`,
                                backgroundColor: colors.brand,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.percent, { color: colors.brand }]}>{percent}%</Text>
                      </View>

                      {etaLabel ? (
                        <Text style={[styles.eta, { color: colors.textMuted }]}>{etaLabel}</Text>
                      ) : item.status === "paused" ? (
                        <Text style={[styles.eta, { color: colors.textMuted }]}>Paused</Text>
                      ) : null}
                    </>
                  )}

                  {item.errorMessage ? (
                    <Text style={[styles.error, { color: colors.danger }]}>{item.errorMessage}</Text>
                  ) : null}
                </View>
              ) : null}

              {item.status === "failed" && item.errorMessage ? (
                <Text style={[styles.error, { color: colors.danger, marginTop: 6 }]}>
                  {item.errorMessage}
                </Text>
              ) : null}

              {actions.length > 0 ? (
                <View style={[styles.actions, { marginTop: expanded ? 12 : 8 }]}>
                  {actions.map((action) => {
                    const isDanger = action === "cancel" || action === "remove";
                    const isWarn = action === "pause" || action === "resume";
                    const label =
                      action === "pause"
                        ? "Pause"
                        : action === "resume"
                          ? "Resume"
                          : action === "cancel"
                            ? "Cancel"
                            : action === "retry"
                              ? "Retry"
                              : "Remove";
                    const a11y =
                      action === "pause"
                        ? `Pause download ${item.localName}`
                        : action === "resume"
                          ? `Resume download ${item.localName}`
                          : action === "cancel"
                            ? `Cancel download ${item.localName}`
                            : action === "retry"
                              ? `Retry download ${item.localName}`
                              : `Remove ${item.localName} from queue`;
                    const icon: keyof typeof Ionicons.glyphMap =
                      action === "pause"
                        ? "pause"
                        : action === "resume"
                          ? "play"
                          : action === "retry"
                            ? "refresh"
                            : action === "remove"
                              ? "trash-outline"
                              : "close";
                    const fg = isDanger ? colors.danger : isWarn ? colors.warn : colors.brand;
                    const bg = isDanger
                      ? "transparent"
                      : isWarn
                        ? colors.warnSoft
                        : colors.brandSoft;
                    const border = isDanger ? colors.danger : isWarn ? colors.warn : colors.brand;

                    return (
                      <Pressable
                        key={action}
                        onPress={() => void runAction(item, action)}
                        accessibilityRole="button"
                        accessibilityLabel={a11y}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          {
                            borderColor: border,
                            backgroundColor: bg,
                            borderRadius: radius.sm,
                            opacity: pressed ? 0.75 : 1,
                            flex: expanded || actions.length > 1 ? 1 : undefined,
                            minWidth: actions.length === 1 ? 120 : undefined,
                          },
                        ]}
                      >
                        <Ionicons name={icon} size={15} color={fg} style={{ marginRight: 6 }} />
                        <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  demoRow: { flexDirection: "row", justifyContent: "flex-end" },
  navTitleWrap: { alignItems: Platform.OS === "ios" ? "center" : "flex-start" },
  navTitle: { fontSize: 17, fontFamily: Type.fontBold },
  navSubtitle: { fontSize: 11, fontFamily: Type.font, marginTop: 1 },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4 },
  card: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumbWrap: { borderRadius: 8, overflow: "hidden" },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: Type.fontSemi, fontSize: 14, lineHeight: 18 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontFamily: Type.fontSemi },
  meta: { fontSize: 12, fontFamily: Type.font, marginTop: 2, lineHeight: 16 },
  progressBlock: { marginTop: 12 },
  progressMeta: { fontSize: 12, fontFamily: Type.monoMed, marginBottom: 6 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  percent: { fontSize: 12, fontFamily: Type.fontSemi, minWidth: 36, textAlign: "right" },
  eta: { fontSize: 12, fontFamily: Type.font, marginTop: 6 },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  waitingText: { fontSize: 12, fontFamily: Type.font },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "flex-end" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  actionLabel: { fontSize: 13, fontFamily: Type.fontSemi },
});
