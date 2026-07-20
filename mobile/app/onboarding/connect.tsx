import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  APP_STATE_VERIFY_DEBOUNCE_MS,
  getCameraProfile,
  scheduleOneShotVerify,
  shouldRunAppStateVerify,
  verifyCameraConnection,
} from "@/components/onboarding";
import { userFacingConnectionError } from "@/components/onboarding/connectionErrors";
import { createOnboardingTransport } from "@/components/onboarding/createOnboardingTransport";
import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import {
  InlineMessage,
  OnboardingCard,
  OnboardingScreen,
} from "@/components/onboarding/OnboardingUi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import type { VerifyUiState } from "@/components/onboarding";
import { PrimaryButton } from "@/components/ui";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";

const STEPS: readonly {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}[] = [
  {
    icon: "wifi-outline",
    title: "Enable camera Wi-Fi",
    body: "Turn on Wi-Fi / app connection mode on the camera.",
  },
  {
    icon: "phone-portrait-outline",
    title: "Join the camera network",
    body: "In phone Wi-Fi settings, select the network shown on the camera.",
  },
  {
    icon: "return-down-back-outline",
    title: "Return to Laneory",
    body: "Come back here and verify the connection.",
  },
];

function canOpenWifiSettings(): boolean {
  return Platform.OS === "android";
}

async function openWifiSettings(): Promise<void> {
  if (Platform.OS === "android") {
    try {
      await Linking.sendIntent("android.settings.WIFI_SETTINGS");
    } catch {
      // ignore
    }
  }
}

export default function OnboardingConnectScreen() {
  const { colors } = useAppTheme();
  const isFocused = useIsFocused();
  const {
    state,
    setStep,
    seePrePrompt,
    beginConnecting,
    backToGuide,
    showSuccess,
    skipCamera,
  } = useOnboarding();
  const { cameraHost } = useDemoMode();
  const profile = getCameraProfile(state.selectedCameraProfileId);

  const [verifyState, setVerifyState] = useState<VerifyUiState>("idle");
  const [errorState, setErrorState] = useState<VerifyUiState | undefined>();
  const [rawError, setRawError] = useState<string | undefined>();
  const [showPrePrompt, setShowPrePrompt] = useState(!state.localNetworkPrePromptSeen);
  const abortRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);
  const autoVerifyOnceRef = useRef(false);

  const checking = verifyState === "checking";

  const cancelInFlight = useCallback(() => {
    requestTokenRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    if (!isFocused) {
      cancelInFlight();
      if (verifyState === "checking") {
        setVerifyState("idle");
        void backToGuide();
      }
    }
  }, [isFocused, verifyState, cancelInFlight, backToGuide]);

  useEffect(() => {
    return () => {
      cancelInFlight();
    };
  }, [cancelInFlight]);

  const runVerify = useCallback(
    async (opts?: { fromAppState?: boolean }) => {
      if (!profile || !isFocused) return;
      if (checking) return;

      if (!state.localNetworkPrePromptSeen && !opts?.fromAppState) {
        setShowPrePrompt(true);
        return;
      }

      setShowPrePrompt(false);
      setErrorState(undefined);
      setRawError(undefined);
      setVerifyState("checking");
      await beginConnecting();

      cancelInFlight();
      const token = requestTokenRef.current;
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const result = await verifyCameraConnection({
          host: cameraHost,
          profile,
          signal: ac.signal,
          deps: { createTransport: createOnboardingTransport, timeoutMs: 12_000 },
        });

        if (token !== requestTokenRef.current || !isFocused || ac.signal.aborted) {
          return;
        }

        if (!result.ok) {
          setVerifyState(result.state);
          setErrorState(result.state);
          setRawError(result.error);
          await backToGuide();
          return;
        }

        if (result.needsModelConfirm) {
          setVerifyState("needsModelConfirm");
          Alert.alert(
            "Confirm camera",
            `Laneory reached a device at ${result.host}, but could not confirm it matches ${profile.displayName}. Continue anyway?`,
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  setVerifyState("idle");
                  void backToGuide();
                },
              },
              {
                text: "Continue",
                onPress: () => {
                  void showSuccess().then(() => {
                    router.replace("/onboarding/success" as Parameters<typeof router.replace>[0]);
                  });
                },
              },
            ],
          );
          return;
        }

        setVerifyState("connected");
        await showSuccess();
        if (token === requestTokenRef.current) {
          router.replace("/onboarding/success" as Parameters<typeof router.replace>[0]);
        }
      } catch {
        if (token === requestTokenRef.current) {
          setVerifyState("cameraUnreachable");
          setErrorState("cameraUnreachable");
          await backToGuide();
        }
      }
    },
    [
      profile,
      isFocused,
      checking,
      state.localNetworkPrePromptSeen,
      cameraHost,
      beginConnecting,
      backToGuide,
      showSuccess,
      cancelInFlight,
    ],
  );

  useEffect(() => {
    let cancelScheduled: (() => void) | undefined;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      if (!isFocused) return;
      if (autoVerifyOnceRef.current) return;
      if (
        !shouldRunAppStateVerify({
          enabled: !showPrePrompt && !!profile,
          verifyState,
          inflight: checking,
        })
      ) {
        return;
      }
      cancelScheduled?.();
      cancelScheduled = scheduleOneShotVerify(() => {
        if (!isFocused || autoVerifyOnceRef.current) return;
        autoVerifyOnceRef.current = true;
        void runVerify({ fromAppState: true });
      }, APP_STATE_VERIFY_DEBOUNCE_MS);
    });
    return () => {
      cancelScheduled?.();
      sub.remove();
    };
  }, [showPrePrompt, profile, verifyState, checking, runVerify, isFocused]);

  const onPrePromptContinue = async () => {
    await seePrePrompt();
    setShowPrePrompt(false);
    void runVerify();
  };

  const openHelp = () => {
    cancelInFlight();
    if (checking) {
      setVerifyState("idle");
      void backToGuide();
    }
    router.push("/connection-help" as Parameters<typeof router.push>[0]);
  };

  if (!profile) {
    return (
      <OnboardingScreen
        title="Connect camera"
        onBack={() => {
          void setStep("selectCamera").then(() => {
            router.replace("/onboarding/select-camera" as Parameters<typeof router.replace>[0]);
          });
        }}
      >
        <Text style={{ color: colors.textMuted, fontFamily: Type.font, fontSize: 14 }}>
          Select a camera first.
        </Text>
      </OnboardingScreen>
    );
  }

  if (showPrePrompt) {
    return (
      <OnboardingScreen
        title="Local network"
        subtitle="Laneory needs local network access to reach your dashcam."
        onBack={() => {
          void setStep("selectCamera").then(() => {
            router.replace("/onboarding/select-camera" as Parameters<typeof router.replace>[0]);
          });
        }}
      >
        <OnboardingCard style={{ alignItems: "center" }}>
          <View style={[styles.preIcon, { backgroundColor: colors.brandSoft }]}>
            <Ionicons name="wifi" size={28} color={colors.brand} />
          </View>
          <Text style={[styles.preTitle, { color: colors.text }]}>Allow camera connection</Text>
          <Text style={[styles.preBody, { color: colors.textMuted }]}>
            Laneory needs access to your local network to communicate directly with your dashcam.
            Video and GPS data are not uploaded by this connection.
          </Text>
        </OnboardingCard>
        <PrimaryButton label="Continue" onPress={() => void onPrePromptContinue()} />
      </OnboardingScreen>
    );
  }

  const facing =
    errorState &&
    errorState !== "idle" &&
    errorState !== "waitingForWifi" &&
    errorState !== "checking" &&
    errorState !== "connected" &&
    errorState !== "needsModelConfirm"
      ? userFacingConnectionError(errorState, rawError)
      : undefined;

  return (
    <OnboardingScreen
      title="Connect camera"
      subtitle="Join the camera Wi-Fi, then return to Laneory."
      onBack={() => {
        cancelInFlight();
        setVerifyState("idle");
        void setStep("selectCamera").then(() => {
          router.replace("/onboarding/select-camera" as Parameters<typeof router.replace>[0]);
        });
      }}
    >
      {STEPS.map((step) => (
        <OnboardingCard key={step.title} style={styles.stepCard}>
          <View style={[styles.stepIcon, { backgroundColor: colors.brandSoft }]}>
            <Ionicons name={step.icon} size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
            <Text style={[styles.stepBody, { color: colors.textMuted }]}>{step.body}</Text>
          </View>
        </OnboardingCard>
      ))}

      <View style={[styles.pill, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.pillText, { color: colors.textMuted }]}>
          No internet on the camera network is normal.
        </Text>
      </View>

      {Platform.OS === "ios" ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Open Settings → Wi-Fi, join the camera network, then return here.
        </Text>
      ) : null}

      {facing ? (
        <InlineMessage
          title={facing.title}
          message={facing.message}
          tone={facing.tone}
          technical={facing.technical}
          onOpenSettings={
            errorState === "permissionDenied" ? () => void Linking.openSettings() : undefined
          }
        />
      ) : null}

      {canOpenWifiSettings() ? (
        <PrimaryButton
          label="Open Wi-Fi settings"
          variant="outline"
          onPress={() => void openWifiSettings()}
          disabled={checking}
        />
      ) : null}

      <PrimaryButton
        label={checking ? "Checking camera…" : facing ? "Try again" : "Verify connection"}
        onPress={() => void runVerify()}
        loading={checking}
        disabled={checking}
      />
      <PrimaryButton label="Connection help" variant="outline" onPress={openHelp} />
      <Pressable
        onPress={() => {
          cancelInFlight();
          void skipCamera().then(() => {
            router.replace("/(tabs)" as Parameters<typeof router.replace>[0]);
          });
        }}
        disabled={checking}
        accessibilityRole="button"
        accessibilityLabel="Cancel setup"
        hitSlop={HitSlop44}
        style={styles.cancel}
      >
        <Text style={{ color: colors.textMuted, fontFamily: Type.fontSemi }}>Cancel setup</Text>
      </Pressable>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  stepCard: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { fontSize: 14, fontFamily: Type.fontSemi },
  stepBody: { fontSize: 13, lineHeight: 18, fontFamily: Type.font },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { flex: 1, fontSize: 12, lineHeight: 16, fontFamily: Type.font },
  hint: { fontSize: 13, lineHeight: 18, fontFamily: Type.font },
  preIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  preTitle: { fontSize: 17, fontFamily: Type.fontBold, textAlign: "center" },
  preBody: { fontSize: 14, lineHeight: 20, fontFamily: Type.font, textAlign: "center" },
  cancel: { minHeight: OnboardingLayout.minimumTouchTarget, alignItems: "center", justifyContent: "center" },
});
