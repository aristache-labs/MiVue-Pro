import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Type, useAppTheme } from "@/constants/Theme";

interface PrimaryButtonProps {
  readonly label: string;
  /** Shown beside spinner while `loading`; defaults to `label`. */
  readonly loadingLabel?: string;
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
  loadingLabel,
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
  const isInactive = disabled || loading;
  const showDisabledLook = disabled && !loading;

  let bg: string;
  let fg: string;
  let borderColor: string;
  if (showDisabledLook) {
    if (isOutline || isDanger) {
      bg = "transparent";
      fg = colors.textMuted;
      borderColor = colors.border;
    } else {
      bg = colors.surfaceMuted;
      fg = colors.textMuted;
      borderColor = "transparent";
    }
  } else if (isOutline) {
    bg = "transparent";
    fg = colors.brand;
    borderColor = colors.brand;
  } else if (isDanger) {
    bg = colors.danger;
    fg = colors.onBrand;
    borderColor = "transparent";
  } else {
    bg = colors.brand;
    fg = colors.onBrand;
    borderColor = "transparent";
  }

  const busyLabel = loadingLabel ?? label;
  const a11y = accessibilityLabel ?? (loading ? busyLabel : label);

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: radius.sm,
          paddingVertical: compact ? spacing.sm : spacing.md,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          opacity: pressed && !isInactive ? 0.85 : 1,
          minHeight: compact ? 36 : 44,
        },
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={fg} style={styles.spinner} />
          <Text style={[styles.label, { color: fg, fontSize: compact ? 13 : 15 }]} numberOfLines={1}>
            {busyLabel}
          </Text>
        </View>
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: { marginRight: 8 },
  icon: { marginRight: 8 },
  label: { fontFamily: Type.fontSemi },
});
