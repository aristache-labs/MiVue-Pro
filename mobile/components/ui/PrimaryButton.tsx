import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { Type, useAppTheme } from "@/constants/Theme";

interface PrimaryButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly variant?: "filled" | "outline" | "danger";
  readonly accessibilityLabel?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly compact?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "filled",
  accessibilityLabel,
  loading = false,
  disabled = false,
  compact = false,
}: PrimaryButtonProps) {
  const { colors, radius, spacing } = useAppTheme();

  const isOutline = variant === "outline";
  const isDanger = variant === "danger";
  const bg = isOutline ? "transparent" : isDanger ? colors.danger : colors.brand;
  const fg = isOutline ? colors.brand : colors.onBrand;
  const borderColor = isOutline ? colors.brand : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: radius.sm,
          paddingVertical: compact ? spacing.sm : spacing.md,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          minHeight: compact ? 36 : 44,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 15 : 17} color={fg} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: fg, fontSize: compact ? 13 : 15 }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { marginRight: 8 },
  label: { fontFamily: Type.fontSemi },
});
