import { StyleSheet, Text, View } from "react-native";

import type { GpsSample } from "@/packages/parsers/src/index";
import { Type, useAppTheme } from "@/constants/Theme";

interface TelemetryPanelProps {
  readonly samples: readonly GpsSample[];
  readonly activeIndex: number;
  readonly status: string;
}

export function TelemetryPanel({ samples, activeIndex, status }: TelemetryPanelProps) {
  const { colors, spacing, radius } = useAppTheme();
  const sample = samples[Math.min(activeIndex, Math.max(0, samples.length - 1))];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <Text style={[styles.status, { color: colors.textMuted }]}>{status}</Text>
      <View style={styles.row}>
        <Metric label="SPEED" value={sample ? `${sample.speedKmh.toFixed(0)} km/h` : "—"} />
        <Metric
          label="ALT"
          value={
            sample?.altitudeMeters !== undefined ? `${sample.altitudeMeters.toFixed(1)} m` : "—"
          }
        />
        <Metric
          label="TIME"
          value={sample ? sample.recordedAt.slice(11, 19) : "—"}
        />
      </View>
    </View>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.textFaint }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  status: { fontSize: 12, fontFamily: Type.fontSemi, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 9, fontFamily: Type.fontSemi, letterSpacing: 0.6, marginBottom: 2 },
  metricValue: { fontSize: 15, fontFamily: Type.monoMed },
});
