import { FlatList, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { useDemoMode } from "@/context/DemoModeContext";

export default function QueueScreen() {
  const { demoMode, queueItems, queuePosition } = useDemoMode();

  return (
    <View style={styles.container}>
      {demoMode ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Demo Mode</Text>
        </View>
      ) : null}

      <Text style={styles.title}>Download queue</Text>
      <Text style={styles.subtitle}>One active transfer at a time. Position shown for queued items.</Text>

      <FlatList
        data={[...queueItems]}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Queue is empty.</Text>}
        renderItem={({ item }) => {
          const position = queuePosition(item.id);
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
  error: { color: "#b00020", marginTop: 4, fontSize: 12 },
});
