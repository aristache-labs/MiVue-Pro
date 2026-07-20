import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { recordingMetaChips } from "@/components/mediaMeta";
import { Badge, Card, MediaMetaRow } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type LocalMediaFile } from "@/context/DemoModeContext";

function kindIcon(kind: LocalMediaFile["kind"]): keyof typeof Ionicons.glyphMap {
  if (kind === "video") return "videocam";
  if (kind === "image") return "image";
  return "document";
}

export default function LocalLibraryScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const { localFiles, refreshLocalFiles, shareLocalFile, deleteLocalFile, lastError, demoMode, files } =
    useDemoMode();

  const durationByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) {
      if (f.durationSeconds !== undefined) map.set(f.name, f.durationSeconds);
    }
    return map;
  }, [files]);

  const confirmDelete = (file: LocalMediaFile) => {
    Alert.alert("Delete file?", `${file.name} will be removed from this device. This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteLocalFile(file) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: spacing.lg }]}>
      {demoMode ? (
        <View style={styles.headerRow}>
          <Badge label="Demo Mode" tone="demo" icon="flask-outline" />
        </View>
      ) : null}

      <Pressable
        onPress={() => void refreshLocalFiles()}
        accessibilityRole="button"
        accessibilityLabel="Refresh local library"
        style={({ pressed }) => [
          styles.refreshBtn,
          { borderColor: colors.border, borderRadius: radius.sm, opacity: pressed ? 0.7 : 1 },
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
        renderItem={({ item }) => {
          const chips = recordingMetaChips({
            name: item.name,
            sizeBytes: item.sizeBytes,
            durationSeconds: durationByName.get(item.name),
          });
          const playLabel = item.kind === "image" ? "View" : "Play";
          const playIcon = item.kind === "image" ? "eye-outline" : "play";

          return (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconSquare, { backgroundColor: colors.brandSoft, borderRadius: radius.sm }]}>
                  <Ionicons name={kindIcon(item.kind)} size={18} color={colors.brand} />
                </View>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>

              {chips.length > 0 ? (
                <View style={styles.metaRow}>
                  <MediaMetaRow chips={chips} compact singleLine />
                </View>
              ) : (
                <Text style={[styles.metaFallback, { color: colors.textMuted }]}>{item.kind}</Text>
              )}

              <View
                style={[
                  styles.actionBar,
                  {
                    marginHorizontal: -spacing.lg,
                    marginBottom: -spacing.lg,
                    marginTop: spacing.md,
                    borderTopColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                <Pressable
                  onPress={() => void shareLocalFile(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${item.name}`}
                  style={({ pressed }) => [
                    styles.sideBtn,
                    { borderRadius: radius.sm, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Ionicons name="share-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.sideLabel, { color: colors.textMuted }]}>Share</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const href =
                      `/player?uri=${encodeURIComponent(item.uri)}&name=${encodeURIComponent(item.name)}&kind=${item.kind}` as const;
                    router.push(href as Parameters<typeof router.push>[0]);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.name}`}
                  style={({ pressed }) => [
                    styles.playBtn,
                    {
                      backgroundColor: colors.brand,
                      borderRadius: radius.sm,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Ionicons name={playIcon} size={16} color={colors.onBrand} style={{ marginRight: 6 }} />
                  <Text style={[styles.playLabel, { color: colors.onBrand }]}>{playLabel}</Text>
                </Pressable>

                <Pressable
                  onPress={() => confirmDelete(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                  style={({ pressed }) => [
                    styles.sideBtn,
                    { borderRadius: radius.sm, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.sideLabel, { color: colors.danger }]}>Delete</Text>
                </Pressable>
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
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  refreshText: { fontSize: 13, fontFamily: Type.fontSemi },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4 },
  card: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center" },
  iconSquare: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: 12 },
  name: { flex: 1, fontFamily: Type.fontSemi, fontSize: 14, minWidth: 0 },
  metaRow: { marginTop: 10 },
  metaFallback: { fontSize: 12, fontFamily: Type.mono, marginTop: 10 },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  sideBtn: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 2,
  },
  sideLabel: { fontSize: 10, fontFamily: Type.fontSemi },
  playBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    minHeight: 40,
  },
  playLabel: { fontSize: 14, fontFamily: Type.fontSemi },
});
