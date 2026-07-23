import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";

import { HitSlop44, useAppTheme } from "@/constants/Theme";

export type SheetCloseButtonProps = {
  readonly onPress: () => void;
  readonly accessibilityLabel?: string;
};

/**
 * Shared sheet close control — same tokens as Filters (muted close, 22px, 44×44 hit).
 */
export function SheetCloseButton({
  onPress,
  accessibilityLabel = "Close",
}: SheetCloseButtonProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={HitSlop44}
      style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name="close" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
