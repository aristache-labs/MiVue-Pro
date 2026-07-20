import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";

import { useAppTheme } from "@/constants/Theme";

export type IconButtonTone = "neutral" | "brand" | "danger";

interface IconButtonProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly onPress: () => void;
  readonly tone?: IconButtonTone;
  readonly accessibilityLabel: string;
  readonly size?: number;
  readonly disabled?: boolean;
}

/** Always renders a >=44x44pt hit area per Apple HIG. */
export function IconButton({
  icon,
  onPress,
  tone = "neutral",
  accessibilityLabel,
  size = 18,
  disabled = false,
}: IconButtonProps) {
  const { colors } = useAppTheme();

  const toneColors: Record<IconButtonTone, { fg: string; bg: string }> = {
    neutral: { fg: colors.textMuted, bg: colors.surfaceMuted },
    brand: { fg: colors.brand, bg: colors.brandSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft },
  };
  const { fg, bg } = toneColors[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={size} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
