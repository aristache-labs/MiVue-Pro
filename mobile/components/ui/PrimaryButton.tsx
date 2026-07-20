import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/constants/Theme";

interface PrimaryButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly variant?: "filled" | "outline" | "danger";
  readonly accessibilityLabel?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "filled",
  accessibilityLabel,
  loading = false,
  disabled = false,
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
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={fg} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
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
    minHeight: 44,
  },
  icon: { marginRight: 8 },
  label: { fontSize: 15, fontWeight: "700" },
});
