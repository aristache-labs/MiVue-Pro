import Constants from "expo-constants";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sanitizeDiagnosticLine } from "@/components/camera/cameraLibraryModel";
import { internalToolsEnabled } from "@/components/environment/resolveInternalTools";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import {
  SettingsActionRow,
  SettingsSection,
  SettingsValueRow,
  diagnosticsRequestStatus,
  transportLabel,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { APP_NAME } from "@/constants/Brand";
import { useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

export default function SettingsDiagnosticsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    cameraHost,
    cameraLinkState,
    lastConnectedAt,
    lastError,
    nativeTcpReady,
    isExpoGo,
    refreshFiles,
    isRefreshingCamera,
    localFiles,
    mapPreference,
  } = useDemoMode();

  const [exporting, setExporting] = useState(false);
  const [lastTestAt, setLastTestAt] = useState<string | undefined>();
  const [allowed, setAllowed] = useState(() => internalToolsEnabled());

  useEffect(() => {
    if (!internalToolsEnabled()) {
      setAllowed(false);
      router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
    }
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

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0";
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    undefined;

  const runConnectivityTest = useCallback(async () => {
    const result = await refreshFiles();
    setLastTestAt(new Date().toISOString());
    if (!result.ok) {
      Alert.alert(
        "Connectivity test",
        sanitizeDiagnosticLine(result.error ?? "Request failed.") ?? "Request failed.",
      );
    }
  }, [refreshFiles]);

  const exportDiagnostics = useCallback(async () => {
    setExporting(true);
    try {
      const lines = [
        `${APP_NAME} diagnostics`,
        `version=${version}`,
        build ? `build=${build}` : undefined,
        `linkState=${cameraLinkState}`,
        `host=${cameraHost}`,
        `nativeTcp=${nativeTcpReady}`,
        `expoGo=${isExpoGo}`,
        lastConnectedAt ? `lastConnected=${lastConnectedAt}` : undefined,
        lastTestAt ? `lastTest=${lastTestAt}` : undefined,
        lastError ? `lastError=${sanitizeDiagnosticLine(lastError)}` : undefined,
        `localFiles=${localFiles.length}`,
        `mapPreference=${mapPreference}`,
      ].filter(Boolean) as string[];

      const body = lines.map(sanitizeDiagnosticLine).join("\n");
      Alert.alert("Sanitized diagnostics", body, [{ text: "OK" }]);
    } catch (error) {
      Alert.alert(
        "Export failed",
        sanitizeDiagnosticLine(error instanceof Error ? error.message : String(error)) ??
          "Could not export diagnostics.",
      );
    } finally {
      setExporting(false);
    }
  }, [
    version,
    build,
    cameraLinkState,
    cameraHost,
    nativeTcpReady,
    isExpoGo,
    lastConnectedAt,
    lastTestAt,
    lastError,
    localFiles.length,
    mapPreference,
  ]);

  const requestStatus = diagnosticsRequestStatus({
    lastError,
    linkState: cameraLinkState,
  });

  if (!allowed) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Diagnostics" onBack={navigateBackToSettings} />

      <SettingsScroll
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <SettingsSection title="Connectivity">
          <SettingsActionRow
            icon="pulse-outline"
            title="Connectivity test"
            subtitle="Runs the same read-only status and file list refresh"
            loading={isRefreshingCamera}
            disabled={isRefreshingCamera}
            onPress={() => void runConnectivityTest()}
            accessibilityLabel="Run connectivity test"
          />
          <SettingsValueRow
            icon="alert-circle-outline"
            title="Last request status"
            value={requestStatus}
            subtitle={lastError ? sanitizeDiagnosticLine(lastError) : undefined}
          />
          {lastTestAt ? (
            <SettingsValueRow
              icon="time-outline"
              title="Last connectivity test"
              value={new Date(lastTestAt).toLocaleString()}
            />
          ) : null}
          <SettingsValueRow
            icon="hardware-chip-outline"
            title="Transport"
            value={transportLabel({ nativeTcpReady, isExpoGo })}
          />
        </SettingsSection>

        <SettingsSection title="Export">
          <SettingsActionRow
            icon="share-outline"
            title="Export sanitized diagnostics"
            subtitle="No passwords, API keys, tokens, or private paths"
            loading={exporting}
            disabled={exporting}
            onPress={() => void exportDiagnostics()}
            accessibilityLabel="Export sanitized diagnostics"
          />
        </SettingsSection>
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
