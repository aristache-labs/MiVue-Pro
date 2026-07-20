import { Pressable, StyleSheet, Text, View } from "react-native";

import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

interface CameraUnavailableBannerProps {
  readonly onConnect: () => void;
  readonly connecting?: boolean;
}

/** Compact disconnected-only strip — not shown when connected. */
export function CameraUnavailableBanner({
  onConnect,
  connecting = false,
}: CameraUnavailableBannerProps) {
  const { colors, radius } = useAppTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel="Camera unavailable"
    >
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: colors.warn }]} accessibilityElementsHidden />
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          Camera unavailable
        </Text>
      </View>
      <Pressable
        onPress={onConnect}
        disabled={connecting}
        accessibilityRole="button"
        accessibilityLabel="Connect"
        accessibilityState={{ busy: connecting, disabled: connecting }}
        hitSlop={HitSlop44}
        style={({ pressed }) => [
          styles.action,
          {
            borderColor: colors.brand,
            opacity: connecting ? 0.5 : pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[styles.actionText, { color: colors.brand }]}>
          {connecting ? "Connecting…" : "Connect"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    maxHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flexShrink: 1, fontSize: 13, fontFamily: Type.fontSemi },
  action: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  actionText: { fontSize: 13, fontFamily: Type.fontSemi },
});
