import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  APP_LOG_CATEGORY_FILTERS,
  APP_LOG_LEVEL_FILTERS,
  buildAppLogExportText,
  filterAppLogs,
  formatAppLogLine,
  type AppLogCategoryFilter,
  type AppLogEntry,
  type AppLogLevelFilter,
} from "@/components/diagnostics/appLogFormat";
import {
  clearAppLogs,
  getAppLogs,
  hydrateAppLogs,
  subscribeAppLogs,
} from "@/components/diagnostics/appLogStore";
import { internalToolsEnabled } from "@/components/environment/resolveInternalTools";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import {
  SettingsActionRow,
  SettingsDangerRow,
  SettingsSection,
  SettingsValueRow,
} from "@/components/settings";
import { APP_NAME } from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Filter ${label}`}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.sm,
          borderColor: selected ? colors.brand : colors.border,
          backgroundColor: selected ? colors.brandSoft : colors.surface,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.brand : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsDevLogsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [allowed, setAllowed] = useState(() => internalToolsEnabled());
  const [appLogs, setAppLogs] = useState<readonly AppLogEntry[]>(() => getAppLogs());
  const [category, setCategory] = useState<AppLogCategoryFilter>("all");
  const [level, setLevel] = useState<AppLogLevelFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

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
    () => filterAppLogs(appLogs, { category, level }),
    [appLogs, category, level],
  );

  const exportLogs = useCallback(async () => {
    if (filtered.length === 0) {
      Alert.alert("Export logs", "No log entries match the current filters.");
      return;
    }
    setExporting(true);
    try {
      const body = buildAppLogExportText(filtered, {
        title: `${APP_NAME} developer logs`,
      });
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!dir) {
        throw new Error("No writable directory available.");
      }
      const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
      const uri = `${dir}laneory-logs-${stamp}.txt`;
      await FileSystem.writeAsStringAsync(uri, body);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Export logs", "Sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "text/plain",
        dialogTitle: "Save developer logs",
      });
    } catch (error) {
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setExporting(false);
    }
  }, [filtered]);

  const confirmClear = useCallback(() => {
    Alert.alert("Clear logs", "Delete all locally stored developer logs?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
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

  if (!allowed) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Developer Logs" onBack={navigateBackToSettings} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View>
            <SettingsSection title="Filters">
              <View style={styles.filterBlock}>
                <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Category</Text>
                <View style={styles.chipRow}>
                  {APP_LOG_CATEGORY_FILTERS.map((id) => (
                    <FilterChip
                      key={id}
                      label={id}
                      selected={category === id}
                      onPress={() => setCategory(id)}
                    />
                  ))}
                </View>
                <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Level</Text>
                <View style={styles.chipRow}>
                  {APP_LOG_LEVEL_FILTERS.map((id) => (
                    <FilterChip
                      key={id}
                      label={id}
                      selected={level === id}
                      onPress={() => setLevel(id)}
                    />
                  ))}
                </View>
              </View>
            </SettingsSection>

            <SettingsSection title="Actions">
              <SettingsValueRow
                icon="list-outline"
                title="Matching entries"
                value={`${filtered.length}/${appLogs.length}`}
                subtitle="Local only · sanitized (no secrets)"
              />
              <SettingsActionRow
                icon="share-outline"
                title="Export / Save"
                subtitle="Share filtered logs as a text file"
                loading={exporting}
                disabled={exporting || filtered.length === 0}
                onPress={() => void exportLogs()}
                accessibilityLabel="Export or save developer logs"
              />
              <SettingsDangerRow
                icon="trash-outline"
                title="Clear logs"
                subtitle="Removes the entire local log ring"
                loading={clearing}
                disabled={clearing || appLogs.length === 0}
                onPress={confirmClear}
                accessibilityLabel="Clear developer logs"
              />
            </SettingsSection>

            <Text style={[styles.listTitle, { color: colors.textMuted }]}>Log output</Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {appLogs.length === 0
                ? "No logs yet. Connect, download, or run a connectivity test."
                : "No entries match the current filters."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Text
            style={[
              styles.logLine,
              {
                color:
                  item.level === "error"
                    ? colors.danger
                    : item.level === "warn"
                      ? colors.text
                      : colors.textMuted,
              },
            ]}
            selectable
          >
            {formatAppLogLine(item)}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  filterBlock: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 12,
    fontFamily: Type.fontSemi,
  },
  listTitle: {
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 12,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  emptyBox: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: Type.font,
    lineHeight: 18,
  },
  logLine: {
    fontSize: 11,
    fontFamily: Type.monoMed,
    lineHeight: 16,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
});
