import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  LEGAL_DRAFT_BANNER,
  PRIVACY_SUMMARY_ROWS,
  TERMS_CHECKBOX_LABEL,
  continueEnabled,
} from "@/components/onboarding";
import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import { OnboardingCard, OnboardingScreen, StatusBadge } from "@/components/onboarding/OnboardingUi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { safeRouterBack } from "@/components/navigation/safeRouterBack";
import { PrimaryButton } from "@/components/ui";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

export default function OnboardingTermsScreen() {
  const { colors } = useAppTheme();
  const { acceptTermsNow, state } = useOnboarding();
  const [agreed, setAgreed] = useState(false);
  const fromSettings = state.onboardingCompleted === true;

  return (
    <OnboardingScreen
      title="Terms & Privacy"
      subtitle="Local-first access to recordings from a dashcam you own."
      onBack={fromSettings ? () => safeRouterBack("/(tabs)/settings") : undefined}
      backLabel="Cancel"
    >
      <StatusBadge label={LEGAL_DRAFT_BANNER} tone="warn" />

      <OnboardingCard>
        {PRIVACY_SUMMARY_ROWS.map((row) => (
          <View key={row.title} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.brandSoft }]}>
              <Ionicons name={row.icon} size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{row.title}</Text>
              <Text style={[styles.rowBody, { color: colors.textMuted }]}>{row.body}</Text>
            </View>
          </View>
        ))}
        <View style={[styles.links, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/legal-document", params: { doc: "terms" } } as never)
            }
            accessibilityRole="link"
            accessibilityLabel="Read Terms of Use"
            hitSlop={HitSlop44}
            style={styles.linkHit}
          >
            <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 14, flex: 1 }}>
              Read Terms of Use
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.brand} />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/legal-document", params: { doc: "privacy" } } as never)
            }
            accessibilityRole="link"
            accessibilityLabel="Read Privacy Policy"
            hitSlop={HitSlop44}
            style={styles.linkHit}
          >
            <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 14, flex: 1 }}>
              Read Privacy Policy
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.brand} />
          </Pressable>
        </View>
      </OnboardingCard>

      <Pressable
        onPress={() => setAgreed((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel={TERMS_CHECKBOX_LABEL}
        hitSlop={HitSlop44}
        style={styles.checkRow}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: agreed ? colors.brand : colors.border,
              backgroundColor: agreed ? colors.brand : colors.surface,
            },
          ]}
        >
          {agreed ? (
            <Text style={{ color: colors.onBrand, fontSize: 13, fontFamily: Type.fontBold }}>✓</Text>
          ) : null}
        </View>
        <Text style={[styles.checkLabel, { color: colors.text }]}>{TERMS_CHECKBOX_LABEL}</Text>
      </Pressable>

      <PrimaryButton
        label="Continue"
        onPress={() => {
          void acceptTermsNow().then(() => {
            router.replace("/onboarding/add-camera" as Parameters<typeof router.replace>[0]);
          });
        }}
        disabled={!continueEnabled(agreed)}
        accessibilityLabel="Continue after accepting terms"
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontFamily: Type.fontSemi },
  rowBody: { fontSize: 13, lineHeight: 18, fontFamily: Type.font },
  links: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 10,
    gap: 2,
  },
  linkHit: {
    minHeight: OnboardingLayout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minHeight: OnboardingLayout.minimumTouchTarget,
  },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: Type.font },
});
