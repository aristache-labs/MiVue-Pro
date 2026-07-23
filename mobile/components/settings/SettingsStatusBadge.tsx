import { StyleSheet, Text, View } from "react-native";

import type { ConnectionHubKind } from "@/components/settings/settingsSummaries";
import { Type, useAppTheme } from "@/constants/Theme";

interface SettingsStatusBadgeProps {
  readonly kind: ConnectionHubKind;
  readonly label: string;
}

/** Compact connection chip — teal when connected, muted when connecting, warn when unavailable. */
export function SettingsStatusBadge({ kind, label }: SettingsStatusBadgeProps) {
  const { colors, radius } = useAppTheme();
  const bg =
    kind === "connected"
      ? colors.brandSoft
      : kind === "connecting"
        ? colors.surfaceMuted
        : colors.warnSoft;
  const fg =
    kind === "connected"
      ? colors.brand
      : kind === "connecting"
        ? colors.textMuted
        : colors.warn;

  return (
    <View
      style={[styles.badge, { backgroundColor: bg, borderRadius: radius.sm }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 28,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 13, fontFamily: Type.fontSemi },
});
