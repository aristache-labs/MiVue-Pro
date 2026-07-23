import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenToast, type ScreenToastTone } from "@/components/feedback/ScreenToast";
import { getCameraProfile } from "@/components/onboarding";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { CameraIpSheet } from "@/components/settings/CameraIpSheet";
import { CameraSettingSheet } from "@/components/settings/CameraSettingSheet";
import {
  CAMERA_SETTING_ICONS,
  CAMERA_SETTING_TITLE,
  CAMERA_SETTINGS_KEYS,
  cameraClockDisplay,
  cameraSettingOptions,
  displayCameraSettingValue,
  rawCameraSettingValue,
} from "@/components/settings/cameraSettingsUi";
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
import {
  cameraSettingConfirmMessage,
  cameraSettingSuccessMessage,
  type CameraSettingKey,
  type CameraSettingValueMap,
} from "@/packages/protocol/src/index";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

type ToastState = { readonly message: string; readonly tone: ScreenToastTone };

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
    refreshCameraInformation,
    setCameraSetting,
    isApplyingCameraSetting,
    applyingCameraSettingKey,
    isRefreshingCamera,
    demoMode,
  } = useDemoMode();
  const { state: onboardingState, startChangeCamera } = useOnboarding();
  const [refreshPending, setRefreshPending] = useState(false);
  const [ipSheetOpen, setIpSheetOpen] = useState(false);
  const [activeSetting, setActiveSetting] = useState<CameraSettingKey | null>(null);
  const [toast, setToast] = useState<ToastState | undefined>();
  const pendingToastRef = useRef<ToastState | undefined>(undefined);

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
  const connected = cameraLinkState === "connected" && !demoMode;
  const clockValue = cameraClockDisplay(cameraProperties);

  const sheetOptions = useMemo(
    () => (activeSetting ? cameraSettingOptions(activeSetting) : []),
    [activeSetting],
  );
  const sheetCurrent = activeSetting
    ? rawCameraSettingValue(cameraProperties, activeSetting)
    : undefined;

  useFocusEffect(
    useCallback(() => {
      return () => {
        pendingToastRef.current = undefined;
        setToast(undefined);
        setActiveSetting(null);
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (ipSheetOpen || activeSetting) return undefined;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, [ipSheetOpen, activeSetting]),
  );

  const onRefresh = useCallback(async () => {
    if (refreshPending || isRefreshingCamera || isApplyingCameraSetting) return;
    setRefreshPending(true);
    try {
      const result = await refreshCameraInformation();
      if (!result.ok && result.error) {
        setToast({ message: result.error, tone: "danger" });
      }
    } finally {
      setRefreshPending(false);
    }
  }, [isRefreshingCamera, isApplyingCameraSetting, refreshCameraInformation, refreshPending]);

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

  const flushPendingToastAfterSheet = useCallback(() => {
    const pending = pendingToastRef.current;
    pendingToastRef.current = undefined;
    if (pending) setToast(pending);
  }, []);

  const requestApply = useCallback(
    (key: CameraSettingKey, nextRaw: string) => {
      const fromRaw = rawCameraSettingValue(cameraProperties, key) ?? "—";
      Alert.alert("Change camera setting?", cameraSettingConfirmMessage(key, fromRaw, nextRaw), [
        { text: "Keep current", style: "cancel" },
        {
          text: "Apply change",
          onPress: () => {
            void (async () => {
              const result = await setCameraSetting(
                key,
                nextRaw as CameraSettingValueMap[typeof key],
              );
              if (result.ok) {
                pendingToastRef.current = {
                  message: cameraSettingSuccessMessage(key, nextRaw),
                  tone: "success",
                };
                setActiveSetting(null);
                return;
              }
              Alert.alert(
                "Couldn’t apply setting",
                result.error ?? "Try again after refreshing camera information.",
              );
            })();
          },
        },
      ]);
    },
    [cameraProperties, setCameraSetting],
  );

  const actionsBusy = refreshPending || isRefreshingCamera || isApplyingCameraSetting;
  const demoBlocked = demoMode ? "Camera settings are unavailable in Demo Mode." : undefined;

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
            icon="alarm-outline"
            title="Camera clock"
            value={clockValue}
            compact
          />
          <SettingsValueRow
            icon="checkmark-circle-outline"
            title="Compatibility"
            subtitle="Confirmed with Mio MiVue 866. Laneory uses read-only requests for browsing and downloading. Camera settings change only when you explicitly select a new value and confirm Apply. Independent app — not affiliated with Mio or MiTAC."
            compact
          />
        </SettingsSection>

        <SettingsSection title="Camera settings" style={styles.section}>
          {!connected ? (
            <View style={styles.placeholder} accessibilityRole="summary">
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                Camera settings unavailable
              </Text>
              <Text style={[styles.placeholderBody, { color: colors.textMuted }]}>
                {demoMode
                  ? "Camera settings are unavailable in Demo Mode."
                  : "Connect to the camera to view and change its settings."}
              </Text>
            </View>
          ) : (
            CAMERA_SETTINGS_KEYS.map((key) => {
              const raw = rawCameraSettingValue(cameraProperties, key);
              const reported = Boolean(raw);
              const loading = applyingCameraSettingKey === key;
              return (
                <SettingsActionRow
                  key={key}
                  icon={CAMERA_SETTING_ICONS[key]}
                  title={CAMERA_SETTING_TITLE[key]}
                  value={displayCameraSettingValue(cameraProperties, key)}
                  compact
                  loading={loading}
                  disabled={!reported || isApplyingCameraSetting}
                  onPress={reported ? () => setActiveSetting(key) : undefined}
                  accessibilityLabel={CAMERA_SETTING_TITLE[key]}
                />
              );
            })
          )}
        </SettingsSection>

        <SettingsSection title="Actions" style={styles.sectionLast}>
          <SettingsActionRow
            icon="refresh"
            title="Refresh camera information"
            subtitle="Updates connection status and camera setting values without changing Library files"
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

      <ScreenToast
        message={toast?.message}
        tone={toast?.tone ?? "success"}
        testID="camera-settings-toast"
        onDismiss={() => setToast(undefined)}
      />

      <CameraIpSheet
        visible={ipSheetOpen}
        currentHost={cameraHost}
        onClose={() => setIpSheetOpen(false)}
        onSave={(host) => {
          setCameraHost(host);
          setIpSheetOpen(false);
        }}
      />

      <CameraSettingSheet
        visible={activeSetting !== null}
        title={activeSetting ? CAMERA_SETTING_TITLE[activeSetting] : ""}
        description={
          activeSetting === "dateTimeMode"
            ? "Chooses the camera’s date/time source. Manual does not sync the clock from this phone."
            : undefined
        }
        currentValue={sheetCurrent}
        options={sheetOptions}
        applying={isApplyingCameraSetting}
        applyDisabledReason={
          demoBlocked ??
          (cameraLinkState !== "connected" ? "Camera disconnected." : undefined)
        }
        onClose={() => {
          if (!isApplyingCameraSetting) setActiveSetting(null);
        }}
        onClosed={flushPendingToastAfterSheet}
        onApply={(value) => {
          if (activeSetting) requestApply(activeSetting, value);
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
  placeholder: { paddingHorizontal: 14, paddingVertical: 14, gap: 6 },
  placeholderTitle: { fontFamily: Type.fontSemi, fontSize: 15 },
  placeholderBody: { fontFamily: Type.font, fontSize: 13, lineHeight: 18 },
});
