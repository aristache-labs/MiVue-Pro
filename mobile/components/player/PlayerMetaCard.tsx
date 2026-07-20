import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { PLAYER_META_LABELS, buildPlayerMetaFields } from "@/components/player/playerMeta";
import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";

interface PlayerMetaCardProps {
  readonly name: string;
  readonly sizeBytes: number;
  readonly durationSeconds?: number;
}

/**
 * Premium 4-metric file card — centered columns, short labels, Library/Queue tokens.
 * Wraps to 2×2 on narrow / large Dynamic Type.
 */
export function PlayerMetaCard({ name, sizeBytes, durationSeconds }: PlayerMetaCardProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const fields = buildPlayerMetaFields(name, sizeBytes, durationSeconds);
  const compact = width < 380 || fontScale > 1.2;

  const metrics: { label: (typeof PLAYER_META_LABELS)[number]; value: string; flex: number }[] = [
    { label: "DATE", value: fields.date, flex: 1.15 },
    { label: "TIME", value: fields.time, flex: 1 },
    { label: "SIZE", value: fields.size, flex: 1 },
    { label: "DURATION", value: fields.duration, flex: 0.9 },
  ];

  return (
    <Card
      style={[
        styles.card,
        {
          borderRadius: radius.xl,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          paddingVertical: 10,
          paddingHorizontal: 12,
        },
      ]}
    >
      <View style={[styles.row, compact && styles.rowWrap]}>
        {metrics.map((m, index) => (
          <View
            key={m.label}
            style={[
              styles.metric,
              compact
                ? styles.metricHalf
                : { flex: m.flex, paddingHorizontal: 6 },
              !compact && index > 0 ? [styles.withSep, { borderLeftColor: colors.border }] : null,
              compact && index % 2 === 1
                ? [styles.withSep, { borderLeftColor: colors.border }]
                : null,
            ]}
          >
            <Text
              style={[styles.label, { color: colors.textMuted }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.25}
            >
              {m.label}
            </Text>
            <Text
              style={[styles.value, { color: colors.text, fontVariant: ["tabular-nums"] }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {m.value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  rowWrap: { flexWrap: "wrap" },
  metric: {
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  metricHalf: {
    width: "50%",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  withSep: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 9,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 4,
    width: "100%",
  },
  value: {
    fontSize: 14,
    fontFamily: Type.fontSemi,
    lineHeight: 18,
    textAlign: "center",
    width: "100%",
  },
});
