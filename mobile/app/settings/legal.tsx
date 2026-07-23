import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Alert, BackHandler, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LEGAL_DRAFT_BANNER } from "@/components/onboarding";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { internalToolsEnabled } from "@/components/environment/resolveInternalTools";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import {
  SettingsActionRow,
  SettingsDangerRow,
  SettingsSection,
  SettingsValueRow,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { useAppTheme } from "@/constants/Theme";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

export default function SettingsLegalScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { state: onboardingState, resetOnboardingDev } = useOnboarding();
  const showDeveloperTools = internalToolsEnabled();

  const onReset = () => {
    if (!internalToolsEnabled()) return;
    Alert.alert(
      "Reset onboarding?",
      "Clears setup progress and shows Terms again.\n\nDoes not delete: local downloads, the download queue, or camera recordings on the device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset onboarding",
          style: "destructive",
          onPress: () => {
            void resetOnboardingDev().then(() => {
              router.replace("/onboarding" as Parameters<typeof router.replace>[0]);
            });
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Legal" onBack={navigateBackToSettings} />

      <SettingsScroll
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <SettingsSection title="Agreements">
          <SettingsValueRow
            icon="document-text-outline"
            title="Accepted terms"
            value={onboardingState.acceptedTermsVersion ?? "Not accepted"}
            subtitle={
              onboardingState.acceptedTermsAt
                ? `Accepted ${new Date(onboardingState.acceptedTermsAt).toLocaleString()}`
                : LEGAL_DRAFT_BANNER
            }
          />
          <SettingsActionRow
            icon="book-outline"
            title="Terms of Use"
            subtitle={LEGAL_DRAFT_BANNER}
            onPress={() =>
              router.push("/legal-document?doc=terms" as Parameters<typeof router.push>[0])
            }
          />
          <SettingsActionRow
            icon="shield-outline"
            title="Privacy Policy"
            subtitle={LEGAL_DRAFT_BANNER}
            onPress={() =>
              router.push("/legal-document?doc=privacy" as Parameters<typeof router.push>[0])
            }
          />
        </SettingsSection>

        {showDeveloperTools ? (
          <SettingsSection title="Developer tools">
            <SettingsDangerRow
              icon="refresh-circle-outline"
              title="Reset onboarding"
              subtitle="Clears setup progress and shows Terms again. Local downloads and the queue are kept."
              onPress={onReset}
              accessibilityLabel="Reset onboarding"
            />
          </SettingsSection>
        ) : null}
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
