import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingLayout } from "@/components/onboarding/onboardingLayout";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

/** Compact scrollable onboarding shell — CTAs follow content (no space-between footer). */
export function OnboardingScreen({
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly children: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SettingsChromeHeader title={title} onBack={onBack} backLabel={backLabel} />
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textMuted,
              paddingHorizontal: OnboardingLayout.screenHorizontalPadding,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: OnboardingLayout.screenHorizontalPadding,
          paddingTop: subtitle ? 8 : 12,
          paddingBottom: Math.max(insets.bottom, 20) + 8,
          gap: OnboardingLayout.sectionGap,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function OnboardingCard({
  children,
  style,
}: {
  readonly children: React.ReactNode;
  readonly style?: object;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: OnboardingLayout.cardRadius,
          padding: OnboardingLayout.cardPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatusBadge({
  label,
  tone = "brand",
}: {
  readonly label: string;
  readonly tone?: "brand" | "warn" | "muted" | "success";
}) {
  const { colors } = useAppTheme();
  const fg =
    tone === "warn"
      ? colors.warn
      : tone === "muted"
        ? colors.textMuted
        : tone === "success"
          ? colors.success
          : colors.brand;
  const bg =
    tone === "warn"
      ? colors.warnSoft
      : tone === "muted"
        ? colors.surfaceMuted
        : tone === "success"
          ? colors.successSoft
          : colors.brandSoft;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function InlineMessage({
  title,
  message,
  tone = "neutral",
  technical,
  onOpenSettings,
}: {
  readonly title: string;
  readonly message: string;
  readonly tone?: "neutral" | "warn" | "danger";
  readonly technical?: string;
  readonly onOpenSettings?: () => void;
}) {
  const { colors } = useAppTheme();
  const border =
    tone === "danger" ? colors.danger : tone === "warn" ? colors.warn : colors.border;
  const bg =
    tone === "danger"
      ? colors.dangerSoft
      : tone === "warn"
        ? colors.warnSoft
        : colors.surfaceMuted;
  const titleColor =
    tone === "danger" ? colors.danger : tone === "warn" ? colors.warn : colors.text;

  return (
    <View style={[styles.inline, { borderColor: border, backgroundColor: bg }]}>
      <Ionicons
        name={tone === "danger" ? "alert-circle" : "information-circle-outline"}
        size={20}
        color={titleColor}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.inlineTitle, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.inlineBody, { color: colors.textMuted }]} numberOfLines={3}>
          {message}
        </Text>
        {onOpenSettings ? (
          <Pressable
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Open app settings"
            hitSlop={HitSlop44}
            style={styles.settingsLink}
          >
            <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 13 }}>
              Open app settings
            </Text>
          </Pressable>
        ) : null}
        {__DEV__ && technical ? (
          <Text style={[styles.tech, { color: colors.textFaint }]} numberOfLines={4}>
            Technical details: {technical}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Type.font,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 2,
  },
  scroll: { flex: 1 },
  card: { borderWidth: StyleSheet.hairlineWidth, gap: OnboardingLayout.compactCardGap },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontFamily: Type.fontSemi },
  inline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  inlineTitle: { fontSize: 14, fontFamily: Type.fontSemi },
  inlineBody: { fontSize: 13, fontFamily: Type.font, lineHeight: 18 },
  settingsLink: { minHeight: 44, justifyContent: "center" },
  tech: { fontSize: 11, fontFamily: Type.mono, marginTop: 6 },
});
