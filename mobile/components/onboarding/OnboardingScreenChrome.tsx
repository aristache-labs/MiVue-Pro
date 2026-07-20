import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

/**
 * Shared onboarding chrome — safe-area aware so Back sits below the Dynamic Island.
 */
export function OnboardingScreenChrome({
  title,
  children,
  onBack,
  backLabel = "Back",
  footer,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly footer?: React.ReactNode;
}) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: Math.max(insets.top, 12) + 4,
          paddingBottom: footer ? 0 : Math.max(insets.bottom, 12),
          paddingHorizontal: spacing.lg,
        },
      ]}
    >
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            hitSlop={HitSlop44}
            style={styles.backHit}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>{backLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.sideSlot} />
      </View>

      <View style={styles.body}>{children}</View>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backHit: {
    minWidth: 88,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: -6,
  },
  sideSlot: { minWidth: 88, minHeight: 44 },
  backText: { fontSize: 16, fontFamily: Type.font, lineHeight: 22 },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: Type.fontSemi,
  },
  body: { flex: 1 },
  footer: { gap: 10, paddingTop: 8 },
});
