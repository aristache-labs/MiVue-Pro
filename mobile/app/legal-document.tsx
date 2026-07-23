import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  LEGAL_DRAFT_BANNER,
  getLegalDocument,
  type LegalDocumentSection,
} from "@/components/onboarding";
import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { Type, useAppTheme } from "@/constants/Theme";

function navigateBack(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/settings/legal" as Parameters<typeof router.replace>[0]);
}

function SectionBlock({
  section,
  textColor,
  mutedColor,
}: {
  readonly section: LegalDocumentSection;
  readonly textColor: string;
  readonly mutedColor: string;
}) {
  return (
    <View style={styles.section}>
      <Text
        style={[styles.heading, { color: textColor }]}
        accessibilityRole="header"
        maxFontSizeMultiplier={1.4}
      >
        {section.title}
      </Text>
      {section.paragraphs?.map((paragraph, index) => (
        <Text
          key={`p-${index}`}
          style={[styles.paragraph, { color: textColor }]}
          maxFontSizeMultiplier={1.4}
        >
          {paragraph}
        </Text>
      ))}
      {section.bullets?.length ? (
        <View style={styles.bulletList}>
          {section.bullets.map((bullet, index) => (
            <View key={`b-${index}`} style={styles.bulletRow}>
              <Text style={[styles.bulletMark, { color: mutedColor }]} maxFontSizeMultiplier={1.4}>
                •
              </Text>
              <Text
                style={[styles.bulletText, { color: textColor }]}
                maxFontSizeMultiplier={1.4}
              >
                {bullet}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function LegalDocumentScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isPrivacy = doc === "privacy";
  const document = getLegalDocument(isPrivacy ? "privacy" : "terms");

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBack();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title={document.title} onBack={navigateBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          padding: OnboardingLayout.screenHorizontalPadding,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <Text
          style={[styles.banner, { color: colors.warn, backgroundColor: colors.surfaceMuted }]}
          maxFontSizeMultiplier={1.4}
        >
          {LEGAL_DRAFT_BANNER}
        </Text>
        <Text style={[styles.docTitle, { color: colors.text }]} maxFontSizeMultiplier={1.4}>
          {document.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]} maxFontSizeMultiplier={1.4}>
          Version {document.version}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]} maxFontSizeMultiplier={1.4}>
          Effective date: {document.effectiveDate}
        </Text>
        <Text style={[styles.metaLast, { color: colors.textMuted }]} maxFontSizeMultiplier={1.4}>
          Status: draft
        </Text>

        {document.sections.map((section) => (
          <SectionBlock
            key={section.title}
            section={section}
            textColor={colors.text}
            mutedColor={colors.textMuted}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  banner: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Type.fontSemi,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    overflow: "hidden",
  },
  docTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Type.fontBold,
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Type.font,
    marginBottom: 2,
  },
  metaLast: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Type.font,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Type.fontSemi,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Type.font,
    marginBottom: 8,
  },
  bulletList: {
    gap: 6,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletMark: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Type.font,
    width: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Type.font,
  },
});
