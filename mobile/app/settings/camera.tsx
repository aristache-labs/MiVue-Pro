import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getCameraProfile } from "@/components/onboarding";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import {
  SettingsActionRow,
  SettingsSection,
  SettingsStatusBadge,
  SettingsValueRow,
  connectionHubKind,
  connectionStatusLabel,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import { isPrivateIpv4 } from "@/packages/camera-transport/src/index";

export default function SettingsCameraScreen() {
  const { colors } = useAppTheme();
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
  const { state: onboardingState, startChangeCamera, reopenCameraSetup } = useOnboarding();

  const selectedProfile = getCameraProfile(onboardingState.selectedCameraProfileId);
  const [hostDraft, setHostDraft] = useState(cameraHost);
  const [editingHost, setEditingHost] = useState(false);

  useEffect(() => {
    if (!editingHost) setHostDraft(cameraHost);
  }, [cameraHost, editingHost]);

  const statusLabel = connectionStatusLabel(cameraLinkState);
  const kind = connectionHubKind(cameraLinkState);
  const modelLabel = selectedProfile?.displayName ?? cameraModel ?? "—";

  const saveHost = useCallback(() => {
    const trimmed = hostDraft.trim();
    if (!isPrivateIpv4(trimmed)) {
      Alert.alert("Invalid IP", "Enter a private IPv4 address such as 192.72.1.1.");
      return;
    }
    setCameraHost(trimmed);
    setEditingHost(false);
  }, [hostDraft, setCameraHost]);

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

  return (
    <SettingsScroll>
      <SettingsSection title="Status">
        <View style={styles.statusBlock}>
          <SettingsStatusBadge kind={kind} label={statusLabel} />
          <Text style={[styles.statusMeta, { color: colors.text }]} numberOfLines={1}>
            {modelLabel}
          </Text>
          <Text style={[styles.statusMetaMuted, { color: colors.textMuted }]} numberOfLines={1}>
            {cameraHost}
          </Text>
          {lastConnectedAt ? (
            <Text style={[styles.statusMetaMuted, { color: colors.textMuted }]} numberOfLines={2}>
              Last success · {new Date(lastConnectedAt).toLocaleString()}
            </Text>
          ) : null}
        </View>
      </SettingsSection>

      <SettingsSection title="Camera information">
        <SettingsValueRow icon="wifi" title="Connection status" value={statusLabel} />
        <SettingsValueRow icon="videocam-outline" title="Camera model" value={modelLabel} />
        <SettingsActionRow
          icon="globe-outline"
          title="Camera IP"
          value={editingHost ? undefined : cameraHost}
          subtitle={editingHost ? undefined : "Private Wi‑Fi address of the camera"}
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
        <SettingsValueRow
          icon="time-outline"
          title="Last successful connection"
          value={lastConnectedAt ? new Date(lastConnectedAt).toLocaleString() : "—"}
        />
        {cameraProperties["Camera.Menu.VideoRes"] ? (
          <SettingsValueRow
            icon="film-outline"
            title="Video resolution"
            value={cameraProperties["Camera.Menu.VideoRes"]}
          />
        ) : null}
        <SettingsValueRow
          icon="checkmark-circle-outline"
          title="Compatibility"
          subtitle="Confirmed read-only with Mio MiVue 866. Independent app — not affiliated with Mio or MiTAC."
        />
      </SettingsSection>

      <SettingsSection title="Actions">
        <SettingsActionRow
          icon="refresh"
          title="Refresh camera information"
          subtitle="Read-only status and library metadata"
          loading={isRefreshingCamera}
          disabled={isRefreshingCamera}
          onPress={() => void refreshFiles()}
          accessibilityLabel="Refresh camera information"
        />
        <SettingsActionRow
          icon="sync-outline"
          title="Reconnect camera"
          subtitle="Read-only status and library refresh"
          loading={isRefreshingCamera}
          disabled={isRefreshingCamera}
          onPress={() => void refreshFiles()}
          accessibilityLabel="Reconnect camera"
        />
        <SettingsActionRow
          icon="swap-horizontal-outline"
          title="Change camera"
          subtitle="Does not delete local recordings or clear the queue"
          onPress={onChangeCamera}
        />
        <SettingsActionRow
          icon="construct-outline"
          title="Run camera setup"
          subtitle="Reopen Wi‑Fi connection guide"
          onPress={() => {
            void reopenCameraSetup().then(() => {
              router.push("/onboarding" as Parameters<typeof router.push>[0]);
            });
          }}
        />
        <SettingsActionRow
          icon="help-circle-outline"
          title="Connection help"
          onPress={() => router.push("/connection-help" as Parameters<typeof router.push>[0])}
        />
      </SettingsSection>
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  statusBlock: { paddingHorizontal: 14, paddingVertical: 14, gap: 6 },
  statusMeta: { fontSize: 16, fontFamily: Type.fontSemi, marginTop: 4 },
  statusMetaMuted: { fontSize: 13, fontFamily: Type.font },
  hostEdit: { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  hostInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Type.mono,
  },
  hostActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    minHeight: 44,
    alignItems: "center",
  },
});
