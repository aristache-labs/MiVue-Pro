import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CAMERA_PROFILES,
  canStartConnection,
  compatibilityBadgeLabel,
} from "@/components/onboarding";
import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import { OnboardingScreen, StatusBadge } from "@/components/onboarding/OnboardingUi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { PrimaryButton } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import { isPrivateIpv4 } from "@/packages/camera-transport/src/index";

/** Only verified profiles plus experimental with real manual IP path. */
const VISIBLE_PROFILES = CAMERA_PROFILES.filter(
  (p) => p.compatibility === "verified" || p.id === "other-compatible",
);

export default function OnboardingSelectCameraScreen() {
  const { colors, radius } = useAppTheme();
  const { chooseProfile, setStep, state } = useOnboarding();
  const { setCameraHost } = useDemoMode();
  const [selectedId, setSelectedId] = useState(
    state.selectedCameraProfileId ?? VISIBLE_PROFILES[0]?.id,
  );
  const [otherHost, setOtherHost] = useState("");
  const fromSettings = state.cameraSetupCompleted === false && state.onboardingCompleted;

  const selected = VISIBLE_PROFILES.find((p) => p.id === selectedId);

  const onContinue = () => {
    if (!selected || !canStartConnection(selected)) return;
    if (selected.id === "other-compatible") {
      const host = otherHost.trim();
      if (!isPrivateIpv4(host)) {
        Alert.alert("Invalid IP", "Enter a private IPv4 address such as 192.72.1.1.");
        return;
      }
      setCameraHost(host);
    } else if (selected.defaultHost) {
      setCameraHost(selected.defaultHost);
    }
    void chooseProfile(selected.id).then(() => {
      router.replace("/onboarding/connect" as Parameters<typeof router.replace>[0]);
    });
  };

  return (
    <OnboardingScreen
      title="Select camera"
      subtitle="Choose a verified camera profile."
      onBack={() => {
        if (fromSettings) {
          router.back();
          return;
        }
        void setStep("cameraSetup").then(() => {
          router.replace("/onboarding/add-camera" as Parameters<typeof router.replace>[0]);
        });
      }}
      backLabel={fromSettings ? "Cancel" : "Back"}
    >
      {VISIBLE_PROFILES.map((profile) => {
        const enabled = canStartConnection(profile);
        const active = selectedId === profile.id;
        const badge = compatibilityBadgeLabel(profile.compatibility);
        return (
          <Pressable
            key={profile.id}
            disabled={!enabled}
            onPress={() => setSelectedId(profile.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled: !enabled }}
            accessibilityLabel={`${profile.displayName}, ${badge}`}
            style={[
              styles.row,
              {
                borderColor: active ? colors.brand : colors.border,
                backgroundColor: colors.surface,
                borderRadius: OnboardingLayout.cardRadius,
                opacity: enabled ? 1 : 0.45,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.brandSoft }]}>
              <Ionicons name="videocam" size={22} color={colors.brand} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {profile.displayName}
              </Text>
              <View style={styles.metaRow}>
                <StatusBadge
                  label={badge}
                  tone={profile.compatibility === "verified" ? "brand" : "warn"}
                />
                <Text style={[styles.method, { color: colors.textMuted }]}>Camera Wi-Fi</Text>
              </View>
              {profile.compatibility === "experimental" ? (
                <Text style={[styles.expHint, { color: colors.textMuted }]}>
                  Manual IP setup. Compatibility is not fully verified.
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.radio,
                {
                  borderColor: active ? colors.brand : colors.border,
                  backgroundColor: active ? colors.brand : "transparent",
                },
              ]}
            >
              {active ? <View style={[styles.radioDot, { backgroundColor: colors.onBrand }]} /> : null}
            </View>
          </Pressable>
        );
      })}

      {selected?.id === "other-compatible" ? (
        <View
          style={[
            styles.hostBox,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={[styles.hostLabel, { color: colors.textMuted }]}>Camera IP</Text>
          <TextInput
            value={otherHost}
            onChangeText={setOtherHost}
            placeholder="192.72.1.1"
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Camera IP address"
            style={[styles.hostInput, { color: colors.text, borderColor: colors.border }]}
          />
        </View>
      ) : null}

      <PrimaryButton
        label="Continue"
        onPress={onContinue}
        disabled={!selected || !canStartConnection(selected)}
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: OnboardingLayout.selectRowMinHeight,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 15, fontFamily: Type.fontSemi },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  method: { fontSize: 12, fontFamily: Type.font },
  expHint: { fontSize: 12, lineHeight: 16, fontFamily: Type.font },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  hostBox: { borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8 },
  hostLabel: { fontSize: 12, fontFamily: Type.fontSemi },
  hostInput: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: Type.mono,
    fontSize: 15,
  },
});
