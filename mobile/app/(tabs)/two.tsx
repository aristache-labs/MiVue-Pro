import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { friendlyConnectionError } from "@/components/camera/cameraLibraryModel";
import { SelectionActionBand } from "@/components/library/SelectionActionBand";
import { parseRecordedParts, formatDuration, transferRateBps } from "@/components/mediaMeta";
import { FloatingBackToTop } from "@/components/navigation/FloatingBackToTop";
import { TabScreenHeader } from "@/components/navigation/TabScreenHeader";
import {
  actionsForStatus,
  createQueueActionGate,
  filterVisibleQueueItems,
  formatCompactDateTime,
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
import {
  canCancelQueueEntry,
  canPauseQueueEntry,
  canRemoveQueueEntry,
  classifyQueueSelection,
  pruneSelectionToIds,
  queueCancelActionLabel,
  queueCancelConfirmMessage,
  queueCancelConfirmTitle,
  queuePauseActionLabel,
  queueRemoveActionLabel,
  queueRemoveConfirmMessage,
  queueRemoveConfirmTitle,
  queueRowSelectionA11y,
  queueSelectionTitle,
  removeQueueEntrySafely,
  revalidateQueueSelection,
} from "@/components/queue/queueSelection";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  backToTopListBottomPadding,
  useBackToTop,
} from "@/hooks/useBackToTop";
import {
  listContentBottomPadding,
  useVerticalOverflow,
} from "@/hooks/useVerticalOverflow";
import { QueueThumbnail } from "@/components/QueueThumbnail";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
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
  const [batchBusy, setBatchBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const lastAnnouncedRef = useRef(new Map<string, string>());
  const [, setTick] = useState(0);
  const queueItemsRef = useRef(queueItems);
  queueItemsRef.current = queueItems;

  const visibleItems = useMemo(
    () => sortQueueForDisplay(filterVisibleQueueItems(queueItems)),
    [queueItems],
  );

  const selectedItems = useMemo(
    () => visibleItems.filter((item) => selected.has(item.id)),
    [visibleItems, selected],
  );
  const selectionBreakdown = useMemo(
    () => classifyQueueSelection(selectedItems),
    [selectedItems],
  );
  const showSelectionBar = selecting && selected.size > 0;
  const actionCount =
    (selectionBreakdown.pauseEligibleCount > 0 ? 1 : 0) +
    (selectionBreakdown.cancelEligibleCount > 0 ? 1 : 0) +
    (selectionBreakdown.removeEligibleCount > 0 ? 1 : 0);
  const compactActions = actionCount >= 3;

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
    setCancelConfirmOpen(false);
    setRemoveConfirmOpen(false);
  }, []);

  useEffect(() => {
    setSelected((prev) => pruneSelectionToIds(prev, visibleItems.map((i) => i.id)));
  }, [visibleItems]);

  useEffect(() => {
    if (selecting && visibleItems.length === 0) {
      exitSelection();
    }
  }, [selecting, visibleItems.length, exitSelection]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        exitSelection();
      };
    }, [exitSelection]),
  );

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

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      void AccessibilityInfo.announceForAccessibility(`${next.size} selected`);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(visibleItems.map((i) => i.id)));
    void AccessibilityInfo.announceForAccessibility(
      `Selected ${visibleItems.length} downloads`,
    );
  }, [visibleItems]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
    setCancelConfirmOpen(false);
    setRemoveConfirmOpen(false);
    void AccessibilityInfo.announceForAccessibility("Deselect all");
  }, []);

  useLayoutEffect(() => {
    if (selecting) {
      const allSelected =
        selected.size === visibleItems.length && visibleItems.length > 0;
      navigation.setOptions({
        header: () => (
          <TabScreenHeader
            title={queueSelectionTitle(selected.size)}
            left={
              <Pressable
                onPress={exitSelection}
                accessibilityRole="button"
                accessibilityLabel="Cancel selection"
                hitSlop={HitSlop44}
                style={styles.headerSideBtn}
              >
                <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 16 }}>
                  Cancel
                </Text>
              </Pressable>
            }
            right={
              <Pressable
                onPress={() => {
                  if (allSelected) deselectAll();
                  else selectAll();
                }}
                accessibilityRole="button"
                accessibilityLabel={allSelected ? "Deselect all" : "Select all"}
                hitSlop={HitSlop44}
                style={styles.headerSideBtn}
              >
                <Text
                  style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 15 }}
                  numberOfLines={1}
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </Text>
              </Pressable>
            }
          />
        ),
      });
      return;
    }

    navigation.setOptions({
      header: () => (
        <TabScreenHeader
          title="Download queue"
          left={
            visibleItems.length === 0 ? (
              <View style={{ width: 44 }} />
            ) : (
              <Pressable
                onPress={() => setSelecting(true)}
                accessibilityRole="button"
                accessibilityLabel="Select downloads"
                hitSlop={HitSlop44}
                style={styles.headerSideBtn}
              >
                <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 16 }}>
                  Select
                </Text>
              </Pressable>
            )
          }
        />
      ),
    });
  }, [
    navigation,
    selecting,
    selected.size,
    visibleItems.length,
    exitSelection,
    selectAll,
    deselectAll,
    colors.brand,
  ]);

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

  const listFilledPad = Math.max(QUEUE_LIST_BOTTOM_PADDING, 64 + insets.bottom);
  const listPadBottomBase = listContentBottomPadding(
    visibleItems.length,
    listFilledPad,
    Math.max(insets.bottom, spacing.lg),
  );
  const { hasOverflow, onViewportLayout, onContentSizeChange } = useVerticalOverflow();

  const backToTopEnabled = visibleItems.length > 0 && !actionBusy && !selecting;
  const {
    listRef: queueListRef,
    visible: backToTopVisible,
    onScroll: onQueueScroll,
    onLayout: onBackToTopLayout,
    scrollToTop,
    scrollEventThrottle,
  } = useBackToTop({
    enabled: backToTopEnabled,
    hasOverflow,
    itemCount: visibleItems.length,
  });

  const listPadBottom = backToTopListBottomPadding(
    visibleItems.length,
    hasOverflow,
    listPadBottomBase,
  );

  const handleListLayout = useCallback(
    (event: Parameters<typeof onViewportLayout>[0]) => {
      onViewportLayout(event);
      onBackToTopLayout(event);
    },
    [onViewportLayout, onBackToTopLayout],
  );

  const onBackToTopPress = useCallback(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      scrollToTop(!rm);
    });
  }, [scrollToTop]);

  const durationByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) {
      if (f.durationSeconds !== undefined) map.set(f.name, f.durationSeconds);
    }
    return map;
  }, [files]);

  const runAction = useCallback(
    async (item: QueueItem, action: QueueAction) => {
      if (selecting) return;
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
            if (remote) await enqueueDownload(remote);
            else await retryDownload(item.id);
          }
        } finally {
          setActionBusy(false);
        }
      });
    },
    [
      selecting,
      pauseDownload,
      resumeDownload,
      cancelDownload,
      removeFromQueue,
      enqueueDownload,
      retryDownload,
      files,
    ],
  );

  const runBulkPause = useCallback(() => {
    if (batchBusy) return;
    void actionGateRef.current(async () => {
      setBatchBusy(true);
      try {
        const targets = revalidateQueueSelection(
          selected,
          queueItemsRef.current,
          canPauseQueueEntry,
        );
        for (const item of targets) {
          await pauseDownload(item.id);
        }
        void AccessibilityInfo.announceForAccessibility(
          `${targets.length} ${targets.length === 1 ? "download" : "downloads"} paused`,
        );
      } finally {
        setBatchBusy(false);
      }
    });
  }, [batchBusy, selected, pauseDownload]);

  const runBulkCancel = useCallback(() => {
    if (batchBusy) return;
    void actionGateRef.current(async () => {
      setBatchBusy(true);
      try {
        const targets = revalidateQueueSelection(
          selected,
          queueItemsRef.current,
          canCancelQueueEntry,
        );
        for (const item of targets) {
          await cancelDownload(item.id);
        }
        setCancelConfirmOpen(false);
        void AccessibilityInfo.announceForAccessibility(
          `${targets.length} ${targets.length === 1 ? "download" : "downloads"} cancelled`,
        );
      } finally {
        setBatchBusy(false);
      }
    });
  }, [batchBusy, selected, cancelDownload]);

  const runBulkRemove = useCallback(() => {
    if (batchBusy) return;
    void actionGateRef.current(async () => {
      setBatchBusy(true);
      try {
        const targets = revalidateQueueSelection(
          selected,
          queueItemsRef.current,
          canRemoveQueueEntry,
        );
        for (const item of targets) {
          await removeQueueEntrySafely({
            id: item.id,
            getLive: () => queueItemsRef.current.find((e) => e.id === item.id),
            cancelDownload,
            removeFromQueue,
          });
        }
        setRemoveConfirmOpen(false);
        const remaining = new Set(selected);
        for (const item of targets) remaining.delete(item.id);
        setSelected(remaining);
        void AccessibilityInfo.announceForAccessibility(
          `${targets.length} ${targets.length === 1 ? "entry" : "entries"} removed from Queue`,
        );
        if (remaining.size === 0 || filterVisibleQueueItems(queueItemsRef.current).length === 0) {
          exitSelection();
        }
      } finally {
        setBatchBusy(false);
      }
    });
  }, [batchBusy, selected, cancelDownload, removeFromQueue, exitSelection]);

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
    if (selecting) return null;
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

      <SelectionActionBand
        visible={showSelectionBar}
        testID="queue-selection-action-band"
        mutedMessage={
          showSelectionBar && actionCount === 0 ? "No actions for this selection" : undefined
        }
        actions={
          showSelectionBar
            ? [
                ...(selectionBreakdown.pauseEligibleCount > 0
                  ? [
                      {
                        key: "pause",
                        tone: "brand" as const,
                        icon: "pause" as const,
                        label: queuePauseActionLabel(
                          selectionBreakdown.pauseEligibleCount,
                          compactActions,
                        ),
                        accessibilityLabel: `Pause ${selectionBreakdown.pauseEligibleCount} eligible downloads`,
                        onPress: runBulkPause,
                        disabled: batchBusy,
                        busy: batchBusy,
                      },
                    ]
                  : []),
                ...(selectionBreakdown.cancelEligibleCount > 0
                  ? [
                      {
                        key: "cancel",
                        tone: "warn" as const,
                        icon: "close" as const,
                        label: queueCancelActionLabel(
                          selectionBreakdown.cancelEligibleCount,
                          compactActions,
                        ),
                        accessibilityLabel: `Cancel ${selectionBreakdown.cancelEligibleCount} eligible downloads`,
                        accessibilityHint: "Opens confirmation. Does not exit selection mode.",
                        onPress: () => setCancelConfirmOpen(true),
                        disabled: batchBusy,
                      },
                    ]
                  : []),
                ...(selectionBreakdown.removeEligibleCount > 0
                  ? [
                      {
                        key: "remove",
                        tone: "danger" as const,
                        icon: "trash-outline" as const,
                        label: queueRemoveActionLabel(
                          selectionBreakdown.removeEligibleCount,
                          compactActions,
                        ),
                        accessibilityLabel: `Remove ${selectionBreakdown.removeEligibleCount} eligible entries from Queue`,
                        accessibilityHint: "Does not delete Local recordings",
                        onPress: () => setRemoveConfirmOpen(true),
                        disabled: batchBusy,
                      },
                    ]
                  : []),
              ]
            : []
        }
      />

      <FlatList
        ref={queueListRef}
        style={styles.list}
        data={visibleItems}
        keyExtractor={(item) => item.id}
        extraData={{ selecting, selected, batchBusy }}
        scrollEnabled={hasOverflow}
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={hasOverflow}
        onLayout={handleListLayout}
        onContentSizeChange={onContentSizeChange}
        onScroll={onQueueScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: listPadBottom,
          ...(visibleItems.length === 0 ? { flexGrow: 1 } : null),
        }}
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
          const isSelected = selected.has(item.id);

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

          const card = (
            <Card
              style={[
                styles.card,
                {
                  padding: active ? 12 : queued ? 10 : 11,
                  borderRadius: radius.md,
                  borderColor: selecting && isSelected ? colors.brand : colors.border,
                  borderWidth: selecting && isSelected ? 1.5 : StyleSheet.hairlineWidth,
                  backgroundColor:
                    selecting && isSelected ? colors.brandSoft : colors.surface,
                },
              ]}
              accessible={false}
            >
              {!selecting ? (
                <Text style={styles.a11yOnly} accessibilityLabel={a11yStatus}>
                  {a11yStatus}
                </Text>
              ) : null}
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
                  {selecting ? (
                    <View pointerEvents="none" style={styles.selectMarkHit}>
                      <View
                        style={[
                          styles.selectMark,
                          isSelected
                            ? { backgroundColor: colors.brand, borderColor: colors.brand }
                            : {
                                backgroundColor: "transparent",
                                borderColor: "rgba(255,255,255,0.95)",
                              },
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={12} color={colors.onBrand} />
                        ) : null}
                      </View>
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

          if (selecting) {
            return (
              <Pressable
                onPress={() => toggleSelect(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={queueRowSelectionA11y(
                  item.localName,
                  item.status,
                  isSelected,
                )}
                testID="queue-selection-card"
              >
                {card}
              </Pressable>
            );
          }

          return card;
        }}
      />

      <FloatingBackToTop
        visible={backToTopVisible && backToTopEnabled && !selecting}
        onPress={onBackToTopPress}
      />

      <Modal
        visible={cancelConfirmOpen && selecting && selectionBreakdown.cancelEligibleCount > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelConfirmOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrim}
            onPress={() => setCancelConfirmOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View
            style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityViewIsModal
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {queueCancelConfirmTitle(selectionBreakdown.cancelEligibleCount)}
            </Text>
            <Text style={[styles.modalBody, { color: colors.textMuted }]}>
              {queueCancelConfirmMessage(selectionBreakdown.cancelEligibleCount)}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCancelConfirmOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Keep downloads"
                style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={{ color: colors.text, fontFamily: Type.fontSemi }}>Keep downloads</Text>
              </Pressable>
              <Pressable
                onPress={runBulkCancel}
                disabled={batchBusy}
                accessibilityRole="button"
                accessibilityLabel={queueCancelActionLabel(selectionBreakdown.cancelEligibleCount)}
                style={[styles.modalBtn, { backgroundColor: colors.warnSoft }]}
              >
                <Text style={{ color: colors.warn, fontFamily: Type.fontBold }}>
                  Cancel downloads
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={removeConfirmOpen && selecting && selectionBreakdown.removeEligibleCount > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveConfirmOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalScrim}
            onPress={() => setRemoveConfirmOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View
            style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityViewIsModal
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {queueRemoveConfirmTitle()}
            </Text>
            <Text style={[styles.modalBody, { color: colors.textMuted }]}>
              {queueRemoveConfirmMessage(selectionBreakdown.removeEligibleCount)}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setRemoveConfirmOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Keep entries"
                style={[styles.modalBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={{ color: colors.text, fontFamily: Type.fontSemi }}>Keep entries</Text>
              </Pressable>
              <Pressable
                onPress={runBulkRemove}
                disabled={batchBusy}
                accessibilityRole="button"
                accessibilityLabel={queueRemoveActionLabel(selectionBreakdown.removeEligibleCount)}
                style={[styles.modalBtn, { backgroundColor: colors.dangerSoft }]}
              >
                <Text style={{ color: colors.danger, fontFamily: Type.fontBold }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  demoRow: { flexDirection: "row", justifyContent: "flex-end" },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  bannerText: { fontSize: 12, fontFamily: Type.fontSemi },
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
  headerSideBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  selectMarkHit: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  selectMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
    zIndex: 1,
  },
  modalTitle: { fontFamily: Type.fontBold, fontSize: 17 },
  modalBody: { fontFamily: Type.font, fontSize: 14, lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  modalBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
});
