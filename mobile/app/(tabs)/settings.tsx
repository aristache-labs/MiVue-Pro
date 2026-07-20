import Constants from "expo-constants";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatMediaSizeMbGb,
  sanitizeDiagnosticLine,
} from "@/components/camera/cameraLibraryModel";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { Card } from "@/components/ui";
import {
  APP_NAME,
  APP_SHORT_DESCRIPTION,
  APP_SUBTITLE,
  DISCLAIMER_EN,
} from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type MapPreference } from "@/context/DemoModeContext";
import { isPrivateIpv4 } from "@/packages/camera-transport/src/index";

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <Card style={{ padding: 0, overflow: "hidden", borderRadius: radius.md }}>{children}</Card>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    cameraHost,
    setCameraHost,
    cameraLinkState,
    cameraModel,
    lastConnectedAt,
    cameraProperties,
    lastError,
    nativeTcpReady,
    isExpoGo,
    refreshFiles,
    isRefreshingCamera,
    localFiles,
    mapPreference,
    setMapPreference,
    clearThumbCache,
    downloadDir,
  } = useDemoMode();

  const [hostDraft, setHostDraft] = useState(cameraHost);
  const [editingHost, setEditingHost] = useState(false);

  const downloadedBytes = useMemo(
    () => localFiles.reduce((sum, f) => sum + (f.sizeBytes > 0 ? f.sizeBytes : 0), 0),
    [localFiles],
  );

  const connectionLabel =
    cameraLinkState === "connected"
      ? "Connected"
      : cameraLinkState === "connecting"
        ? "Connecting…"
        : cameraLinkState === "unstable"
          ? "Unstable"
          : cameraLinkState === "connection_lost"
            ? "Connection lost"
            : "Not connected";

  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "0.1.0";
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    undefined;

  const saveHost = useCallback(() => {
    const trimmed = hostDraft.trim();
    if (!isPrivateIpv4(trimmed)) {
      Alert.alert("Invalid IP", "Enter a private IPv4 address such as 192.72.1.1.");
      return;
    }
    setCameraHost(trimmed);
    setEditingHost(false);
  }, [hostDraft, setCameraHost]);

  const exportDiagnostics = useCallback(async () => {
    const lines = [
      `${APP_NAME} diagnostics`,
      `version=${version}`,
      build ? `build=${build}` : undefined,
      `linkState=${cameraLinkState}`,
      `host=${cameraHost}`,
      `nativeTcp=${nativeTcpReady}`,
      `expoGo=${isExpoGo}`,
      lastConnectedAt ? `lastConnected=${lastConnectedAt}` : undefined,
      lastError ? `lastError=${sanitizeDiagnosticLine(lastError)}` : undefined,
      `localFiles=${localFiles.length}`,
      `mapPreference=${mapPreference}`,
    ].filter(Boolean) as string[];

    const body = lines.map(sanitizeDiagnosticLine).join("\n");
    Alert.alert("Sanitized diagnostics", body, [{ text: "OK" }]);
  }, [
    version,
    build,
    cameraLinkState,
    cameraHost,
    nativeTcpReady,
    isExpoGo,
    lastConnectedAt,
    lastError,
    localFiles.length,
    mapPreference,
  ]);

  const onClearCache = useCallback(() => {
    Alert.alert(
      "Clear thumbnail cache",
      "Removes cached camera thumbnails only. Downloaded recordings are kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => void clearThumbCache(),
        },
      ],
    );
  }, [clearThumbCache]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: Math.max(insets.bottom, 24) + 72,
      }}
    >
      <Section title="Camera">
        <SettingsRow
          icon="wifi"
          title="Connection status"
          value={connectionLabel}
          accessibilityLabel={`Connection status ${connectionLabel}`}
        />
        {cameraModel ? (
          <SettingsRow icon="videocam-outline" title="Camera model" value={cameraModel} />
        ) : null}
        <SettingsRow
          icon="globe-outline"
          title="Camera IP"
          value={editingHost ? undefined : cameraHost}
          description={editingHost ? undefined : "Private Wi‑Fi address of the camera"}
          onPress={() => {
            setHostDraft(cameraHost);
            setEditingHost(true);
          }}
          accessibilityLabel="Edit camera IP"
        />
        {editingHost ? (
          <View style={styles.hostEdit}>
            <TextInput
              value={hostDraft}
              onChangeText={setHostDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={[styles.hostInput, { color: colors.text, borderColor: colors.border }]}
              accessibilityLabel="Camera IP address"
            />
            <View style={styles.hostActions}>
              <Pressable onPress={() => setEditingHost(false)} hitSlop={8}>
                <Text style={{ color: colors.textMuted, fontFamily: Type.fontSemi }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveHost} hitSlop={8}>
                <Text style={{ color: colors.brand, fontFamily: Type.fontSemi }}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {lastConnectedAt ? (
          <SettingsRow
            icon="time-outline"
            title="Last successful connection"
            value={new Date(lastConnectedAt).toLocaleString()}
          />
        ) : null}
        {/* Firmware / SD / Wi‑Fi rows omitted unless present in read-only properties */}
        {cameraProperties["Camera.Menu.VideoRes"] ? (
          <SettingsRow
            icon="film-outline"
            title="Video resolution"
            value={cameraProperties["Camera.Menu.VideoRes"]}
          />
        ) : null}
        <SettingsRow
          icon="refresh"
          title="Refresh camera information"
          description={isRefreshingCamera ? "Refreshing…" : "Read-only status and library metadata"}
          onPress={() => void refreshFiles()}
          accessibilityLabel="Refresh camera information"
        />
        <SettingsRow
          icon="checkmark-circle-outline"
          title="Compatibility"
          description="Confirmed read-only with Mio MiVue 866. Independent app — not affiliated with Mio or MiTAC."
        />
      </Section>

      <Section title="App">
        <SettingsRow
          icon="folder-outline"
          title="Downloaded recordings"
          value={`${localFiles.length} · ${formatMediaSizeMbGb(downloadedBytes)}`}
        />
        <SettingsRow
          icon="map-outline"
          title="Map preference"
          value={mapPreference === "online" ? "Online map" : "Local schematic"}
          onPress={() => {
            const next: MapPreference = mapPreference === "online" ? "schematic" : "online";
            setMapPreference(next);
          }}
          accessibilityLabel="Toggle map preference"
        />
        <SettingsRow
          icon="trash-outline"
          title="Clear thumbnail cache"
          description="Does not delete downloaded recordings"
          onPress={onClearCache}
          destructive
        />
        <SettingsRow
          icon="information-circle-outline"
          title="App version"
          value={build ? `${version} (${build})` : version}
        />
      </Section>

      <Section title="Privacy & data">
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Local-first"
          description="Recordings and queue state stay on this device. Laneory does not upload your media to a cloud account."
        />
        <SettingsRow
          icon="map-outline"
          title="Online map privacy"
          description="Online map loads OpenStreetMap tiles only when you choose Online map. Local schematic stays offline."
        />
        <SettingsRow
          icon="wifi-outline"
          title="Camera Wi‑Fi"
          description="Join the camera’s Wi‑Fi network to browse and download. Communication is GET/HEAD read-only."
        />
        <SettingsRow
          icon="document-text-outline"
          title="Privacy Policy"
          description="Store listing draft — full policy URL at release."
        />
      </Section>

      <Section title="Diagnostics">
        <SettingsRow
          icon="pulse-outline"
          title="Connectivity test"
          description="Runs the same read-only status and file list refresh"
          onPress={() => void refreshFiles()}
        />
        <SettingsRow
          icon="alert-circle-outline"
          title="Last request status"
          value={lastError ? "Error" : cameraLinkState === "connected" ? "OK" : "—"}
          description={lastError ? sanitizeDiagnosticLine(lastError) : undefined}
        />
        <SettingsRow
          icon="hardware-chip-outline"
          title="Transport"
          value={nativeTcpReady ? "Native TCP" : isExpoGo ? "Expo Go" : "Fallback"}
        />
        <SettingsRow
          icon="share-outline"
          title="Export sanitized diagnostics"
          onPress={() => void exportDiagnostics()}
        />
        <SettingsRow
          icon="folder-open-outline"
          title="Download folder"
          description="Managed app storage (path not shown)"
          value={downloadDir ? "On device" : "Unavailable"}
        />
      </Section>

      <Section title="About">
        <SettingsRow icon="ribbon-outline" title={APP_NAME} description={APP_SUBTITLE} value={version} />
        <SettingsRow icon="book-outline" title="About" description={APP_SHORT_DESCRIPTION} />
        <SettingsRow icon="warning-outline" title="Disclaimer" description={DISCLAIMER_EN} />
        <SettingsRow
          icon="code-slash-outline"
          title="Open-source licences"
          description="Third-party notices ship with the release build."
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  hostEdit: { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  hostInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Type.mono,
  },
  hostActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, minHeight: 44, alignItems: "center" },
});
