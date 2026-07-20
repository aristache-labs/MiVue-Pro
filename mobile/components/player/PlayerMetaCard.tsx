import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { buildPlayerMetaFields } from "@/components/player/playerMeta";
import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";

interface PlayerMetaCardProps {
  readonly name: string;
  readonly sizeBytes: number;
  readonly durationSeconds?: number;
}

/**
 * Premium 4-metric file card — matches Library/Queue Card tokens.
 * Wraps to 2×2 on narrow / large Dynamic Type.
 */
export function PlayerMetaCard({ name, sizeBytes, durationSeconds }: PlayerMetaCardProps) {
  const { colors, radius, spacing } = useAppTheme();
  const { width } = useWindowDimensions();
  const fields = buildPlayerMetaFields(name, sizeBytes, durationSeconds);
  const compact = width < 380;

  const metrics: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }[] = [
    { icon: "calendar-outline", label: "Recorded date", value: fields.date },
    { icon: "time-outline", label: "Time", value: fields.time },
    { icon: "server-outline", label: "File size", value: fields.size },
    { icon: "timer-outline", label: "Duration", value: fields.duration },
  ];

  return (
    <Card
      style={[
        styles.card,
        {
          borderRadius: radius.xl,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          paddingVertical: compact ? 10 : 12,
          paddingHorizontal: compact ? 10 : 12,
          minHeight: compact ? 68 : 72,
        },
      ]}
    >
      <View style={[styles.row, compact && styles.rowWrap]}>
        {metrics.map((m, index) => (
          <View
            key={m.label}
            style={[
              styles.metric,
              compact ? styles.metricHalf : styles.metricQuarter,
              !compact && index > 0 ? styles.withSep : null,
              !compact && index > 0 ? { borderLeftColor: colors.border } : null,
              compact && index % 2 === 1 ? styles.withSep : null,
              compact && index % 2 === 1 ? { borderLeftColor: colors.border } : null,
            ]}
          >
            <View style={styles.labelRow}>
              <Ionicons name={m.icon} size={11} color={colors.brand} style={{ marginRight: 4 }} />
              <Text
                style={[styles.label, { color: colors.textMuted }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {m.label}
              </Text>
            </View>
            <Text
              style={[styles.value, { color: colors.text, fontVariant: ["tabular-nums"] }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.35}
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
  row: { flexDirection: "row", alignItems: "stretch" },
  rowWrap: { flexWrap: "wrap" },
  metric: { minWidth: 0, paddingVertical: 2 },
  metricQuarter: { flex: 1, paddingHorizontal: 8 },
  metricHalf: { width: "50%", paddingHorizontal: 8, paddingVertical: 6 },
  withSep: { borderLeftWidth: StyleSheet.hairlineWidth },
  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  label: {
    fontSize: 9,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  value: {
    fontSize: 14,
    fontFamily: Type.fontSemi,
    lineHeight: 18,
  },
});
