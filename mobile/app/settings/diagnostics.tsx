import Constants from "expo-constants";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { sanitizeDiagnosticLine } from "@/components/camera/cameraLibraryModel";
import {
  SettingsActionRow,
  SettingsSection,
  SettingsValueRow,
  diagnosticsRequestStatus,
  transportLabel,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { APP_NAME } from "@/constants/Brand";
import { useDemoMode } from "@/context/DemoModeContext";

export default function SettingsDiagnosticsScreen() {
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

  return (
    <SettingsScroll>
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
  );
}
