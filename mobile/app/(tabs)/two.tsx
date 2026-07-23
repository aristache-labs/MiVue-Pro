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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { friendlyConnectionError } from "@/components/camera/cameraLibraryModel";
import { parseRecordedParts, formatDuration, transferRateBps } from "@/components/mediaMeta";
import {
  actionsForStatus,
  createQueueActionGate,
  filterVisibleQueueItems,
  formatCompactDateTime,
  formatQueueSummary,
  formatSizeMb,
  isExpandedCard,
  QUEUE_ACTION_GAP,
  QUEUE_ACTION_HIT_SLOP,
  QUEUE_ACTION_MIN_WIDTH,
  QUEUE_ACTION_VISUAL_HEIGHT,
  QUEUE_LIST_BOTTOM_PADDING,
  queueDisplayPosition,
  queueStatusAnnouncement,
  queueThumbSize,
  resolveEtaDisplay,
  smoothRate,
  sortQueueForDisplay,
  type QueueAction,
} from "@/components/queue/queuePresentation";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueueThumbnail } from "@/components/QueueThumbnail";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { QueueItem } from "@/packages/local-db/src/index";

function kindFromName(name: string): "video" | "image" | "other" {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) return "image";
  return "other";
}

function statusLabel(status: QueueItem["status"]): string {
  switch (status) {
    case "active":
      return "Downloading";
    case "paused":
      return "Paused";
    case "queued":
      return "Queued";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Done";
  }
}

export default function QueueScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    demoMode,
    queueItems,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    retryDownload,
    removeFromQueue,
    enqueueDownload,
    lastError,
    cameraLinkState,
    files,
  } = useDemoMode();

  const startedAtRef = useRef(new Map<string, number>());
  const smoothedRateRef = useRef(new Map<string, number>());
  const actionGateRef = useRef(createQueueActionGate());
  const [actionBusy, setActionBusy] = useState(false);
  const lastAnnouncedRef = useRef(new Map<string, string>());
  const [, setTick] = useState(0);

  const visibleItems = useMemo(
    () => sortQueueForDisplay(filterVisibleQueueItems(queueItems)),
    [queueItems],
  );

  const summary = useMemo(() => formatQueueSummary(visibleItems), [visibleItems]);

  const hasQueueWork = useMemo(
    () =>
      visibleItems.some(
        (item) => item.status === "active" || item.status === "paused" || item.status === "queued",
      ),
    [visibleItems],
  );

  const [errorDismissed, setErrorDismissed] = useState(false);
  useEffect(() => {
    setErrorDismissed(false);
  }, [lastError]);

  const showConnectionError =
    cameraLinkState === "connection_lost";
  const queueErrorBanner =
    hasQueueWork && showConnectionError && !errorDismissed
      ? friendlyConnectionError(lastError)
      : undefined;

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

  useEffect(() => {
    for (const item of queueItems) {
      if (/\.nmea$/i.test(item.localName)) continue;
      const prev = lastAnnouncedRef.current.get(item.id);
      if (prev === item.status) continue;
      lastAnnouncedRef.current.set(item.id, item.status);
      const message = queueStatusAnnouncement(item.localName, prev, item.status);
      if (message) void AccessibilityInfo.announceForAccessibility(message);
    }
  }, [queueItems]);

  const listBottomPad = Math.max(QUEUE_LIST_BOTTOM_PADDING, 64 + insets.bottom);

  const durationByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) {
      if (f.durationSeconds !== undefined) map.set(f.name, f.durationSeconds);
    }
    return map;
  }, [files]);

  const runAction = useCallback(
    async (item: QueueItem, action: QueueAction) => {
      await actionGateRef.current(async () => {
        setActionBusy(true);
        try {
          if (action === "pause") await pauseDownload(item.id);
          else if (action === "resume") await resumeDownload(item.id);
          else if (action === "cancel") await cancelDownload(item.id);
          else if (action === "remove") {
            if (item.status === "queued") await cancelDownload(item.id);
            else await removeFromQueue(item.id);
          } else if (action === "retry") {
            const remote = files.find((f) => f.name === item.localName);
            // Same queue row: enqueue reuses failed; fallback retry by id.
            if (remote) await enqueueDownload(remote);
            else await retryDownload(item.id);
          }
        } finally {
          setActionBusy(false);
        }
      });
    },
    [
      pauseDownload,
      resumeDownload,
      cancelDownload,
      removeFromQueue,
      enqueueDownload,
      retryDownload,
      files,
    ],
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
      default:
        return { fg: colors.textMuted, bg: colors.surfaceMuted };
    }
  };

  const renderActions = (item: QueueItem, compact: boolean) => {
    const actions = actionsForStatus(item.status);
    if (actions.length === 0) return null;

    return (
      <View style={[styles.actions, compact && styles.actionsInline]}>
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
          const bg = isDanger ? "transparent" : isWarn ? colors.warnSoft : colors.brandSoft;
          const border = isDanger ? colors.danger : isWarn ? colors.warn : colors.brand;

          return (
            <Pressable
              key={action}
              onPress={() => void runAction(item, action)}
              disabled={actionBusy}
              accessibilityRole="button"
              accessibilityLabel={a11y}
              hitSlop={QUEUE_ACTION_HIT_SLOP}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  borderColor: border,
                  backgroundColor: bg,
                  borderRadius: radius.sm,
                  minHeight: QUEUE_ACTION_VISUAL_HEIGHT,
                  minWidth: QUEUE_ACTION_MIN_WIDTH,
                  opacity: pressed || actionBusy ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name={icon} size={14} color={fg} style={{ marginRight: 4 }} />
              <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
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

      {queueErrorBanner ? (
        <Pressable
          onPress={() => setErrorDismissed(true)}
          style={[styles.banner, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}
          accessibilityRole="button"
          accessibilityLabel={`Error: ${queueErrorBanner}. Dismiss.`}
        >
          <Text style={[styles.bannerText, { color: colors.danger }]} numberOfLines={2}>
            {queueErrorBanner}
          </Text>
        </Pressable>
      ) : null}

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: listBottomPad }}
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
          const thumb = queueThumbSize(item.status);
          const when = formatCompactDateTime(item.localName, parseRecordedParts);
          const durationSec = durationByName.get(item.localName);
          const sizeLabel = item.expectedBytes > 0 ? formatSizeMb(item.expectedBytes) : undefined;

          const received = item.bytesReceived ?? 0;
          const total = item.expectedBytes > 0 ? item.expectedBytes : 0;
          const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
          const active = isExpandedCard(item.status);
          const paused = item.status === "paused";
          const queued = item.status === "queued";
          const position = queueDisplayPosition(visibleItems, item.id);
          const tone = badgeColors(item.status);
          const label = statusLabel(item.status);

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
          let smoothedBps = 0;
          if (item.status === "active" && startedAt !== undefined && received > 0 && total > 0) {
            const instant = transferRateBps(received, startedAt);
            if (instant !== undefined) {
              const prev = smoothedRateRef.current.get(item.id) ?? 0;
              smoothedBps = smoothRate(prev, instant);
              smoothedRateRef.current.set(item.id, smoothedBps);
              const mib = smoothedBps / (1024 * 1024);
              rateLabel =
                mib >= 0.1
                  ? `${mib.toFixed(1).replace(".", ",")} MB/s`
                  : `${(smoothedBps / 1024).toFixed(0)} KB/s`;
            }
            const remaining = smoothedBps > 0 ? (total - received) / smoothedBps : Number.NaN;
            etaLabel = resolveEtaDisplay({
              status: item.status,
              percent,
              rateBps: smoothedBps,
              remainingSec: remaining,
            });
          }

          // Size stays in progress (active/paused). Queued/failed still show size in meta.
          const metaSecond =
            queued || item.status === "failed" || item.status === "cancelled" ? sizeLabel : undefined;
          const pausedMeta =
            total > 0
              ? `${formatSizeMb(received)} / ${formatSizeMb(total)} · ${percent}%`
              : sizeLabel;

          const a11yStatus =
            item.status === "active"
              ? `Downloading ${item.localName}, ${percent} percent`
              : item.status === "paused"
                ? `Paused at ${percent} percent`
                : item.status === "queued" && position !== undefined
                  ? `Queued in position ${position}`
                  : `${label} ${item.localName}`;

          const badgeText =
            queued && position !== undefined ? `Queued · #${position}` : label;

          return (
            <Card
              style={[
                styles.card,
                {
                  padding: active ? 12 : queued ? 10 : 11,
                  borderRadius: radius.md,
                },
              ]}
              accessible={false}
            >
              <Text style={styles.a11yOnly} accessibilityLabel={a11yStatus}>
                {a11yStatus}
              </Text>
              <View style={styles.row}>
                <View
                  style={[styles.thumbWrap, { width: thumb.width, height: thumb.height }]}
                  importantForAccessibility="no-hide-descendants"
                >
                  <QueueThumbnail
                    remotePath={item.remotePath}
                    localName={item.localName}
                    kind={kind}
                    width={thumb.width}
                    height={thumb.height}
                  />
                  {durationSec !== undefined && durationSec > 0 ? (
                    <View
                      pointerEvents="none"
                      style={[styles.durationBadge, { backgroundColor: colors.bg }]}
                    >
                      <Text style={[styles.durationText, { color: colors.text }]}>
                        {formatDuration(durationSec)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {item.localName}
                    </Text>
                    {!queued ? (
                      <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: tone.fg }]}>{badgeText}</Text>
                      </View>
                    ) : null}
                  </View>

                  {when ? (
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                      {when}
                    </Text>
                  ) : null}

                  {paused ? (
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                      {pausedMeta}
                    </Text>
                  ) : metaSecond ? (
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                      {metaSecond}
                    </Text>
                  ) : null}
                </View>

                {queued ? (
                  <View style={styles.queuedSide}>
                    <View style={[styles.statusBadge, { backgroundColor: tone.bg, marginBottom: 4 }]}>
                      <Text style={[styles.statusBadgeText, { color: tone.fg }]}>{badgeText}</Text>
                    </View>
                    {renderActions(item, true)}
                  </View>
                ) : null}
              </View>

              {active ? (
                <View style={styles.progressBlock}>
                  {received === 0 ? (
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
                      ) : null}
                    </>
                  )}
                  {item.errorMessage ? (
                    <Text style={[styles.error, { color: colors.danger }]}>{item.errorMessage}</Text>
                  ) : null}
                  {renderActions(item, false)}
                </View>
              ) : null}

              {paused ? (
                <View style={styles.pausedBlock}>
                  {total > 0 ? (
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
                    </View>
                  ) : null}
                  {renderActions(item, false)}
                </View>
              ) : null}

              {item.status === "failed" || item.status === "cancelled" ? (
                <View style={styles.failedBlock}>
                  {item.errorMessage ? (
                    <Text style={[styles.error, { color: colors.danger }]}>{item.errorMessage}</Text>
                  ) : null}
                  {renderActions(item, false)}
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
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  bannerText: { fontSize: 12, fontFamily: Type.fontSemi },
  navTitleWrap: { alignItems: Platform.OS === "ios" ? "center" : "flex-start" },
  navTitle: { fontSize: 17, fontFamily: Type.fontBold },
  navSubtitle: { fontSize: 11, fontFamily: Type.font, marginTop: 1 },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4 },
  card: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumbWrap: { borderRadius: 8, overflow: "hidden" },
  durationBadge: {
    position: "absolute",
    right: 3,
    bottom: 3,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    opacity: 0.88,
  },
  durationText: { fontSize: 9, fontFamily: Type.monoMed },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: Type.fontSemi, fontSize: 14, lineHeight: 18 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  statusBadgeText: { fontSize: 10, fontFamily: Type.fontSemi },
  meta: { fontSize: 12, fontFamily: Type.font, marginTop: 2, lineHeight: 16 },
  queuedSide: { alignItems: "flex-end", justifyContent: "center", gap: 2 },
  progressBlock: { marginTop: 10 },
  pausedBlock: { marginTop: 8 },
  failedBlock: { marginTop: 8 },
  progressMeta: { fontSize: 12, fontFamily: Type.monoMed, marginBottom: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  percent: { fontSize: 12, fontFamily: Type.fontSemi, minWidth: 34, textAlign: "right" },
  eta: { fontSize: 11, fontFamily: Type.font, marginTop: 4 },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  waitingText: { fontSize: 12, fontFamily: Type.font },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: QUEUE_ACTION_GAP,
    marginTop: 8,
    flexWrap: "wrap",
  },
  actionsInline: {
    marginTop: 0,
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: QUEUE_ACTION_VISUAL_HEIGHT,
    minWidth: QUEUE_ACTION_MIN_WIDTH,
  },
  actionLabel: { fontSize: 12, fontFamily: Type.fontSemi },
  a11yOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
