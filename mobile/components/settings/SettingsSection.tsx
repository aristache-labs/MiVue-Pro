import { StyleSheet, Text, View, type ViewProps } from "react-native";

import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";

interface SettingsSectionProps extends ViewProps {
  readonly title: string;
  readonly summary?: string;
  readonly children: React.ReactNode;
}

/** Grouped settings card with uppercase section label and optional right summary. */
export function SettingsSection({
  title,
  summary,
  children,
  style,
  ...rest
}: SettingsSectionProps) {
  const { colors, radius } = useAppTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]} {...rest}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
        {summary ? (
          <Text
            style={[styles.sectionSummary, { color: colors.textMuted }]}
            numberOfLines={1}
            accessibilityLabel={summary}
          >
            {summary}
          </Text>
        ) : null}
      </View>
      <Card style={{ padding: 0, overflow: "hidden", borderRadius: radius.md }}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    marginLeft: 4,
    marginRight: 4,
    minHeight: 16,
  },
  sectionTitle: {
    flexShrink: 0,
    fontSize: 12,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionSummary: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "right",
    fontSize: 11,
    fontFamily: Type.mono,
    fontVariant: ["tabular-nums"],
  },
});
