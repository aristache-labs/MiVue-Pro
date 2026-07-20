import { StyleSheet, Text, View } from "react-native";

import { Type, useAppTheme } from "@/constants/Theme";

interface ProgressBarProps {
  readonly percent: number;
  readonly label?: string;
  readonly rightLabel?: string;
  readonly tone?: "brand" | "success";
}

export function ProgressBar({ percent, label, rightLabel, tone = "brand" }: ProgressBarProps) {
  const { colors, spacing } = useAppTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  const fillColor = tone === "success" ? colors.success : colors.brand;

  return (
    <View style={{ marginTop: spacing.sm }}>
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(clamped, clamped > 0 ? clamped : 3)}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
      {label || rightLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textMuted }]} accessibilityLiveRegion="polite">
            {label ?? ""}
          </Text>
          {rightLabel ? (
            <Text style={[styles.label, styles.rightLabel, { color: colors.brand }]}>{rightLabel}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 8,
  },
  label: { fontSize: 12, fontFamily: Type.fontSemi, flexShrink: 1 },
  rightLabel: { fontFamily: Type.monoMed, textAlign: "right" },
});
