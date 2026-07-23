import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CameraUpdateInfoSheet } from "@/components/settings/CameraUpdateInfoSheet";
import {
  CAMERA_SETTING_ICONS,
  CAMERA_SETTING_TITLE,
  CAMERA_SETTINGS_KEYS,
  cameraClockDisplay,
  cameraSettingOptions,
  displayCameraSettingValue,
  rawCameraSettingValue,
} from "@/components/settings/cameraSettingsUi";
import {
  CAMERA_UPDATE_INFO_TITLE,
  resolveCameraSoftwareFields,
  type CameraUpdateInfoKind,
} from "@/components/settings/cameraSoftwareInfo";
import { readOsWifiSsid } from "@/components/settings/readOsWifiSsid";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import {
  SettingsActionRow,
  SettingsSection,
  SettingsStatusBadge,
  SettingsValueRow,
  connectionHubKind,
  connectionStatusLabel,
  formatLastConnected,
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
    disconnectSession,
  } = useDemoMode();
  const { state: onboardingState, startChangeCamera } = useOnboarding();
  const [refreshPending, setRefreshPending] = useState(false);
  const [ipSheetOpen, setIpSheetOpen] = useState(false);
  const [activeSetting, setActiveSetting] = useState<CameraSettingKey | null>(null);
  const [updateInfoKind, setUpdateInfoKind] = useState<CameraUpdateInfoKind | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string | undefined>(undefined);
  const [wifiSsidStatus, setWifiSsidStatus] = useState<
    "available" | "unavailable" | "permission_denied" | "unsupported" | undefined
  >(undefined);
  const [lastConfirmedSoftware, setLastConfirmedSoftware] = useState<
    Partial<Record<"firmware" | "safetyCameraData" | "voicePackage", string>>
  >({});
  const [softwareRequestError, setSoftwareRequestError] = useState(false);
  const [toast, setToast] = useState<ToastState | undefined>();
  const pendingToastRef = useRef<ToastState | undefined>(undefined);

  const selectedProfile = getCameraProfile(onboardingState.selectedCameraProfileId);
  const cameraConfigured =
    Boolean(onboardingState.selectedCameraProfileId) || onboardingState.cameraSetupCompleted;
  const statusLabel = connectionStatusLabel(cameraLinkState);
  const kind = connectionHubKind(cameraLinkState);
  const modelName = selectedProfile?.displayName ?? cameraModel;
  const modelRowValue = modelName?.trim()
    ? modelName
    : cameraConfigured
      ? "—"
      : "No camera configured";
  const lastConnectedValue = formatLastConnected(lastConnectedAt);
  const connected = cameraLinkState === "connected" && !demoMode;
  const clockValue = cameraClockDisplay(cameraProperties);
  const statusA11yLabel = [
    `Camera ${modelRowValue}`,
    statusLabel,
    `Last connected ${lastConnectedValue}`,
    `Camera clock ${clockValue}`,
  ].join(". ");
  const softwareLoading = refreshPending || isRefreshingCamera;
  const softwareFields = useMemo(
    () =>
      resolveCameraSoftwareFields({
        connected: connected || demoMode,
        demoMode,
        loading: softwareLoading && !demoMode,
        properties: cameraProperties,
        wifiSsid,
        wifiSsidStatus,
        requestError: softwareRequestError && !demoMode,
        lastConfirmed: lastConfirmedSoftware,
      }),
    [
      cameraProperties,
      connected,
      demoMode,
      lastConfirmedSoftware,
      softwareLoading,
      softwareRequestError,
      wifiSsid,
      wifiSsidStatus,
    ],
  );

  const sheetOptions = useMemo(
    () => (activeSetting ? cameraSettingOptions(activeSetting) : []),
    [activeSetting],
  );
  const sheetCurrent = activeSetting
    ? rawCameraSettingValue(cameraProperties, activeSetting)
    : undefined;

  const refreshWifiSsid = useCallback(async () => {
    const result = await readOsWifiSsid();
    setWifiSsid(result.ssid);
    setWifiSsidStatus(result.status);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readOsWifiSsid().then((result) => {
      if (cancelled) return;
      setWifiSsid(result.ssid);
      setWifiSsidStatus(result.status);
    });
    return () => {
      cancelled = true;
    };
  }, [cameraLinkState, refreshPending]);

  useEffect(() => {
    if (demoMode) {
      setLastConfirmedSoftware((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setSoftwareRequestError((prev) => (prev ? false : prev));
      return;
    }
    const next: Partial<Record<"firmware" | "safetyCameraData" | "voicePackage", string>> = {};
    for (const key of ["firmware", "safetyCameraData", "voicePackage"] as const) {
      const field = softwareFields[key];
      if (field.state === "available" && field.raw) next[key] = field.raw;
    }
    if (Object.keys(next).length === 0) return;
    setLastConfirmedSoftware((prev) => {
      let changed = false;
      const merged = { ...prev };
      for (const key of Object.keys(next) as Array<keyof typeof next>) {
        const value = next[key];
        if (value !== undefined && prev[key] !== value) {
          merged[key] = value;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, [demoMode, softwareFields]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        pendingToastRef.current = undefined;
        setToast(undefined);
        setActiveSetting(null);
        setUpdateInfoKind(null);
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (ipSheetOpen || activeSetting || updateInfoKind) return undefined;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, [ipSheetOpen, activeSetting, updateInfoKind]),
  );

  const onRefresh = useCallback(async () => {
    if (refreshPending || isRefreshingCamera || isApplyingCameraSetting) return;
    setRefreshPending(true);
    setSoftwareRequestError(false);
    try {
      await refreshWifiSsid();
      const result = await refreshCameraInformation();
      if (!result.ok) {
        setSoftwareRequestError(true);
        if (result.error) {
          setToast({ message: result.error, tone: "danger" });
        }
        return;
      }
      setSoftwareRequestError(false);
    } finally {
      setRefreshPending(false);
    }
  }, [
    isRefreshingCamera,
    isApplyingCameraSetting,
    refreshCameraInformation,
    refreshPending,
    refreshWifiSsid,
  ]);

  const onChangeCamera = useCallback(() => {
    Alert.alert(
      "Change camera",
      "Local downloads and the download queue are kept. You will pick a camera profile again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: () => {
            disconnectSession();
            setLastConfirmedSoftware({});
            setSoftwareRequestError(false);
            setWifiSsid(undefined);
            setWifiSsidStatus(undefined);
            void startChangeCamera().then(() => {
              router.push("/onboarding/select-camera" as Parameters<typeof router.push>[0]);
            });
          },
        },
      ],
    );
  }, [disconnectSession, startChangeCamera]);

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
          <View
            style={styles.statusCard}
            accessibilityRole="summary"
            accessibilityLabel={statusA11yLabel}
          >
            <View style={styles.statusMain}>
              <View
                style={[styles.statusIconWrap, { backgroundColor: colors.brandSoft }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="videocam" size={18} color={colors.brand} />
              </View>
              <View style={styles.statusTextCol}>
                <Text
                  style={[styles.statusModel, { color: colors.text }]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.35}
                >
                  {modelRowValue}
                </Text>
                <Text
                  style={[styles.statusLastConnected, { color: colors.textMuted }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {`Last connected · ${lastConnectedValue}`}
                </Text>
              </View>
              <View style={styles.statusBadgeWrap}>
                <SettingsStatusBadge kind={kind} label={statusLabel} />
              </View>
            </View>
            <View
              style={[
                styles.clockStrip,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderTopColor: colors.borderSoft,
                },
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Camera clock ${clockValue}`}
            >
              <Ionicons name="alarm-outline" size={16} color={colors.textMuted} />
              <Text
                style={[styles.clockLabel, { color: colors.textMuted }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                Camera clock
              </Text>
              <Text
                style={[styles.clockValue, { color: colors.text }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {clockValue}
              </Text>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Camera information" style={styles.section}>
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
            icon="wifi-outline"
            title="Camera Wi‑Fi"
            value={softwareFields.cameraWifi.display}
            compact
            accessibilityLabel="Camera Wi‑Fi"
            accessibilityHint={softwareFields.cameraWifi.accessibilityHint}
          />
          <SettingsValueRow
            icon="hardware-chip-outline"
            title="Firmware"
            value={softwareFields.firmware.display}
            compact
            accessibilityLabel="Firmware"
            accessibilityHint={softwareFields.firmware.accessibilityHint}
          />
          <SettingsValueRow
            icon="shield-checkmark-outline"
            title="Safety camera data"
            value={softwareFields.safetyCameraData.display}
            compact
            accessibilityLabel="Safety camera data"
            accessibilityHint={softwareFields.safetyCameraData.accessibilityHint}
          />
          <SettingsValueRow
            icon="mic-outline"
            title="Voice package"
            value={softwareFields.voicePackage.display}
            compact
            accessibilityLabel="Voice package"
            accessibilityHint={softwareFields.voicePackage.accessibilityHint}
          />
          {cameraProperties["Camera.Menu.VideoRes"] ? (
            <SettingsValueRow
              icon="film-outline"
              title="Video resolution"
              value={cameraProperties["Camera.Menu.VideoRes"]}
              compact
            />
          ) : null}
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

        <SettingsSection title="Camera updates" style={styles.section}>
          <SettingsActionRow
            icon="hardware-chip-outline"
            title={CAMERA_UPDATE_INFO_TITLE.firmware}
            compact
            onPress={() => setUpdateInfoKind("firmware")}
            accessibilityLabel={CAMERA_UPDATE_INFO_TITLE.firmware}
          />
          <SettingsActionRow
            icon="shield-checkmark-outline"
            title={CAMERA_UPDATE_INFO_TITLE.safety}
            compact
            onPress={() => setUpdateInfoKind("safety")}
            accessibilityLabel={CAMERA_UPDATE_INFO_TITLE.safety}
          />
          <SettingsActionRow
            icon="mic-outline"
            title={CAMERA_UPDATE_INFO_TITLE.voice}
            compact
            onPress={() => setUpdateInfoKind("voice")}
            accessibilityLabel={CAMERA_UPDATE_INFO_TITLE.voice}
          />
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

      <CameraUpdateInfoSheet
        kind={updateInfoKind}
        onClose={() => setUpdateInfoKind(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { marginBottom: 10 },
  sectionLast: { marginBottom: 0 },
  statusCard: {
    overflow: "hidden",
  },
  statusMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusTextCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  statusModel: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: Type.fontSemi,
  },
  statusLastConnected: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Type.font,
  },
  statusBadgeWrap: {
    flexShrink: 0,
    alignSelf: "center",
  },
  clockStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
  },
  clockLabel: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Type.font,
  },
  clockValue: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Type.mono,
    fontVariant: ["tabular-nums"],
  },
  placeholder: { paddingHorizontal: 14, paddingVertical: 14, gap: 6 },
  placeholderTitle: { fontFamily: Type.fontSemi, fontSize: 15 },
  placeholderBody: { fontFamily: Type.font, fontSize: 13, lineHeight: 18 },
});
