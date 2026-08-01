import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  APP_LOG_CATEGORY_FILTERS,
  APP_LOG_LEVEL_FILTERS,
  APP_LOG_MAX_ENTRIES,
  buildAppLogExportText,
  filterAppLogs,
  groupAppLogsByLocalDay,
  type AppLogCategory,
  type AppLogCategoryFilter,
  type AppLogEntry,
  type AppLogGroup,
  type AppLogLevel,
  type AppLogLevelFilter,
} from "@/components/diagnostics/appLogFormat";
import {
  clearAppLogs,
  getAppLogs,
  hydrateAppLogs,
  subscribeAppLogs,
} from "@/components/diagnostics/appLogStore";
import { internalToolsEnabled } from "@/components/environment/resolveInternalTools";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { MEDIA_SHEET_PAD_H, MEDIA_SHEET_RADIUS } from "@/components/media/mediaCardTokens";
import { CompactSheetHeader, SHEET_BODY_PAD_TOP } from "@/components/sheets/SheetHeader";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { APP_NAME } from "@/constants/Brand";
import { Type, useAppTheme, type ThemeColors } from "@/constants/Theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const CATEGORY_LABELS: Record<AppLogCategory, string> = {
  app: "App",
  load: "Load",
  navigation: "Navigation",
  ui: "UI",
  connection: "Connection",
  download: "Download",
  library: "Library",
  playback: "Playback",
  storage: "Storage",
  settings: "Settings",
  background: "Background",
};

const CATEGORY_ICONS: Record<AppLogCategory, IconName> = {
  app: "apps-outline",
  load: "sync-outline",
  navigation: "navigate-outline",
  ui: "phone-portrait-outline",
  connection: "wifi-outline",
  download: "arrow-down-circle-outline",
  library: "images-outline",
  playback: "play-circle-outline",
  storage: "server-outline",
  settings: "options-outline",
  background: "moon-outline",
};

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

function getLevelAppearance(level: AppLogLevel, colors: ThemeColors) {
  if (level === "error") {
    return { label: "Error", icon: "close-circle" as IconName, color: colors.danger, soft: colors.dangerSoft };
  }
  if (level === "warn") {
    return { label: "Warning", icon: "warning" as IconName, color: colors.warn, soft: colors.warnSoft };
  }
  return { label: "Info", icon: "information-circle" as IconName, color: colors.brand, soft: colors.brandSoft };
}

function formatEntryTime(value: string): { time: string; date: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: value, date: "" };
  return {
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: date.toLocaleDateString([], { month: "short", day: "numeric" }),
  };
}

function FilterChip({
  label,
  selected,
  count,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly count?: number;
  readonly onPress: () => void;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Filter ${label}${count === undefined ? "" : `, ${count} entries`}`}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          borderColor: selected ? colors.brand : colors.border,
          backgroundColor: selected ? colors.brandSoft : colors.surfaceElevated,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.brandStrong : colors.text }]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.chipCount, { backgroundColor: selected ? colors.brand : colors.surfaceMuted }]}>
          <Text style={[styles.chipCountText, { color: selected ? colors.onBrand : colors.textMuted }]}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function MetricButton({
  level,
  count,
  selected,
  onPress,
}: {
  readonly level: AppLogLevel;
  readonly count: number;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { colors, radius } = useAppTheme();
  const appearance = getLevelAppearance(level, colors);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${appearance.label}: ${count}`}
      style={({ pressed }) => [
        styles.metric,
        {
          borderRadius: radius.lg,
          borderColor: selected ? appearance.color : colors.borderSoft,
          backgroundColor: selected ? appearance.soft : colors.surface,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: appearance.soft }]}>
        <Ionicons name={appearance.icon} size={16} color={appearance.color} />
      </View>
      <Text style={[styles.metricCount, { color: colors.text }]}>{count}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{appearance.label}</Text>
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  destructive = false,
  disabled = false,
  onPress,
}: {
  readonly icon: IconName;
  readonly label: string;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}) {
  const { colors, radius } = useAppTheme();
  const color = destructive ? colors.danger : colors.brandStrong;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.actionButton,
        {
          borderRadius: radius.md,
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated,
          opacity: disabled ? 0.42 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function LogEntryCard({ entry, onPress }: { readonly entry: AppLogGroup; readonly onPress: () => void }) {
  const { colors, radius } = useAppTheme();
  const appearance = getLevelAppearance(entry.level, colors);
  const stamp = formatEntryTime(entry.ts);
  const firstStamp = formatEntryTime(entry.firstTs);
  const lastStamp = formatEntryTime(entry.lastTs);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${appearance.label.toLowerCase()} ${CATEGORY_LABELS[entry.category]} log details`}
      style={({ pressed }) => [
        styles.logCard,
        {
          borderRadius: radius.lg,
          borderColor: colors.borderSoft,
          backgroundColor: colors.surfaceElevated,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={[styles.severityRail, { backgroundColor: appearance.color }]} />
      <View style={styles.logContent}>
        <View style={styles.logMetaRow}>
          <View style={[styles.levelBadge, { backgroundColor: appearance.soft }]}>
            <Ionicons name={appearance.icon} size={13} color={appearance.color} />
            <Text style={[styles.levelBadgeText, { color: appearance.color }]}>{appearance.label}</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name={CATEGORY_ICONS[entry.category]} size={12} color={colors.textMuted} />
            <Text style={[styles.categoryText, { color: colors.textMuted }]}>
              {CATEGORY_LABELS[entry.category]}
            </Text>
          </View>
          <View style={styles.logTimeWrap}>
            <Text style={[styles.logTime, { color: colors.textMuted }]}>{stamp.time}</Text>
            <Text style={[styles.logDate, { color: colors.textFaint }]}>{stamp.date}</Text>
          </View>
        </View>
        <Text selectable style={[styles.logMessage, { color: colors.text }]}>
          {entry.message}
        </Text>
        {entry.occurrenceCount > 1 ? (
          <View
            style={[styles.repeatSummary, { backgroundColor: colors.surfaceMuted }]}
            accessible
            accessibilityLabel={`${entry.occurrenceCount} occurrences from ${firstStamp.time} to ${lastStamp.time}`}
          >
            <Ionicons name="repeat-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.repeatSummaryText, { color: colors.textMuted }]}>
              {entry.occurrenceCount} occurrences · {firstStamp.time}–{lastStamp.time}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function formatFullTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function LogGroupDetailSheet({
  group,
  visible,
  onClose,
}: {
  readonly group: AppLogGroup | null;
  readonly visible: boolean;
  readonly onClose: () => void;
}) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const appearance = group ? getLevelAppearance(group.level, colors) : null;

  return (
    <StaticBackdropSheet
      visible={visible && group !== null}
      onClose={onClose}
      enableSwipeToDismiss
      slideDistance={Math.max(420, windowHeight)}
      scrimTestID="developer-log-detail-scrim"
      sheetTestID="developer-log-detail-sheet"
      scrimAccessibilityLabel="Close log details"
      sheetStyle={{
        maxHeight: windowHeight * 0.86,
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
        borderTopLeftRadius: MEDIA_SHEET_RADIUS,
        borderTopRightRadius: MEDIA_SHEET_RADIUS,
        paddingHorizontal: MEDIA_SHEET_PAD_H,
        paddingBottom: Math.max(insets.bottom, 16),
        overflow: "hidden",
      }}
    >
      {({ requestClose, dragHandleProps }) => {
        if (!group || !appearance) return null;
        return (
          <>
            <CompactSheetHeader
              title="Log details"
              onClose={requestClose}
              closeAccessibilityLabel="Close log details"
              showHandle
              dividerInset={0}
              dragHandleProps={dragHandleProps}
              testID="developer-log-detail-header"
            />
            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={[
                styles.detailScrollContent,
                { paddingTop: SHEET_BODY_PAD_TOP },
              ]}
              showsVerticalScrollIndicator={group.entries.length > 3}
              bounces={group.entries.length > 1}
            >
              <View style={styles.detailBadgeRow}>
                <View style={[styles.levelBadge, { backgroundColor: appearance.soft }]}>
                  <Ionicons name={appearance.icon} size={14} color={appearance.color} />
                  <Text style={[styles.levelBadgeText, { color: appearance.color }]}>
                    {appearance.label}
                  </Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceMuted }]}>
                  <Ionicons name={CATEGORY_ICONS[group.category]} size={13} color={colors.textMuted} />
                  <Text style={[styles.categoryText, { color: colors.textMuted }]}>
                    {CATEGORY_LABELS[group.category]}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.detailSummary,
                  { borderRadius: radius.lg, borderColor: colors.borderSoft, backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.detailStat}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Occurrences</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{group.occurrenceCount}</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>First seen</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatFullTimestamp(group.firstTs)}
                  </Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Last seen</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatFullTimestamp(group.lastTs)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Latest event</Text>
              <View
                style={[
                  styles.detailMessageBox,
                  { borderRadius: radius.md, borderColor: colors.borderSoft, backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text selectable style={[styles.detailMessage, { color: colors.text }]}>
                  {group.message}
                </Text>
              </View>

              {group.entries.length > 1 ? (
                <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>All occurrences</Text>
                  <View style={styles.occurrenceList}>
                    {group.entries.map((entry, index) => (
                      <View
                        key={entry.id}
                        style={[
                          styles.occurrenceRow,
                          {
                            borderRadius: radius.md,
                            borderColor: colors.borderSoft,
                            backgroundColor: colors.surface,
                          },
                        ]}
                      >
                        <View style={styles.occurrenceHeader}>
                          <Text style={[styles.occurrenceIndex, { color: appearance.color }]}>
                            #{group.entries.length - index}
                          </Text>
                          <Text style={[styles.occurrenceTime, { color: colors.textMuted }]}>
                            {formatFullTimestamp(entry.ts)}
                          </Text>
                        </View>
                        <Text selectable style={[styles.occurrenceMessage, { color: colors.text }]}>
                          {entry.message}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
          </>
        );
      }}
    </StaticBackdropSheet>
  );
}

export default function SettingsDevLogsScreen() {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [allowed, setAllowed] = useState(() => internalToolsEnabled());
  const [appLogs, setAppLogs] = useState<readonly AppLogEntry[]>(() => getAppLogs());
  const [category, setCategory] = useState<AppLogCategoryFilter>("all");
  const [level, setLevel] = useState<AppLogLevelFilter>("all");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!internalToolsEnabled()) {
      setAllowed(false);
      router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
    }
  }, []);

  useEffect(() => {
    void hydrateAppLogs().then(() => setAppLogs(getAppLogs()));
    return subscribeAppLogs(() => setAppLogs(getAppLogs()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!internalToolsEnabled()) {
        router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
        return undefined;
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const filtered = useMemo(
    () => filterAppLogs(appLogs, { category, level, query }),
    [appLogs, category, level, query],
  );
  const grouped = useMemo(() => groupAppLogsByLocalDay(filtered), [filtered]);
  const selectedGroup = useMemo(
    () => grouped.find((entry) => entry.id === selectedGroupId) ?? null,
    [grouped, selectedGroupId],
  );
  const levelCounts = useMemo(
    () => ({
      error: appLogs.filter((entry) => entry.level === "error").length,
      warn: appLogs.filter((entry) => entry.level === "warn").length,
      info: appLogs.filter((entry) => entry.level === "info").length,
    }),
    [appLogs],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<AppLogCategory, number>();
    for (const entry of appLogs) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    return counts;
  }, [appLogs]);

  const exportLogs = useCallback(async () => {
    if (filtered.length === 0) {
      Alert.alert("Export logs", "No log entries match the current filters.");
      return;
    }
    setExporting(true);
    try {
      const body = buildAppLogExportText(filtered, { title: `${APP_NAME} developer logs` });
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!dir) throw new Error("No writable directory available.");
      const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
      const uri = `${dir}laneory-logs-${stamp}.txt`;
      await FileSystem.writeAsStringAsync(uri, body);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Export logs", "Sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "text/plain", dialogTitle: "Save developer logs" });
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }, [filtered]);

  const confirmClear = useCallback(() => {
    Alert.alert("Clear all logs?", "This permanently removes the local diagnostic history from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear logs",
        style: "destructive",
        onPress: () => {
          setClearing(true);
          void clearAppLogs()
            .then(() => setAppLogs(getAppLogs()))
            .finally(() => setClearing(false));
        },
      },
    ]);
  }, []);

  if (!allowed) return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Developer Logs" onBack={navigateBackToSettings} />
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LogEntryCard entry={item} onPress={() => setSelectedGroupId(item.id)} />
        )}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16), flexGrow: 1 },
        ]}
        ListHeaderComponent={
          <View>
            <View
              style={[
                styles.hero,
                { borderRadius: radius.xl, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroEyebrowRow}>
                  <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.heroEyebrow, { color: colors.success }]}>DIAGNOSTIC STREAM</Text>
                </View>
                <Text style={[styles.capacityText, { color: colors.textMuted }]}>
                  {appLogs.length}/{APP_LOG_MAX_ENTRIES}
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>App health at a glance</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                Live, local and sanitized. Inspect failures, warnings and background activity without exposing secrets.
              </Text>
              <View style={styles.metricsRow}>
                {(["error", "warn", "info"] as const).map((id) => (
                  <MetricButton
                    key={id}
                    level={id}
                    count={levelCounts[id]}
                    selected={level === id}
                    onPress={() => setLevel(level === id ? "all" : id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>FILTERS</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Find an event</Text>
              </View>
              {(category !== "all" || level !== "all" || query.trim()) ? (
                <Pressable
                  onPress={() => { setCategory("all"); setLevel("all"); setQuery(""); }}
                  accessibilityRole="button"
                  accessibilityLabel="Reset log filters"
                >
                  <Text style={[styles.resetText, { color: colors.brandStrong }]}>Reset</Text>
                </Pressable>
              ) : null}
            </View>
            <View
              style={[
                styles.searchBox,
                { borderRadius: radius.lg, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="search-outline" size={19} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search messages, levels or categories"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.brand}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={[styles.searchInput, { color: colors.text }]}
                accessibilityLabel="Search developer logs"
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Severity</Text>
            <View style={styles.levelChipRow}>
              {APP_LOG_LEVEL_FILTERS.map((id) => (
                <FilterChip
                  key={id}
                  label={id === "all" ? "All levels" : id === "warn" ? "Warnings" : `${id[0].toUpperCase()}${id.slice(1)}`}
                  count={id === "all" ? appLogs.length : levelCounts[id]}
                  selected={level === id}
                  onPress={() => setLevel(id)}
                />
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Subsystem</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroller}
            >
              {APP_LOG_CATEGORY_FILTERS.map((id) => (
                <FilterChip
                  key={id}
                  label={id === "all" ? "All systems" : CATEGORY_LABELS[id]}
                  count={id === "all" ? appLogs.length : categoryCounts.get(id) ?? 0}
                  selected={category === id}
                  onPress={() => setCategory(id)}
                />
              ))}
            </ScrollView>

            <View style={styles.actionsRow}>
              <ActionButton
                icon={exporting ? "hourglass-outline" : "share-outline"}
                label={exporting ? "Preparing…" : "Export filtered"}
                disabled={exporting || filtered.length === 0}
                onPress={() => void exportLogs()}
              />
              <ActionButton
                icon={clearing ? "hourglass-outline" : "trash-outline"}
                label={clearing ? "Clearing…" : "Clear all"}
                destructive
                disabled={clearing || appLogs.length === 0}
                onPress={confirmClear}
              />
            </View>

            <View style={styles.resultsHeader}>
              <View>
                <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>EVENT TIMELINE</Text>
                <Text style={[styles.resultsTitle, { color: colors.text }]}>Matching events</Text>
                <Text style={[styles.resultsSummary, { color: colors.textMuted }]}>
                  {grouped.length} groups from {filtered.length} raw events
                </Text>
              </View>
              <View style={[styles.resultCountBadge, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={[styles.resultCount, { color: colors.textMuted }]}>{grouped.length}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyBox,
              { borderRadius: radius.xl, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.brandSoft }]}>
              <Ionicons name={appLogs.length === 0 ? "pulse-outline" : "search-outline"} size={25} color={colors.brand} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {appLogs.length === 0 ? "Waiting for activity" : "No matching events"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {appLogs.length === 0
                ? "Connection, download and app lifecycle events will appear here automatically."
                : "Try another search or reset the active filters."}
            </Text>
          </View>
        }
      />
      <LogGroupDetailSheet
        group={selectedGroup}
        visible={selectedGroup !== null}
        onClose={() => setSelectedGroupId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 10 },
  hero: { borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 22 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  heroEyebrow: { fontFamily: Type.fontBold, fontSize: 11, letterSpacing: 0.9 },
  capacityText: { fontFamily: Type.monoMed, fontSize: 11 },
  heroTitle: { ...Type.title, marginTop: 12 },
  heroSubtitle: { ...Type.body, marginTop: 4, maxWidth: 560 },
  metricsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  metric: { flex: 1, minWidth: 0, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  metricIcon: { width: 27, height: 27, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  metricCount: { fontFamily: Type.fontBold, fontSize: 19, lineHeight: 22 },
  metricLabel: { fontFamily: Type.fontSemi, fontSize: 11, marginTop: 1 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 },
  sectionEyebrow: { fontFamily: Type.fontBold, fontSize: 10, letterSpacing: 1 },
  sectionTitle: { ...Type.subtitle, marginTop: 1 },
  resetText: { fontFamily: Type.fontSemi, fontSize: 13, paddingVertical: 4 },
  searchBox: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 9 },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: Type.font, fontSize: 14 },
  filterLabel: { fontFamily: Type.fontBold, fontSize: 10, letterSpacing: 0.9, textTransform: "uppercase", marginTop: 15, marginBottom: 8 },
  levelChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  categoryScroller: { gap: 7, paddingRight: 16 },
  chip: { minHeight: 36, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 11, paddingRight: 7, flexDirection: "row", alignItems: "center", gap: 7 },
  chipText: { fontFamily: Type.fontSemi, fontSize: 12 },
  chipCount: { minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  chipCountText: { fontFamily: Type.monoMed, fontSize: 10 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 18, marginBottom: 24 },
  actionButton: { flex: 1, minHeight: 44, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 10 },
  actionLabel: { fontFamily: Type.fontSemi, fontSize: 13 },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  resultsTitle: { ...Type.subtitle, marginTop: 1 },
  resultsSummary: { fontFamily: Type.font, fontSize: 10, marginTop: 2 },
  resultCountBadge: { minWidth: 34, height: 28, paddingHorizontal: 9, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resultCount: { fontFamily: Type.monoMed, fontSize: 11 },
  logCard: { minHeight: 80, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", overflow: "hidden", marginBottom: 9 },
  severityRail: { width: 3 },
  logContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 11 },
  logMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  levelBadge: { minHeight: 24, paddingHorizontal: 7, borderRadius: 7, flexDirection: "row", alignItems: "center", gap: 4 },
  levelBadgeText: { fontFamily: Type.fontBold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.35 },
  categoryBadge: { minHeight: 24, paddingHorizontal: 7, borderRadius: 7, flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 120 },
  categoryText: { fontFamily: Type.fontSemi, fontSize: 10 },
  logTimeWrap: { marginLeft: "auto", alignItems: "flex-end" },
  logTime: { fontFamily: Type.monoMed, fontSize: 10 },
  logDate: { fontFamily: Type.font, fontSize: 9, marginTop: -1 },
  logMessage: { fontFamily: Type.mono, fontSize: 11.5, lineHeight: 17, marginTop: 9 },
  repeatSummary: { alignSelf: "flex-start", minHeight: 24, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, marginTop: 8 },
  repeatSummaryText: { fontFamily: Type.monoMed, fontSize: 9.5 },
  detailScroll: { flexGrow: 0, flexShrink: 1 },
  detailScrollContent: { paddingBottom: 4 },
  detailBadgeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailSummary: { borderWidth: StyleSheet.hairlineWidth, padding: 13, gap: 12, marginTop: 14 },
  detailStat: { gap: 3 },
  detailLabel: { fontFamily: Type.fontSemi, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.55 },
  detailValue: { fontFamily: Type.monoMed, fontSize: 12, lineHeight: 17 },
  detailSectionTitle: { fontFamily: Type.fontBold, fontSize: 13, marginTop: 18, marginBottom: 8 },
  detailMessageBox: { borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  detailMessage: { fontFamily: Type.mono, fontSize: 12, lineHeight: 18 },
  occurrenceList: { gap: 8 },
  occurrenceRow: { borderWidth: StyleSheet.hairlineWidth, padding: 11 },
  occurrenceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  occurrenceIndex: { fontFamily: Type.fontBold, fontSize: 10 },
  occurrenceTime: { flexShrink: 1, textAlign: "right", fontFamily: Type.monoMed, fontSize: 9.5 },
  occurrenceMessage: { fontFamily: Type.mono, fontSize: 11, lineHeight: 16, marginTop: 7 },
  emptyBox: { borderWidth: StyleSheet.hairlineWidth, alignItems: "center", paddingHorizontal: 24, paddingVertical: 30 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { ...Type.subtitle },
  emptyText: { ...Type.body, textAlign: "center", marginTop: 4, maxWidth: 300 },
});
