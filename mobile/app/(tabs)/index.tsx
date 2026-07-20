import { useMemo } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, TextInput } from "react-native";

import { Text, View } from "@/components/Themed";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/constants/CategoryStyle";
import { APP_NAME, APP_SHORT_DESCRIPTION, APP_SUBTITLE, DISCLAIMER_EN } from "@/constants/Brand";
import { useDemoMode } from "@/context/DemoModeContext";
import { useLibraryFilters, type LibrarySort } from "@/hooks/useLibraryFilters";

const SORT_OPTIONS: readonly { id: LibrarySort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name", label: "Name" },
];

export default function LibraryScreen() {
  const {
    demoMode,
    setDemoMode,
    cameraHost,
    setCameraHost,
    files,
    enqueueDownload,
    lastError,
    refreshFiles,
    connectionNote,
    isExpoGo,
    nativeTcpReady,
  } = useDemoMode();

  const { category, setCategory, sort, setSort, filtered, categoryFilters } = useLibraryFilters(files);

  const emptyMessage = useMemo(() => {
    if (files.length === 0) {
      return demoMode
        ? "No demo files. Tap Refresh demo library."
        : "No files. Connect to the camera Wi‑Fi and refresh.";
    }
    return `No files in ${CATEGORY_LABEL[category]}. Try another filter.`;
  }, [files.length, demoMode, category]);

  return (
    <View style={styles.container}>
      {demoMode ? (
        <View style={styles.banner} accessibilityRole="text">
          <Text style={styles.bannerText}>Demo Mode — synthetic data, no camera traffic</Text>
        </View>
      ) : (
        <View style={[styles.banner, styles.liveBanner]} accessibilityRole="text">
          <Text style={styles.bannerText}>
            Live — {nativeTcpReady ? "native HTTP/1.0" : isExpoGo ? "Expo Go Fetch probe" : "Fetch fallback"}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Demo Mode</Text>
        <Switch value={demoMode} onValueChange={setDemoMode} accessibilityLabel="Toggle Demo Mode" />
      </View>

      {!demoMode ? (
        <View style={styles.hostBlock}>
          <Text style={styles.label}>Camera IP</Text>
          <TextInput
            style={styles.input}
            value={cameraHost}
            onChangeText={setCameraHost}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            placeholder="192.72.1.1"
            accessibilityLabel="Camera IP address"
          />
          <Text style={styles.hint}>
            Connect the iPhone to the camera Wi‑Fi first. Default gateway is often 192.72.1.1.
          </Text>
        </View>
      ) : null}

      <Text style={styles.brandLine}>
        {APP_NAME} · {APP_SUBTITLE}
      </Text>
      <Text style={styles.disclaimer}>{APP_SHORT_DESCRIPTION}</Text>
      <Text style={styles.disclaimer}>{DISCLAIMER_EN}</Text>

      {connectionNote ? <Text style={styles.note}>{connectionNote}</Text> : null}

      <Pressable style={styles.button} onPress={() => void refreshFiles()} accessibilityRole="button">
        <Text style={styles.buttonText}>{demoMode ? "Refresh demo library" : "Connect / refresh camera"}</Text>
      </Pressable>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <Text style={styles.filterLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {categoryFilters.map((id) => {
          const selected = category === id;
          return (
            <Pressable
              key={id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setCategory(id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Filter ${CATEGORY_LABEL[id]}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {CATEGORY_LABEL[id]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.filterLabel}>Sort</Text>
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((option) => {
          const selected = sort === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setSort(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Sort by ${option.label}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.path}
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[styles.placeholder, { backgroundColor: CATEGORY_COLOR[item.category] }]}
                accessibilityLabel={`${item.category} placeholder`}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {CATEGORY_LABEL[item.category]} · {item.recordedAt} ·{" "}
                  {Math.round(item.sizeBytes / 1024)} KiB
                </Text>
              </View>
            </View>
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
  banner: { backgroundColor: "#c45c26", padding: 10, marginBottom: 12 },
  liveBanner: { backgroundColor: "#1f4b3a" },
  bannerText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hostBlock: { marginBottom: 12 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  filterLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8888",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 6,
  },
  brandLine: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  disclaimer: { fontSize: 12, opacity: 0.8, marginBottom: 8 },
  note: { fontSize: 12, opacity: 0.75, marginBottom: 8 },
  button: {
    backgroundColor: "#1f4b3a",
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b00020", marginBottom: 8 },
  chipRow: { maxHeight: 44, marginBottom: 8 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8886",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  chipSelected: { backgroundColor: "#1f4b3a", borderColor: "#1f4b3a" },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
  list: { flex: 1 },
  empty: { opacity: 0.7, marginTop: 24, textAlign: "center" },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8884",
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", marginBottom: 8 },
  placeholder: { width: 56, height: 56, marginRight: 10 },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: "700", marginBottom: 4 },
  meta: { fontSize: 12, opacity: 0.75, marginBottom: 4 },
  hint: { fontSize: 11, opacity: 0.6, marginBottom: 8 },
  downloadBtn: {
    backgroundColor: "#1f4b3a",
    paddingVertical: 8,
    alignItems: "center",
  },
});
