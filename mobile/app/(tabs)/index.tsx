import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { Badge, Card, IconButton } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_ICON, CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import { useLibraryFilters, type LibrarySort } from "@/hooks/useLibraryFilters";

const SORT_OPTIONS: readonly { id: LibrarySort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name", label: "Name" },
];

export default function LibraryScreen() {
  const { colors, spacing, radius, scheme } = useAppTheme();
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
        ? "No demo files yet. Tap Refresh to load the demo library."
        : "No files yet. Connect to the camera Wi‑Fi, then refresh.";
    }
    return `Nothing in ${CATEGORY_LABEL[category]}. Try another filter.`;
  }, [files.length, demoMode, category]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: spacing.lg }]}>
      <View style={styles.headerRow}>
        {demoMode ? (
          <Badge label="Demo Mode" tone="demo" icon="flask-outline" />
        ) : (
          <Badge
            label={nativeTcpReady ? "Live · native" : isExpoGo ? "Live · Expo Go" : "Live · fallback"}
            tone="live"
            icon="wifi"
          />
        )}
        <View style={styles.demoToggle}>
          <Text style={[styles.demoToggleLabel, { color: colors.textMuted }]}>Demo</Text>
          <Switch value={demoMode} onValueChange={setDemoMode} accessibilityLabel="Toggle Demo Mode" />
        </View>
      </View>

      <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
        {!demoMode ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[styles.label, { color: colors.text }]}>Camera IP</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, borderRadius: radius.md }]}>
              <Ionicons name="wifi-outline" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={cameraHost}
                onChangeText={setCameraHost}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                placeholder="192.72.1.1"
                placeholderTextColor={colors.textFaint}
                accessibilityLabel="Camera IP address"
              />
            </View>
            <Text style={[styles.hint, { color: colors.textFaint }]}>
              Connect the iPhone to the camera Wi‑Fi first. Default gateway is often 192.72.1.1.
            </Text>
          </View>
        ) : null}

        {connectionNote ? <Text style={[styles.note, { color: colors.textMuted }]}>{connectionNote}</Text> : null}
        {lastError ? <Text style={[styles.error, { color: colors.danger }]}>{lastError}</Text> : null}

        <Pressable
          onPress={() => void refreshFiles()}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.connectBtn,
            { backgroundColor: colors.brand, borderRadius: radius.md, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="refresh" size={16} color={colors.onBrand} style={{ marginRight: 8 }} />
          <Text style={[styles.connectBtnText, { color: colors.onBrand }]}>
            {demoMode ? "Refresh demo library" : "Connect / refresh camera"}
          </Text>
        </Pressable>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {categoryFilters.map((id) => {
          const selected = category === id;
          return (
            <Pressable
              key={id}
              onPress={() => setCategory(id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Filter ${CATEGORY_LABEL[id]}`}
              hitSlop={6}
              style={[
                styles.chip,
                {
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.brand : colors.surfaceMuted,
                  borderColor: selected ? colors.brand : colors.border,
                },
              ]}
            >
              <Ionicons
                name={CATEGORY_ICON[id] as keyof typeof Ionicons.glyphMap}
                size={13}
                color={selected ? colors.onBrand : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.chipText, { color: selected ? colors.onBrand : colors.textMuted }]}>
                {CATEGORY_LABEL[id]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.sortRow, { marginTop: spacing.sm }]}>
        {SORT_OPTIONS.map((option) => {
          const selected = sort === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setSort(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Sort by ${option.label}`}
              hitSlop={6}
              style={[
                styles.sortChip,
                {
                  borderRadius: radius.pill,
                  borderColor: selected ? colors.brand : colors.border,
                  backgroundColor: selected ? colors.brandSoft : "transparent",
                },
              ]}
            >
              <Text style={[styles.sortChipText, { color: selected ? colors.brand : colors.textMuted }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        data={filtered}
        keyExtractor={(item) => item.path}
        ListEmptyComponent={
          <EmptyState
            icon={demoMode ? "flask-outline" : "cloud-offline-outline"}
            title="Nothing here"
            subtitle={emptyMessage}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <Card style={styles.fileCard}>
            <View
              style={[
                styles.iconSquare,
                { backgroundColor: categoryColor(item.category, scheme) + "22", borderRadius: radius.md },
              ]}
              accessibilityElementsHidden
            >
              <Ionicons
                name={CATEGORY_ICON[item.category] as keyof typeof Ionicons.glyphMap}
                size={18}
                color={categoryColor(item.category, scheme)}
              />
            </View>
            <View style={styles.fileBody}>
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.fileMeta, { color: colors.textMuted }]} numberOfLines={1}>
                {CATEGORY_LABEL[item.category]} · {item.recordedAt} · {Math.round(item.sizeBytes / 1024)} KiB
              </Text>
            </View>
            <IconButton
              icon="download-outline"
              tone="brand"
              onPress={() => void enqueueDownload(item)}
              accessibilityLabel={`Download ${item.name}`}
            />
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  demoToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  demoToggleLabel: { fontSize: 12, fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15 },
  hint: { fontSize: 11, marginTop: 6, lineHeight: 15 },
  note: { fontSize: 12, marginBottom: 8 },
  error: { fontSize: 12, marginBottom: 8, fontWeight: "600" },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  connectBtnText: { fontWeight: "700", fontSize: 14 },
  chipRow: { maxHeight: 40 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortChip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChipText: { fontSize: 12, fontWeight: "700" },
  list: { flex: 1 },
  fileCard: { flexDirection: "row", alignItems: "center", padding: 12 },
  iconSquare: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: 12 },
  fileBody: { flex: 1, marginRight: 8 },
  fileName: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
  fileMeta: { fontSize: 12 },
});
