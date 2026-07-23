import { router } from "expo-router";
import { Alert } from "react-native";

import { LEGAL_DRAFT_BANNER } from "@/components/onboarding";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import {
  SettingsActionRow,
  SettingsDangerRow,
  SettingsSection,
  SettingsValueRow,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";

export default function SettingsLegalScreen() {
  const { state: onboardingState, resetOnboardingDev } = useOnboarding();

  const onReset = () => {
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

  return (
    <SettingsScroll>
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

      <SettingsSection title="Danger zone">
        <SettingsDangerRow
          icon="refresh-circle-outline"
          title="Reset onboarding"
          subtitle="Clears setup progress and shows Terms again. Local downloads and the queue are kept."
          onPress={onReset}
          accessibilityLabel="Reset onboarding"
        />
      </SettingsSection>
    </SettingsScroll>
  );
}
