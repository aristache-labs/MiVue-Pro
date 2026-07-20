import { StyleSheet, Text, View } from "react-native";

import { formatDuration } from "@/components/mediaMeta";
import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
import type { GpsSample } from "@/packages/parsers/src/index";

interface TelemetryPanelProps {
  readonly frame: GpsSample | undefined;
  readonly sampleCount: number;
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

/** NMEA timestamps are typically UTC — not the camera overlay local clock. */
function fmtGpsUtc(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mi}:${ss}`;
}

export function TelemetryPanel({ frame, sampleCount, videoTimeSec }: TelemetryPanelProps) {
  const { colors } = useAppTheme();

  return (
    <Card style={styles.card}>
      <Text style={[styles.status, { color: colors.textMuted }]}>
        {sampleCount > 0
          ? `${sampleCount} GPS samples · locked to video`
          : "No GPS samples"}
      </Text>
      <View style={styles.row}>
        <Metric label="Speed" value={fmtSpeed(frame?.speedKmh)} colors={colors} />
        <Metric label="Altitude" value={fmtAlt(frame?.altitudeMeters)} colors={colors} />
        <Metric label="In clip" value={formatDuration(videoTimeSec)} colors={colors} />
        <Metric label="GPS UTC" value={fmtGpsUtc(frame?.recordedAt)} colors={colors} hint="NMEA" />
      </View>
    </Card>
  );
}

function Metric({
  label,
  value,
  colors,
  hint,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  hint?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  status: { fontFamily: Type.font, fontSize: 11, marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, minWidth: 0 },
  metricLabel: {
    fontFamily: Type.fontSemi,
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metricValue: { fontFamily: Type.monoMed, fontSize: 13 },
  hint: { fontFamily: Type.font, fontSize: 9, marginTop: 1 },
});
