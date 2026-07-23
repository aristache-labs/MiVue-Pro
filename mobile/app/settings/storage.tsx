import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import {
  SettingsActionRow,
  SettingsDangerRow,
  SettingsSection,
  SettingsValueRow,
  visibleConnectionStatus,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import {
  aggregateStorageBreakdown,
  formatStorageStatLine,
  storageBreakdownRows,
  type StorageSizedItem,
} from "@/components/settings/storageBreakdown";
import { normalizeLocalFiles } from "@/components/local/localLibraryFilters";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { FileCategory } from "@/packages/parsers/src/index";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

const STAT_ICONS = {
  normal: "videocam-outline",
  parking: "car-outline",
  event: "flash-outline",
  photo: "image-outline",
  unknown: "help-circle-outline",
} as const;

function CameraSdPlaceholder({
  kind,
}: {
  readonly kind: "connecting" | "disconnected";
}) {
  const { colors, radius } = useAppTheme();
  const connecting = kind === "connecting";
  const title = connecting ? "Connecting to camera" : "Camera not connected";
  const subtitle = connecting
    ? "Camera statistics will appear after the connection is ready."
    : "Connect to the camera to view SD card statistics.";

  return (
    <View
      style={styles.placeholderRow}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View
        style={[
          styles.placeholderIcon,
          { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm },
        ]}
      >
        {connecting ? (
          <ActivityIndicator size="small" color={colors.textMuted} />
        ) : (
          <Ionicons name="cloud-offline-outline" size={18} color={colors.brand} />
        )}
      </View>
      <View style={styles.placeholderBody}>
        <Text style={[styles.placeholderTitle, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.placeholderSubtitle, { color: colors.textMuted }]} numberOfLines={3}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function SettingsStorageScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { localFiles, files, cameraLinkState, clearThumbCache } = useDemoMode();
  const cameraStatus = visibleConnectionStatus(cameraLinkState);
  const cameraConnected = cameraStatus === "connected";
  const cameraConnecting = cameraStatus === "connecting";

  const categoryByName = useMemo(() => {
    const map = new Map<string, FileCategory>();
    for (const file of files) {
      map.set(file.name, file.category);
    }
    return map;
  }, [files]);

  const localBreakdown = useMemo(() => {
    const normalized = normalizeLocalFiles(localFiles, categoryByName);
    const items: StorageSizedItem[] = normalized.map((entry) => ({
      category: entry.category,
      sizeBytes: entry.file.sizeBytes,
    }));
    return aggregateStorageBreakdown(items);
  }, [localFiles, categoryByName]);

  const cameraBreakdown = useMemo(() => {
    if (!cameraConnected) {
      return aggregateStorageBreakdown([]);
    }
    const items: StorageSizedItem[] = files.map((file) => ({
      category: file.category,
      sizeBytes: file.sizeBytes,
    }));
    return aggregateStorageBreakdown(items);
  }, [files, cameraConnected]);

  const localRows = useMemo(() => storageBreakdownRows(localBreakdown), [localBreakdown]);
  const cameraRows = useMemo(() => storageBreakdownRows(cameraBreakdown), [cameraBreakdown]);

  const cameraSummary = cameraConnected
    ? formatStorageStatLine(cameraBreakdown.total.count, cameraBreakdown.total.bytes)
    : cameraConnecting
      ? "Connecting…"
      : "Not connected";

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const onClearCache = useCallback(() => {
    Alert.alert(
      "Clear thumbnail cache",
      "Removes cached camera thumbnails only. Downloaded recordings are kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear cache",
          style: "destructive",
          onPress: () => void clearThumbCache(),
        },
      ],
    );
  }, [clearThumbCache]);

  const onFormatHelp = useCallback(() => {
    Alert.alert(
      "Format on the camera",
      "For safety, Laneory does not format or modify the SD card. Use the camera’s built-in menu and follow the camera manufacturer’s instructions.",
      [{ text: "OK" }],
    );
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Downloads & Storage" onBack={navigateBackToSettings} />

      <SettingsScroll
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <SettingsSection
          title="Local library"
          summary={formatStorageStatLine(localBreakdown.total.count, localBreakdown.total.bytes)}
          style={styles.section}
        >
          {localRows.map((row) => (
            <SettingsValueRow
              key={`local-${row.key}`}
              icon={STAT_ICONS[row.key]}
              title={row.title}
              value={row.line}
              compact
            />
          ))}
        </SettingsSection>

        <SettingsSection title="Camera SD card" summary={cameraSummary} style={styles.section}>
          {cameraConnected ? (
            <>
              {cameraRows.map((row) => (
                <SettingsValueRow
                  key={`camera-${row.key}`}
                  icon={STAT_ICONS[row.key]}
                  title={row.title}
                  value={row.line}
                  compact
                />
              ))}
              <Text style={[styles.footnote, { color: colors.textMuted }]}>
                Based on files currently listed by Laneory.
              </Text>
            </>
          ) : (
            <CameraSdPlaceholder kind={cameraConnecting ? "connecting" : "disconnected"} />
          )}
        </SettingsSection>

        <SettingsSection title="Storage" style={styles.section}>
          <SettingsValueRow
            icon="folder-outline"
            title="Download folder"
            value="On device"
            subtitle="Managed app storage. Files stay on this device until you export or delete them."
            compact
          />
        </SettingsSection>

        <SettingsSection title="SD card maintenance" style={styles.section}>
          <SettingsActionRow
            icon="information-circle-outline"
            title="How to format the SD card"
            subtitle="Formatting is performed from the camera’s built-in menu"
            compact
            onPress={onFormatHelp}
            accessibilityLabel="How to format the SD card"
          />
        </SettingsSection>

        <SettingsSection title="Cache" style={styles.sectionLast}>
          <SettingsDangerRow
            icon="trash-outline"
            title="Clear thumbnail cache"
            subtitle="Does not delete downloaded recordings"
            compact
            onPress={onClearCache}
            accessibilityLabel="Clear thumbnail cache"
          />
        </SettingsSection>
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { marginBottom: 10 },
  sectionLast: { marginBottom: 0 },
  footnote: {
    fontSize: 12,
    fontFamily: Type.font,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  placeholderRow: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderBody: { flex: 1, minWidth: 0 },
  placeholderTitle: { fontSize: 15, fontFamily: Type.fontSemi },
  placeholderSubtitle: {
    fontSize: 12,
    fontFamily: Type.font,
    marginTop: 1,
    lineHeight: 15,
  },
});
