import { FlatList, Pressable, StyleSheet, Switch } from "react-native";

import { Text, View } from "@/components/Themed";
import { useDemoMode } from "@/context/DemoModeContext";

export default function LibraryScreen() {
  const { demoMode, setDemoMode, files, enqueueDownload, lastError, refreshFiles } = useDemoMode();

  return (
    <View style={styles.container}>
      {demoMode ? (
        <View style={styles.banner} accessibilityRole="text">
          <Text style={styles.bannerText}>Demo Mode — synthetic data, no camera traffic</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Demo Mode</Text>
        <Switch
          value={demoMode}
          onValueChange={setDemoMode}
          accessibilityLabel="Toggle Demo Mode"
        />
      </View>

      <Text style={styles.disclaimer}>
        [NUMELE_APLICAȚIEI] is an independent app and is not affiliated with, approved by, sponsored by,
        or distributed by Mio or MiTAC. Mio and MiVue are trademarks of their respective owners.
      </Text>

      <Pressable style={styles.button} onPress={() => void refreshFiles()} accessibilityRole="button">
        <Text style={styles.buttonText}>Refresh library</Text>
      </Pressable>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <FlatList
        style={styles.list}
        data={[...files]}
        keyExtractor={(item) => item.path}
        ListEmptyComponent={<Text style={styles.empty}>No files. Enable Demo Mode or connect a camera (dev build).</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.category} · {item.recordedAt} · {Math.round(item.sizeBytes / 1024)} KiB
            </Text>
            <Text style={styles.hint}>Selecting a card does not download. Use Descarcă.</Text>
            <Pressable
              style={styles.downloadBtn}
              onPress={() => void enqueueDownload(item)}
              accessibilityRole="button"
              accessibilityLabel={`Descarcă ${item.name}`}
            >
              <Text style={styles.buttonText}>Descarcă</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  banner: {
    backgroundColor: "#c45c26",
    padding: 10,
    marginBottom: 12,
  },
  bannerText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: { fontSize: 16, fontWeight: "600" },
  disclaimer: { fontSize: 12, opacity: 0.8, marginBottom: 12 },
  button: {
    backgroundColor: "#1f4b3a",
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b00020", marginBottom: 8 },
  list: { flex: 1 },
  empty: { opacity: 0.7, marginTop: 24, textAlign: "center" },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8884",
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontWeight: "700", marginBottom: 4 },
  meta: { fontSize: 12, opacity: 0.75, marginBottom: 4 },
  hint: { fontSize: 11, opacity: 0.6, marginBottom: 8 },
  downloadBtn: {
    backgroundColor: "#1f4b3a",
    paddingVertical: 8,
    alignItems: "center",
  },
});
