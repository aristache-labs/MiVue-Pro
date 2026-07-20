import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { useDemoMode } from "@/context/DemoModeContext";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export default function QueueScreen() {
  const { demoMode, queueItems, queuePosition, shareCompleted, lastError, downloadDir } = useDemoMode();

  return (
    <View style={styles.container}>
      {demoMode ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Demo Mode</Text>
        </View>
      ) : null}

      <Text style={styles.title}>Download queue</Text>
      <Text style={styles.subtitle}>
        One active transfer at a time. Progress updates while downloading.
      </Text>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <FlatList
        data={[...queueItems]}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Queue is empty.</Text>}
        renderItem={({ item }) => {
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
          const showBar = item.status === "active" || item.status === "completed";

          return (
            <View style={styles.card}>
              <Text style={styles.name}>{item.localName}</Text>
              <Text style={styles.meta}>
                {item.status}
                {position !== undefined ? ` · #${position} in queue` : ""}
                {total > 0
                  ? ` · ${formatBytes(received)} / ${formatBytes(total)}`
                  : ` · ${formatBytes(item.expectedBytes)}`}
                {showBar ? ` · ${percent}%` : ""}
              </Text>

              {item.status === "active" ? (
                <View style={styles.progressBlock}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(percent, received > 0 ? percent : 2)}%` }]} />
                  </View>
                  {received === 0 ? (
                    <View style={styles.waitingRow}>
                      <ActivityIndicator size="small" color="#1f4b3a" />
                      <Text style={styles.waitingText}>Starting download…</Text>
                    </View>
                  ) : (
                    <Text style={styles.progressLabel} accessibilityLiveRegion="polite">
                      Downloading {percent}%
                    </Text>
                  )}
                </View>
              ) : null}

              {item.status === "completed" ? (
                <View style={styles.progressBlock}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, styles.progressDone, { width: "100%" }]} />
                  </View>
                  <Text style={styles.progressLabel}>Completed</Text>
                </View>
              ) : null}

              {item.errorMessage ? <Text style={styles.error}>{item.errorMessage}</Text> : null}
              {item.status === "completed" ? (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.shareBtn}
                    onPress={() => {
                      const href =
                        `/player?uri=${encodeURIComponent(localUri)}&name=${encodeURIComponent(item.localName)}&kind=${kind}` as const;
                      router.push(href as Parameters<typeof router.push>[0]);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.localName} in Local player`}
                  >
                    <Text style={styles.buttonText}>Open in Local / Play</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.shareBtn, styles.secondaryBtn]}
                    onPress={() => void shareCompleted(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${item.localName}`}
                  >
                    <Text style={styles.secondaryText}>Share / Save to Files</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  banner: { backgroundColor: "#c45c26", padding: 10, marginBottom: 12 },
  bannerText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 12, opacity: 0.7, marginBottom: 12 },
  empty: { opacity: 0.7, marginTop: 24, textAlign: "center" },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8884",
    padding: 12,
    marginBottom: 10,
  },
  name: { fontWeight: "600" },
  meta: { fontSize: 12, opacity: 0.75, marginTop: 4 },
  progressBlock: { marginTop: 10 },
  progressTrack: {
    height: 8,
    backgroundColor: "#8883",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: "#1f4b3a",
  },
  progressDone: { backgroundColor: "#2d6b52" },
  progressLabel: { fontSize: 12, marginTop: 6, fontWeight: "600" },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  waitingText: { fontSize: 12, opacity: 0.75 },
  error: { color: "#b00020", marginTop: 4, fontSize: 12, marginBottom: 8 },
  actions: { marginTop: 10, gap: 8 },
  shareBtn: {
    backgroundColor: "#1f4b3a",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#1f4b3a",
  },
  secondaryText: { color: "#1f4b3a", fontWeight: "700" },
});
