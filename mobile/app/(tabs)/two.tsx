import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { Badge, type BadgeTone, Card, IconButton, PrimaryButton } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { QueueItem, QueueItemStatus } from "@/packages/local-db/src/index";

function isSidecarNmea(name: string): boolean {
  return /\.nmea$/i.test(name);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

const STATUS_TONE: Record<QueueItemStatus, BadgeTone> = {
  queued: "neutral",
  active: "brand",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};

const STATUS_ICON: Record<QueueItemStatus, keyof typeof Ionicons.glyphMap> = {
  queued: "time-outline",
  active: "cloud-download-outline",
  completed: "checkmark-circle",
  failed: "alert-circle",
  cancelled: "close-circle-outline",
};

const STATUS_LABEL: Record<QueueItemStatus, string> = {
  queued: "Queued",
  active: "Downloading",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function QueueScreen() {
  const { colors, spacing } = useAppTheme();
  const {
    demoMode,
    queueItems,
    queuePosition,
    shareCompleted,
    cancelDownload,
    removeFromQueue,
    lastError,
    downloadDir,
  } = useDemoMode();

  // NMEA sidecars download with the video but stay out of the visible queue.
  const visibleItems = useMemo(
    () => queueItems.filter((item) => !isSidecarNmea(item.localName)),
    [queueItems],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: spacing.lg }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Download queue</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>One active transfer at a time</Text>
        </View>
        {demoMode ? <Badge label="Demo Mode" tone="demo" icon="flask-outline" /> : null}
      </View>

      {lastError ? <Text style={[styles.error, { color: colors.danger }]}>{lastError}</Text> : null}

      <FlatList
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        data={visibleItems}
        keyExtractor={(item: QueueItem) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState icon="cloud-download-outline" title="Queue is empty" subtitle="Downloads you start will show up here." />
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

          return (
            <Card>
              <View style={styles.rowTop}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.localName}
                </Text>
                <Badge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} icon={STATUS_ICON[item.status]} />
              </View>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {position !== undefined ? `#${position} in queue · ` : ""}
                {total > 0 ? `${formatBytes(received)} / ${formatBytes(total)}` : formatBytes(item.expectedBytes)}
              </Text>

              {item.status === "active" ? (
                received === 0 ? (
                  <View style={styles.waitingRow}>
                    <ActivityIndicator size="small" color={colors.brand} />
                    <Text style={[styles.waitingText, { color: colors.textMuted }]}>Starting download…</Text>
                  </View>
                ) : (
                  <ProgressBar percent={percent} label={`Downloading ${percent}%`} />
                )
              ) : null}

              {item.status === "completed" ? <ProgressBar percent={100} label="Completed" tone="success" /> : null}

              {item.errorMessage ? (
                <Text style={[styles.error, { color: colors.danger }]}>{item.errorMessage}</Text>
              ) : null}

              <View style={[styles.actions, { marginTop: spacing.md }]}>
                {item.status === "completed" ? (
                  <>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label="Open / Play"
                        icon="play"
                        onPress={() => {
                          const href =
                            `/player?uri=${encodeURIComponent(localUri)}&name=${encodeURIComponent(item.localName)}&kind=${kind}` as const;
                          router.push(href as Parameters<typeof router.push>[0]);
                        }}
                        accessibilityLabel={`Open ${item.localName} in player`}
                      />
                    </View>
                    <IconButton
                      icon="share-outline"
                      tone="neutral"
                      onPress={() => void shareCompleted(item)}
                      accessibilityLabel={`Share ${item.localName}`}
                    />
                  </>
                ) : null}

                {item.status === "queued" || item.status === "active" ? (
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Cancel"
                      icon="close"
                      variant="outline"
                      onPress={() => void cancelDownload(item.id)}
                      accessibilityLabel={`Cancel ${item.localName}`}
                    />
                  </View>
                ) : null}

                {item.status === "failed" || item.status === "cancelled" ? (
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Dismiss"
                      icon="trash-outline"
                      variant="outline"
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
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 20, fontFamily: Type.fontBold, marginBottom: 2 },
  subtitle: { fontSize: 12, fontFamily: Type.font },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 },
  name: { fontFamily: Type.fontSemi, fontSize: 14, flex: 1 },
  meta: { fontSize: 12, fontFamily: Type.mono },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  waitingText: { fontSize: 12, fontFamily: Type.font },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
});
