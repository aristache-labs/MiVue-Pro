import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { Alert, Text, StyleSheet, View } from "react-native";

import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import {
  SettingsActionRow,
  SettingsDangerRow,
  SettingsSection,
  SettingsValueRow,
  storageSummary,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";

export default function SettingsStorageScreen() {
  const { colors } = useAppTheme();
  const { localFiles, clearThumbCache } = useDemoMode();

  const downloadedBytes = useMemo(
    () => localFiles.reduce((sum, f) => sum + (f.sizeBytes > 0 ? f.sizeBytes : 0), 0),
    [localFiles],
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

  return (
    <SettingsScroll>
      <SettingsSection title="Local library">
        <View style={styles.summaryBlock}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            {storageSummary(localFiles.length, downloadedBytes)}
          </Text>
          {localFiles.length > 0 ? (
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>
              {localFiles.length} files · {formatMediaSizeMbGb(downloadedBytes)}
            </Text>
          ) : (
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>
              Download recordings from the camera Library to store them here.
            </Text>
          )}
        </View>
        <SettingsActionRow
          icon="folder-open-outline"
          title="Open Local Library"
          onPress={() => router.push("/(tabs)/local" as Parameters<typeof router.push>[0])}
          accessibilityLabel="Open Local Library"
        />
      </SettingsSection>

      <SettingsSection title="Storage">
        <SettingsValueRow
          icon="folder-outline"
          title="Download folder"
          value="On device"
          subtitle="Managed app storage. Files stay on this device until you export or delete them."
        />
      </SettingsSection>

      <SettingsSection title="Cache">
        <SettingsDangerRow
          icon="trash-outline"
          title="Clear thumbnail cache"
          subtitle="Does not delete downloaded recordings"
          onPress={onClearCache}
          accessibilityLabel="Clear thumbnail cache"
        />
      </SettingsSection>
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  summaryBlock: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 4 },
  summaryTitle: { fontSize: 16, fontFamily: Type.fontSemi },
  summarySub: { fontSize: 13, fontFamily: Type.font, lineHeight: 18 },
});
