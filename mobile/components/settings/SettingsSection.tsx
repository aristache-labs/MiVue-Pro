import { StyleSheet, Text, View, type ViewProps } from "react-native";

import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";

interface SettingsSectionProps extends ViewProps {
  readonly title: string;
  readonly children: React.ReactNode;
}

/** Grouped settings card with uppercase section label. */
export function SettingsSection({ title, children, style, ...rest }: SettingsSectionProps) {
  const { colors, radius } = useAppTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]} {...rest}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <Card style={{ padding: 0, overflow: "hidden", borderRadius: radius.md }}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 4,
  },
});
