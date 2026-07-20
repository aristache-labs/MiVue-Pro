import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/constants/Theme";

export type BadgeTone = "brand" | "live" | "demo" | "success" | "danger" | "neutral";

interface BadgeProps {
  readonly label: string;
  readonly tone?: BadgeTone;
  readonly icon?: keyof typeof Ionicons.glyphMap;
}

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const { colors, radius, spacing } = useAppTheme();

  const toneColors: Record<BadgeTone, { fg: string; bg: string }> = {
    brand: { fg: colors.brand, bg: colors.brandSoft },
    live: { fg: colors.live, bg: colors.liveSoft },
    demo: { fg: colors.demo, bg: colors.demoSoft },
    success: { fg: colors.success, bg: colors.successSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft },
    neutral: { fg: colors.textMuted, bg: colors.surfaceMuted },
  };
  const { fg, bg } = toneColors[tone];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
      ]}
      accessibilityRole="text"
    >
      {icon ? <Ionicons name={icon} size={13} color={fg} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
  icon: { marginRight: 4 },
  label: { fontSize: 12, fontWeight: "700" },
});
