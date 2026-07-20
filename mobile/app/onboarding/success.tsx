import Ionicons from "@expo/vector-icons/Ionicons";
import { CommonActions } from "@react-navigation/native";
import { router, useNavigation } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getCameraProfile } from "@/components/onboarding";
import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import {
  OnboardingCard,
  OnboardingScreen,
  StatusBadge,
} from "@/components/onboarding/OnboardingUi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { PrimaryButton } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";

export default function OnboardingSuccessScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const { state, finishToLibrary } = useOnboarding();
  const { cameraHost, refreshFiles, cameraModel } = useDemoMode();
  const profile = getCameraProfile(state.selectedCameraProfileId);
  const [busy, setBusy] = useState(false);

  const modelLabel = cameraModel ?? profile?.displayName ?? "Camera";
  const verified = profile?.compatibility === "verified";

  const goToTabs = async (href: "/(tabs)" | "/(tabs)/settings") => {
    if (busy) return;
    setBusy(true);
    try {
      await finishToLibrary();
      // Same live probe for Library and Settings — otherwise Camera details
      // lands with cameraLinkState still "disconnected".
      await refreshFiles();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "(tabs)" }],
        }),
      );
      if (href === "/(tabs)/settings") {
        router.navigate("/(tabs)/settings" as Parameters<typeof router.navigate>[0]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingScreen title="Camera connected" subtitle="Ready to browse recordings">
      <OnboardingCard style={styles.card}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: colors.brandSoft }]}>
            <Ionicons name="checkmark" size={22} color={colors.brand} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.model, { color: colors.text }]} numberOfLines={1}>
              {modelLabel}
            </Text>
            {verified ? <StatusBadge label="Verified" tone="brand" /> : null}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MetaRow label="Connection" value="Camera Wi-Fi" />
        <MetaRow label="Camera IP" value={cameraHost} />
        <MetaRow label="Privacy" value="Direct local connection" />
      </OnboardingCard>

      <PrimaryButton
        label="Open Library"
        onPress={() => void goToTabs("/(tabs)")}
        loading={busy}
      />
      <PrimaryButton
        label="Camera details"
        variant="outline"
        onPress={() => void goToTabs("/(tabs)/settings")}
        disabled={busy}
      />
    </OnboardingScreen>
  );
}

function MetaRow({ label, value }: { readonly label: string; readonly value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: OnboardingLayout.heroCardMinHeight,
    gap: 12,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  model: { fontSize: 17, fontFamily: Type.fontBold },
  divider: { height: StyleSheet.hairlineWidth, width: "100%" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 28,
  },
  metaLabel: { fontSize: 13, fontFamily: Type.font, flexShrink: 0 },
  metaValue: { fontSize: 13, fontFamily: Type.fontSemi, flex: 1, textAlign: "right" },
});
