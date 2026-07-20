import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { useDemoMode } from "@/context/DemoModeContext";

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
        One active transfer at a time. Completed files appear in Local and can be shared to Files.
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

          return (
            <View style={styles.card}>
              <Text style={styles.name}>{item.localName}</Text>
              <Text style={styles.meta}>
                {item.status}
                {position !== undefined ? ` · #${position} in queue` : ""}
                {item.bytesReceived !== undefined
                  ? ` · ${item.bytesReceived}/${item.expectedBytes} B`
                  : ` · ${item.expectedBytes} B`}
              </Text>
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
