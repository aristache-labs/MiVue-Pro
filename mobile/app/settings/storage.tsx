import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
  formatCameraListedFilesAccessibility,
  formatStorageStatLine,
  storageBreakdownRows,
  type StorageSizedItem,
} from "@/components/settings/storageBreakdown";
import {
  deleteLocalLibraryConfirmButton,
  deleteLocalLibraryConfirmMessage,
  deleteLocalLibrarySubtitle,
  isDeleteLocalLibraryDisabled,
  runDeleteLocalLibraryBatch,
} from "@/components/settings/deleteLocalLibraryCopy";
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

export default function SettingsStorageScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    localFiles,
    files,
    cameraLinkState,
    clearThumbCache,
    deleteLocalFilesBatch,
    isRefreshingCamera,
  } = useDemoMode();
  const cameraStatus = visibleConnectionStatus(cameraLinkState);
  const cameraConnected = cameraStatus === "connected";
  const cameraConnecting = cameraStatus === "connecting";
  const [deletingLibrary, setDeletingLibrary] = useState(false);
  const deletingRef = useRef(false);

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
      id: entry.file.uri,
      category: entry.category,
      sizeBytes: entry.file.sizeBytes,
    }));
    return aggregateStorageBreakdown(items);
  }, [localFiles, categoryByName]);

  const cameraBreakdown = useMemo(() => {
    const items: StorageSizedItem[] = files.map((file) => ({
      id: file.path,
      category: file.category,
      sizeBytes: file.sizeBytes,
    }));
    return aggregateStorageBreakdown(items);
  }, [files]);

  const localRows = useMemo(() => storageBreakdownRows(localBreakdown), [localBreakdown]);
  const cameraRows = useMemo(() => storageBreakdownRows(cameraBreakdown), [cameraBreakdown]);

  const hasCameraListedFiles = files.length > 0;
  const cameraListLoading =
    !hasCameraListedFiles && (cameraConnecting || isRefreshingCamera);
  const showCameraBreakdown = hasCameraListedFiles || cameraConnected;

  const cameraSdSummary = cameraListLoading
    ? "Loading…"
    : hasCameraListedFiles || cameraConnected
      ? formatStorageStatLine(cameraBreakdown.total.count, cameraBreakdown.total.bytes, {
          allSizesKnown: cameraBreakdown.allSizesKnown,
        })
      : "Unavailable";

  const cameraSdSummaryA11y = cameraListLoading
    ? "Loading camera file list"
    : hasCameraListedFiles || cameraConnected
      ? formatCameraListedFilesAccessibility(
          cameraBreakdown.total.count,
          cameraBreakdown.total.bytes,
          { allSizesKnown: cameraBreakdown.allSizesKnown },
        )
      : "Camera file list unavailable";

  const localEmpty = localFiles.length === 0;
  const deleteDisabled = isDeleteLocalLibraryDisabled(localFiles.length, deletingLibrary);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const runDeleteLocalLibrary = useCallback(async () => {
    setDeletingLibrary(true);
    try {
      const outcome = await runDeleteLocalLibraryBatch(
        deletingRef,
        localFiles,
        deleteLocalFilesBatch,
      );
      if (outcome.skipped) return;
      void AccessibilityInfo.announceForAccessibility(outcome.message);
      Alert.alert(
        outcome.deleted > 0 && outcome.failed === 0 ? "Local library" : "Delete local library",
        outcome.message,
        [{ text: "OK" }],
      );
    } finally {
      setDeletingLibrary(false);
    }
  }, [deleteLocalFilesBatch, localFiles]);

  const onDeleteLocalLibrary = useCallback(() => {
    if (deleteDisabled) return;
    const count = localBreakdown.total.count;
    const bytes = localBreakdown.total.bytes;
    Alert.alert("Delete local library?", deleteLocalLibraryConfirmMessage(count, bytes), [
      { text: "Cancel", style: "cancel" },
      {
        text: deleteLocalLibraryConfirmButton(count),
        style: "destructive",
        onPress: () => void runDeleteLocalLibrary(),
      },
    ]);
  }, [
    deleteDisabled,
    localBreakdown.total.count,
    localBreakdown.total.bytes,
    runDeleteLocalLibrary,
  ]);

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
          summary={formatStorageStatLine(localBreakdown.total.count, localBreakdown.total.bytes, {
            allSizesKnown: localBreakdown.allSizesKnown,
          })}
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
          <SettingsDangerRow
            icon="trash-outline"
            title={deletingLibrary ? "Deleting…" : "Delete local library"}
            subtitle={deleteLocalLibrarySubtitle(localFiles.length)}
            compact
            loading={deletingLibrary}
            disabled={deleteDisabled}
            onPress={deleteDisabled ? undefined : onDeleteLocalLibrary}
            accessibilityLabel={
              localEmpty
                ? "Delete local library, no local files to delete"
                : deletingLibrary
                  ? "Deleting local library"
                  : "Delete local library"
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Camera SD card"
          summary={cameraSdSummary}
          summaryAccessibilityLabel={cameraSdSummaryA11y}
          style={styles.section}
        >
          {showCameraBreakdown ? (
            cameraRows.map((row) => (
              <SettingsValueRow
                key={`camera-${row.key}`}
                icon={STAT_ICONS[row.key]}
                title={row.title}
                value={row.line}
                compact
              />
            ))
          ) : cameraListLoading ? (
            <View
              style={styles.cameraPlaceholder}
              accessibilityLabel="Loading camera file list"
              testID="camera-sd-card-loading"
            >
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={[styles.cameraPlaceholderText, { color: colors.textMuted }]}>
                Loading…
              </Text>
            </View>
          ) : (
            <View
              style={styles.cameraPlaceholder}
              accessibilityLabel="Connect to the camera to view listed recordings"
              testID="camera-sd-card-unavailable"
            >
              <Text style={[styles.cameraPlaceholderText, { color: colors.textMuted }]}>
                Connect to the camera to view listed recordings.
              </Text>
            </View>
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
  cameraPlaceholder: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cameraPlaceholderText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Type.font,
    lineHeight: 18,
  },
});
