import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { Type, useAppTheme } from "@/constants/Theme";

interface EmptyStateProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors, spacing } = useAppTheme();
  return (
    <View style={[styles.container, { paddingVertical: spacing.xxxl }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={26} color={colors.textFaint} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 32 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: 15, fontFamily: Type.fontSemi, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: Type.font, textAlign: "center", lineHeight: 18 },
});
