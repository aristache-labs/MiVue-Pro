import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import { OnboardingCard, OnboardingScreen, StatusBadge } from "@/components/onboarding/OnboardingUi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { safeRouterBack } from "@/components/navigation/safeRouterBack";
import { PrimaryButton } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";

export default function OnboardingAddCameraScreen() {
  const { colors } = useAppTheme();
  const { goAddCamera, skipCamera, setStep, state } = useOnboarding();
  const fromSettings = state.onboardingCompleted === true;

  return (
    <OnboardingScreen
      title="Add your camera"
      onBack={
        fromSettings
          ? () => safeRouterBack("/(tabs)/settings")
          : () => {
              void setStep("terms").then(() => {
                router.replace("/onboarding/terms" as Parameters<typeof router.replace>[0]);
              });
            }
      }
      backLabel={fromSettings ? "Cancel" : "Back"}
    >
      <OnboardingCard style={styles.hero}>
        <View style={[styles.iconCircle, { backgroundColor: colors.brandSoft }]}>
          <Ionicons name="videocam-outline" size={34} color={colors.brand} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>Connect your dashcam</Text>
        <Text style={[styles.heroBody, { color: colors.textMuted }]}>
          View and download recordings directly over the camera’s Wi-Fi.
        </Text>
        <StatusBadge label="Local · Private · Read-only" tone="brand" />
      </OnboardingCard>

      <PrimaryButton
        label="Add camera"
        icon="add-circle-outline"
        onPress={() => {
          void goAddCamera().then(() => {
            router.replace("/onboarding/select-camera" as Parameters<typeof router.replace>[0]);
          });
        }}
      />
      <PrimaryButton
        label="Set up later"
        variant="outline"
        onPress={() => {
          void skipCamera().then(() => {
            router.replace("/(tabs)" as Parameters<typeof router.replace>[0]);
          });
        }}
        accessibilityLabel="Set up camera later and open Library"
      />
      <Text style={[styles.note, { color: colors.textMuted }]}>
        You can finish camera setup anytime from Settings.
      </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: OnboardingLayout.heroCardMinHeight,
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  heroTitle: { fontSize: 18, lineHeight: 24, fontFamily: Type.fontBold, textAlign: "center" },
  heroBody: { fontSize: 14, lineHeight: 20, fontFamily: Type.font, textAlign: "center" },
  note: { fontSize: 12, lineHeight: 16, fontFamily: Type.font, textAlign: "center" },
});
