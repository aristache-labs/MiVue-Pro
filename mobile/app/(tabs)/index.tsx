import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Badge, Card, PrimaryButton } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_ICON, CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import { useLibraryFilters, type CategoryFilter, type LibrarySort } from "@/hooks/useLibraryFilters";

const SORT_OPTIONS: readonly { id: LibrarySort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name", label: "Name" },
];

const STAT_CHIPS: readonly { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "TOTAL" },
  { id: "normal", label: "NORMAL" },
  { id: "parking", label: "PARKING" },
  { id: "event", label: "EVENT" },
  { id: "photo", label: "PHOTO" },
];

function formatKiB(bytes: number): string {
  return `${Math.round(bytes / 1024)} KiB`;
}

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

  const { category, setCategory, sort, setSort, sections, counts, filtered } = useLibraryFilters(files);

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.md, maxHeight: 44 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {STAT_CHIPS.map((chip) => {
          const selected = category === chip.id;
          const value = counts[chip.id];
          return (
            <Pressable
              key={chip.id}
              onPress={() => setCategory(chip.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${chip.label} ${value}`}
              hitSlop={6}
              style={[
                styles.statChip,
                {
                  borderColor: selected ? colors.brand : colors.border,
                  backgroundColor: selected ? colors.brandSoft : colors.surface,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: selected ? colors.brandStrong : colors.textFaint }]}>
                {chip.label}
              </Text>
              <Text style={[styles.statValue, { color: selected ? colors.brandStrong : colors.text }]}>
                {value}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
        {!demoMode ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[styles.label, { color: colors.text }]}>Camera IP</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, borderRadius: radius.sm }]}>
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

        <PrimaryButton
          label={demoMode ? "Refresh demo library" : "Connect / refresh camera"}
          icon="refresh"
          onPress={() => void refreshFiles()}
        />
      </Card>

      <View style={[styles.sortRow, { marginBottom: spacing.sm }]}>
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

      <SectionList
        style={styles.list}
        sections={[...sections]}
        keyExtractor={(item) => item.path}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <EmptyState
            icon={demoMode ? "flask-outline" : "cloud-offline-outline"}
            title="Nothing here"
            subtitle={emptyMessage}
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        SectionSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <Card style={styles.fileCard}>
            <View
              style={[
                styles.iconSquare,
                { backgroundColor: categoryColor(item.category, scheme) + "22", borderRadius: radius.sm },
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
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: colors.successSoft,
                      borderRadius: 4,
                    },
                  ]}
                >
                  <Text style={[styles.catPillText, { color: colors.success }]}>
                    {CATEGORY_LABEL[item.category].toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.fileMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.recordedAt.slice(11, 16)} · {formatKiB(item.sizeBytes)}
                </Text>
              </View>
            </View>
            <PrimaryButton
              label="Descarcă"
              icon="download-outline"
              compact
              onPress={() => void enqueueDownload(item)}
              accessibilityLabel={`Descarcă ${item.name}`}
            />
          </Card>
        )}
      />
      {filtered.length === 0 ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  demoToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  demoToggleLabel: { fontSize: 12, fontFamily: Type.fontSemi },
  statChip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 64,
  },
  statLabel: { fontSize: 9, fontFamily: Type.fontSemi, letterSpacing: 0.6 },
  statValue: { fontSize: 14, fontFamily: Type.monoMed, marginTop: 2 },
  label: { fontSize: 13, fontFamily: Type.fontSemi, marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: Type.mono },
  hint: { fontSize: 11, marginTop: 6, lineHeight: 15, fontFamily: Type.font },
  note: { fontSize: 12, marginBottom: 8, fontFamily: Type.font },
  error: { fontSize: 12, marginBottom: 8, fontFamily: Type.fontSemi },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortChip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChipText: { fontSize: 12, fontFamily: Type.fontSemi },
  list: { flex: 1 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Type.fontSemi,
    marginTop: 8,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fileCard: { flexDirection: "row", alignItems: "center", padding: 12 },
  iconSquare: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: 12 },
  fileBody: { flex: 1, marginRight: 8 },
  fileName: { fontSize: 14, fontFamily: Type.fontSemi, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catPill: { paddingHorizontal: 6, paddingVertical: 2 },
  catPillText: { fontSize: 9, fontFamily: Type.fontSemi, letterSpacing: 0.6 },
  fileMeta: { fontSize: 11, fontFamily: Type.mono, flexShrink: 1 },
});
