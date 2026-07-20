import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, IconButton, PrimaryButton } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/constants/Theme";
import { useDemoMode, type LocalMediaFile } from "@/context/DemoModeContext";

function kindIcon(kind: LocalMediaFile["kind"]): keyof typeof Ionicons.glyphMap {
  if (kind === "video") return "videocam";
  if (kind === "image") return "image";
  return "document";
}

export default function LocalLibraryScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { localFiles, refreshLocalFiles, shareLocalFile, deleteLocalFile, lastError, demoMode } = useDemoMode();

  const confirmDelete = (file: LocalMediaFile) => {
    Alert.alert("Delete file?", `${file.name} will be removed from this device. This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteLocalFile(file) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: spacing.lg }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Local library</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Saved on this device</Text>
        </View>
        {demoMode ? <Badge label="Demo Mode" tone="demo" icon="flask-outline" /> : null}
      </View>

      <Pressable
        onPress={() => void refreshLocalFiles()}
        accessibilityRole="button"
        accessibilityLabel="Refresh local library"
        style={({ pressed }) => [
          styles.refreshBtn,
          { borderColor: colors.border, borderRadius: radius.md, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="refresh" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
        <Text style={[styles.refreshText, { color: colors.textMuted }]}>Refresh</Text>
      </Pressable>

      {lastError ? <Text style={[styles.error, { color: colors.danger }]}>{lastError}</Text> : null}

      <FlatList
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xxl }}
        data={[...localFiles]}
        keyExtractor={(item) => item.uri}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No local files yet"
            subtitle="Download from Library, then check back here."
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconSquare, { backgroundColor: colors.brandSoft, borderRadius: radius.md }]}>
                <Ionicons name={kindIcon(item.kind)} size={18} color={colors.brand} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {item.kind} · {Math.round(item.sizeBytes / 1024)} KiB
                </Text>
              </View>
            </View>
            <View style={[styles.actions, { marginTop: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label={item.kind === "image" ? "View" : "Play"}
                  icon={item.kind === "image" ? "eye-outline" : "play"}
                  onPress={() => {
                    const href =
                      `/player?uri=${encodeURIComponent(item.uri)}&name=${encodeURIComponent(item.name)}&kind=${item.kind}` as const;
                    router.push(href as Parameters<typeof router.push>[0]);
                  }}
                  accessibilityLabel={`Open ${item.name}`}
                />
              </View>
              <IconButton
                icon="share-outline"
                tone="neutral"
                onPress={() => void shareLocalFile(item)}
                accessibilityLabel={`Share ${item.name}`}
              />
              <IconButton
                icon="trash-outline"
                tone="danger"
                onPress={() => confirmDelete(item)}
                accessibilityLabel={`Delete ${item.name}`}
              />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
  subtitle: { fontSize: 12 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  refreshText: { fontSize: 13, fontWeight: "700" },
  error: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  iconSquare: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: 12 },
  body: { flex: 1 },
  name: { fontWeight: "700", fontSize: 14, marginBottom: 3 },
  meta: { fontSize: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
});
