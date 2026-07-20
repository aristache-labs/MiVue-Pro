import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { useDemoMode } from "@/context/DemoModeContext";

export default function LocalLibraryScreen() {
  const { localFiles, refreshLocalFiles, shareLocalFile, lastError, demoMode } = useDemoMode();

  return (
    <View style={styles.container}>
      {demoMode ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Demo Mode</Text>
        </View>
      ) : null}

      <Text style={styles.title}>Local library</Text>
      <Text style={styles.subtitle}>
        Files saved on this device after download. Tap to play or view.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => void refreshLocalFiles()}
        accessibilityRole="button"
        accessibilityLabel="Refresh local library"
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </Pressable>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <FlatList
        data={[...localFiles]}
        keyExtractor={(item) => item.uri}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No local files yet. Download from Library, then open Queue or refresh here.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.kind} · {Math.round(item.sizeBytes / 1024)} KiB
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  const href =
                    `/player?uri=${encodeURIComponent(item.uri)}&name=${encodeURIComponent(item.name)}&kind=${item.kind}` as const;
                  router.push(href as Parameters<typeof router.push>[0]);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}`}
              >
                <Text style={styles.buttonText}>{item.kind === "image" ? "View" : "Play"}</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => void shareLocalFile(item)}
                accessibilityRole="button"
                accessibilityLabel={`Share ${item.name}`}
              >
                <Text style={styles.secondaryText}>Share / Save to Files</Text>
              </Pressable>
            </View>
          </View>
        )}
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
  button: {
    backgroundColor: "#1f4b3a",
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b00020", marginBottom: 8 },
  empty: { opacity: 0.7, marginTop: 24, textAlign: "center" },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8884",
    padding: 12,
    marginBottom: 10,
  },
  name: { fontWeight: "600" },
  meta: { fontSize: 12, opacity: 0.75, marginTop: 4, marginBottom: 10 },
  actions: { gap: 8 },
  actionBtn: {
    backgroundColor: "#1f4b3a",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtn: { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth, borderColor: "#1f4b3a" },
  secondaryText: { color: "#1f4b3a", fontWeight: "700" },
});
