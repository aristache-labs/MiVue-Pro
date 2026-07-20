import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatBytesShort,
  formatEta,
  formatTransferRate,
  recordingMetaChips,
  transferRateBps,
} from "@/components/mediaMeta";
import { Badge, type BadgeTone, Card, IconButton, MediaMetaRow, PrimaryButton } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";

function isSidecarNmea(name: string): boolean {
  return /\.nmea$/i.test(name);
}

const STATUS_TONE: Record<QueueItemStatus, BadgeTone> = {
  queued: "neutral",
  active: "brand",
  paused: "warn",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};

const STATUS_ICON: Record<QueueItemStatus, keyof typeof Ionicons.glyphMap> = {
  queued: "time-outline",
  active: "cloud-download-outline",
  paused: "pause-circle-outline",
  completed: "checkmark-circle",
  failed: "alert-circle",
  cancelled: "close-circle-outline",
};

const STATUS_LABEL: Record<QueueItemStatus, string> = {
  queued: "Queued",
  active: "Downloading",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function QueueScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const {
    demoMode,
    queueItems,
    queuePosition,
    shareCompleted,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    removeFromQueue,
    lastError,
    downloadDir,
    files,
  } = useDemoMode();

  const startedAtRef = useRef(new Map<string, number>());
  const [, setTick] = useState(0);

  const visibleItems = useMemo(
    () =>
      queueItems.filter(
        (item) => !isSidecarNmea(item.localName) && item.status !== "completed",
      ),
    [queueItems],
  );

  useEffect(() => {
    const hasActive = visibleItems.some((i) => i.status === "active");
    if (!hasActive) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [visibleItems]);

  const durationByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) {
      if (f.durationSeconds !== undefined) map.set(f.name, f.durationSeconds);
    }
    return map;
  }, [files]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: spacing.lg }]}>
      {demoMode ? (
        <View style={styles.headerRow}>
          <Badge label="Demo Mode" tone="demo" icon="flask-outline" />
        </View>
      ) : null}

      {lastError ? <Text style={[styles.error, { color: colors.danger }]}>{lastError}</Text> : null}

      <FlatList
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
        data={visibleItems}
        keyExtractor={(item: QueueItem) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="cloud-download-outline"
            title="Queue is empty"
            subtitle="Downloads you start will show up here."
          />
        }
        renderItem={({ item }: { item: QueueItem }) => {
          const position = queuePosition(item.id);
          const localUri = downloadDir.endsWith("/")
            ? `${downloadDir}${item.localName}`
            : `${downloadDir}/${item.localName}`;
          const kind = item.localName.toLowerCase().endsWith(".mp4")
            ? "video"
            : item.localName.toLowerCase().endsWith(".jpg") ||
                item.localName.toLowerCase().endsWith(".jpeg")
              ? "image"
              : "other";

          const received = item.bytesReceived ?? 0;
          const total = item.expectedBytes > 0 ? item.expectedBytes : 0;
          const percent =
            item.status === "completed"
              ? 100
              : total > 0
                ? Math.min(100, Math.round((received / total) * 100))
                : 0;

          if (item.status === "active" && received > 0 && !startedAtRef.current.has(item.id)) {
            startedAtRef.current.set(item.id, Date.now());
          }
          if (item.status !== "active") {
            startedAtRef.current.delete(item.id);
          }
          const startedAt = startedAtRef.current.get(item.id);
          const eta =
            item.status === "active" && startedAt !== undefined
              ? formatEta(received, total, startedAt)
              : undefined;
          const rateBps =
            item.status === "active" && startedAt !== undefined
              ? transferRateBps(received, startedAt)
              : undefined;
          const rateLabel = rateBps !== undefined ? formatTransferRate(rateBps) : undefined;

          const chips = recordingMetaChips({
            name: item.localName,
            sizeBytes: item.expectedBytes > 0 ? item.expectedBytes : undefined,
            durationSeconds: durationByName.get(item.localName),
          });

          return (
            <Card>
              <View style={styles.rowTop}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.localName}
                </Text>
                <Badge
                  label={STATUS_LABEL[item.status]}
                  tone={STATUS_TONE[item.status]}
                  icon={STATUS_ICON[item.status]}
                />
              </View>

              {chips.length > 0 ? (
                <View style={styles.metaRow}>
                  <MediaMetaRow chips={chips} compact singleLine />
                </View>
              ) : null}

              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {position !== undefined ? `#${position} in queue · ` : ""}
                {total > 0
                  ? `${formatBytesShort(received)} / ${formatBytesShort(total)}`
                  : formatBytesShort(item.expectedBytes)}
                {rateLabel ? ` · ${rateLabel}` : ""}
              </Text>

              {item.status === "active" ? (
                received === 0 ? (
                  <View style={styles.waitingRow}>
                    <ActivityIndicator size="small" color={colors.brand} />
                    <Text style={[styles.waitingText, { color: colors.textMuted }]}>
                      Starting download…
                    </Text>
                  </View>
                ) : (
                  <ProgressBar
                    percent={percent}
                    label={`Downloading ${percent}%`}
                    rightLabel={eta ? `ETA ${eta}` : undefined}
                  />
                )
              ) : null}

              {item.status === "paused" && total > 0 ? (
                <ProgressBar percent={percent} label="Paused" tone="brand" />
              ) : null}

              {item.errorMessage ? (
                <Text style={[styles.error, { color: colors.danger }]}>{item.errorMessage}</Text>
              ) : null}

              <View style={[styles.actions, { marginTop: spacing.md }]}>
                {item.status === "completed" ? (
                  <>
                    <PrimaryButton
                      label="Play"
                      icon="play"
                      compact
                      onPress={() => {
                        const href =
                          `/player?uri=${encodeURIComponent(localUri)}&name=${encodeURIComponent(item.localName)}&kind=${kind}` as const;
                        router.push(href as Parameters<typeof router.push>[0]);
                      }}
                      accessibilityLabel={`Open ${item.localName} in player`}
                    />
                    <IconButton
                      icon="share-outline"
                      tone="neutral"
                      onPress={() => void shareCompleted(item)}
                      accessibilityLabel={`Share ${item.localName}`}
                    />
                  </>
                ) : null}

                {item.status === "active" || item.status === "queued" ? (
                  <>
                    <Pressable
                      onPress={() => void pauseDownload(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Pause ${item.localName}`}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          borderColor: colors.warn,
                          backgroundColor: colors.warnSoft,
                          borderRadius: radius.sm,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="pause" size={15} color={colors.warn} style={{ marginRight: 6 }} />
                      <Text style={[styles.actionLabel, { color: colors.warn }]}>Pause</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void cancelDownload(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel ${item.localName}`}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          borderColor: colors.danger,
                          backgroundColor: colors.dangerSoft,
                          borderRadius: radius.sm,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="close" size={15} color={colors.danger} style={{ marginRight: 6 }} />
                      <Text style={[styles.actionLabel, { color: colors.danger }]}>Cancel</Text>
                    </Pressable>
                  </>
                ) : null}

                {item.status === "paused" ? (
                  <>
                    <Pressable
                      onPress={() => void resumeDownload(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Resume ${item.localName}`}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          borderColor: colors.warn,
                          backgroundColor: colors.warnSoft,
                          borderRadius: radius.sm,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="play" size={15} color={colors.warn} style={{ marginRight: 6 }} />
                      <Text style={[styles.actionLabel, { color: colors.warn }]}>Resume</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void cancelDownload(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel ${item.localName}`}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          borderColor: colors.danger,
                          backgroundColor: colors.dangerSoft,
                          borderRadius: radius.sm,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="close" size={15} color={colors.danger} style={{ marginRight: 6 }} />
                      <Text style={[styles.actionLabel, { color: colors.danger }]}>Cancel</Text>
                    </Pressable>
                  </>
                ) : null}

                {item.status === "failed" || item.status === "cancelled" ? (
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Dismiss"
                      icon="trash-outline"
                      variant="outline"
                      compact
                      onPress={() => void removeFromQueue(item.id)}
                      accessibilityLabel={`Dismiss ${item.localName}`}
                    />
                  </View>
                ) : null}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end", minHeight: 0 },
  metaRow: { marginTop: 8, marginBottom: 4 },
  name: { fontFamily: Type.fontSemi, fontSize: 14, flex: 1, marginRight: 8 },
  meta: { fontSize: 12, fontFamily: Type.mono, marginTop: 4 },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    minHeight: 40,
  },
  actionLabel: { fontSize: 13, fontFamily: Type.fontSemi },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  waitingText: { fontSize: 12, fontFamily: Type.font },
});
