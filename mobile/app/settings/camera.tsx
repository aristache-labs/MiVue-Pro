import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, BackHandler, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCameraProfile } from "@/components/onboarding";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { CameraIpSheet } from "@/components/settings/CameraIpSheet";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import {
  SettingsActionRow,
  SettingsSection,
  SettingsStatusBadge,
  SettingsValueRow,
  cameraStatusTitle,
  connectionHubKind,
  connectionStatusLabel,
  formatLastConnected,
  lastConnectedSummaryLine,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

export default function SettingsCameraScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    cameraHost,
    setCameraHost,
    cameraLinkState,
    cameraModel,
    lastConnectedAt,
    cameraProperties,
    refreshFiles,
    isRefreshingCamera,
  } = useDemoMode();
  const { state: onboardingState, startChangeCamera } = useOnboarding();
  const [refreshPending, setRefreshPending] = useState(false);
  const [ipSheetOpen, setIpSheetOpen] = useState(false);

  const selectedProfile = getCameraProfile(onboardingState.selectedCameraProfileId);
  const cameraConfigured =
    Boolean(onboardingState.selectedCameraProfileId) || onboardingState.cameraSetupCompleted;
  const statusLabel = connectionStatusLabel(cameraLinkState);
  const kind = connectionHubKind(cameraLinkState);
  const modelName = selectedProfile?.displayName ?? cameraModel;
  const statusTitle = cameraStatusTitle(cameraConfigured, modelName);
  const modelRowValue = modelName?.trim()
    ? modelName
    : cameraConfigured
      ? "—"
      : "No camera configured";
  const lastConnectedValue = formatLastConnected(lastConnectedAt);
  const lastConnectedLine = lastConnectedSummaryLine(lastConnectedAt);

  useFocusEffect(
    useCallback(() => {
      if (ipSheetOpen) return undefined;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, [ipSheetOpen]),
  );

  const onRefresh = useCallback(async () => {
    if (refreshPending || isRefreshingCamera) return;
    setRefreshPending(true);
    try {
      await refreshFiles();
    } finally {
      setRefreshPending(false);
    }
  }, [isRefreshingCamera, refreshFiles, refreshPending]);

  const onChangeCamera = useCallback(() => {
    Alert.alert(
      "Change camera",
      "Local downloads and the download queue are kept. You will pick a camera profile again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: () => {
            void startChangeCamera().then(() => {
              router.push("/onboarding/select-camera" as Parameters<typeof router.push>[0]);
            });
          },
        },
      ],
    );
  }, [startChangeCamera]);

  const actionsBusy = refreshPending || isRefreshingCamera;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Camera & Connection" onBack={navigateBackToSettings} />

      <SettingsScroll
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
          flexGrow: 1,
        }}
      >
        <SettingsSection title="Status" style={styles.section}>
          <View style={styles.statusBlock}>
            <SettingsStatusBadge kind={kind} label={statusLabel} />
            <Text style={[styles.statusMeta, { color: colors.text }]} numberOfLines={1}>
              {statusTitle}
            </Text>
            <Text
              style={[styles.statusMetaMuted, styles.tabular, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {cameraHost}
            </Text>
            {lastConnectedLine ? (
              <Text
                style={[styles.statusMetaMuted, styles.tabular, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {lastConnectedLine}
              </Text>
            ) : null}
          </View>
        </SettingsSection>

        <SettingsSection title="Camera information" style={styles.section}>
          <SettingsValueRow icon="wifi" title="Connection status" value={statusLabel} compact />
          <SettingsValueRow
            icon="videocam-outline"
            title="Camera model"
            value={modelRowValue}
            compact
          />
          <SettingsActionRow
            icon="globe-outline"
            title="Camera IP"
            value={cameraHost}
            subtitle="Private Wi‑Fi address of the camera"
            compact
            onPress={() => setIpSheetOpen(true)}
            accessibilityLabel="Camera IP"
          />
          <SettingsValueRow
            icon="time-outline"
            title="Last connected"
            value={lastConnectedValue}
            compact
          />
          {cameraProperties["Camera.Menu.VideoRes"] ? (
            <SettingsValueRow
              icon="film-outline"
              title="Video resolution"
              value={cameraProperties["Camera.Menu.VideoRes"]}
              compact
            />
          ) : null}
          <SettingsValueRow
            icon="checkmark-circle-outline"
            title="Compatibility"
            subtitle="Confirmed read-only with Mio MiVue 866. Independent app — not affiliated with Mio or MiTAC."
            compact
          />
        </SettingsSection>

        <SettingsSection title="Actions" style={styles.sectionLast}>
          <SettingsActionRow
            icon="refresh"
            title="Refresh camera information"
            subtitle="Reconnects and refreshes read-only camera data"
            compact
            loading={refreshPending}
            disabled={actionsBusy}
            onPress={() => void onRefresh()}
            accessibilityLabel="Refresh camera information"
          />
          <SettingsActionRow
            icon="swap-horizontal-outline"
            title="Change camera"
            subtitle="Does not delete local recordings or clear the queue"
            compact
            disabled={actionsBusy}
            onPress={onChangeCamera}
            accessibilityLabel="Change camera"
          />
          <SettingsActionRow
            icon="help-circle-outline"
            title="Connection help"
            compact
            disabled={actionsBusy}
            onPress={() =>
              router.push({
                pathname: "/connection-help",
                params: { source: "settings-camera" },
              } as Parameters<typeof router.push>[0])
            }
            accessibilityLabel="Connection help"
          />
        </SettingsSection>
      </SettingsScroll>

      <CameraIpSheet
        visible={ipSheetOpen}
        currentHost={cameraHost}
        onClose={() => setIpSheetOpen(false)}
        onSave={(host) => {
          setCameraHost(host);
          setIpSheetOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { marginBottom: 10 },
  sectionLast: { marginBottom: 0 },
  statusBlock: { paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  statusMeta: { fontSize: 15, fontFamily: Type.fontSemi, marginTop: 2 },
  statusMetaMuted: { fontSize: 12, fontFamily: Type.font },
  tabular: { fontFamily: Type.mono, fontVariant: ["tabular-nums"] },
});
