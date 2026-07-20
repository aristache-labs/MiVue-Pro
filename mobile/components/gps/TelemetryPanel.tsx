import { StyleSheet, Text, View } from "react-native";

import { formatDuration } from "@/components/mediaMeta";
import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
import type { GpsSample } from "@/packages/parsers/src/index";

interface TelemetryPanelProps {
  readonly frame: GpsSample | undefined;
  readonly videoTimeSec: number;
}

function fmtSpeed(kmh: number | undefined): string {
  if (kmh === undefined || !Number.isFinite(kmh)) return "—";
  return `${kmh.toFixed(0)} km/h`;
}

function fmtAlt(m: number | undefined): string {
  if (m === undefined || !Number.isFinite(m)) return "—";
  return `${m.toFixed(1)} m`;
}

export function TelemetryPanel({ frame, videoTimeSec }: TelemetryPanelProps) {
  const { colors } = useAppTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Metric label="Speed" value={fmtSpeed(frame?.speedKmh)} colors={colors} />
        <Metric label="Altitude" value={fmtAlt(frame?.altitudeMeters)} colors={colors} />
        <Metric label="In clip" value={formatDuration(videoTimeSec)} colors={colors} />
      </View>
    </Card>
  );
}

function Metric({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, minWidth: 0 },
  metricLabel: {
    fontFamily: Type.fontSemi,
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metricValue: { fontFamily: Type.monoMed, fontSize: 14 },
});
