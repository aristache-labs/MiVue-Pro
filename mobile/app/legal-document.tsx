import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PRIVACY_POLICY_TITLE,
  PRIVACY_SUMMARY,
  TERMS_OF_USE_TITLE,
  TERMS_SUMMARY,
} from "@/components/onboarding";
import { CONNECTION_HELP_BACK_TITLE } from "@/components/camera/cameraLibraryModel";
import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import { Type, useAppTheme } from "@/constants/Theme";

export default function LegalDocumentScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isPrivacy = doc === "privacy";
  const title = isPrivacy ? PRIVACY_POLICY_TITLE : TERMS_OF_USE_TITLE;
  const body = isPrivacy ? PRIVACY_SUMMARY : TERMS_SUMMARY;

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: CONNECTION_HELP_BACK_TITLE,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          padding: OnboardingLayout.screenHorizontalPadding,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <Text style={[styles.body, { color: colors.text }]}>{body}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, fontFamily: Type.font },
});
