import { StyleSheet, Text, View } from "react-native";

import { formatLiveClipTime } from "@/components/mediaMeta";
import {
  altitudeA11yLabel,
  cameraTimeA11yLabel,
  formatAltitudeParts,
  formatSpeedParts,
  speedA11yLabel,
} from "@/components/player/telemetryFormat";
import { Card } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
import type { GpsSample } from "@/packages/parsers/src/index";

interface TelemetryPanelProps {
  readonly frame: GpsSample | undefined;
  readonly videoTimeSec: number;
  readonly clipName: string;
}

export function TelemetryPanel({ frame, videoTimeSec, clipName }: TelemetryPanelProps) {
  const { colors } = useAppTheme();
  const speed = formatSpeedParts(frame?.speedKmh);
  const alt = formatAltitudeParts(frame?.altitudeMeters);
  const cameraTime = formatLiveClipTime(clipName, videoTimeSec);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Metric
          label="Speed"
          value={speed.value}
          unit={speed.unit}
          colors={colors}
          accessibilityLabel={speedA11yLabel(frame?.speedKmh)}
        />
        <Metric
          label="Altitude"
          value={alt.value}
          unit={alt.unit}
          colors={colors}
          accessibilityLabel={altitudeA11yLabel(frame?.altitudeMeters)}
        />
        <Metric
          label="Camera time"
          value={cameraTime}
          unit=""
          colors={colors}
          accessibilityLabel={cameraTimeA11yLabel(cameraTime)}
        />
      </View>
    </Card>
  );
}

function Metric({
  label,
  value,
  unit,
  colors,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  unit: string;
  colors: ReturnType<typeof useAppTheme>["colors"];
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text
          style={[styles.metricValue, { color: colors.text, fontVariant: ["tabular-nums"] }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={[styles.metricUnit, { color: colors.textMuted }]} numberOfLines={1}>
            {" "}
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, borderRadius: 14 },
  row: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, minWidth: 0 },
  metricLabel: {
    fontFamily: Type.fontSemi,
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
  metricValue: { fontFamily: Type.monoMed, fontSize: 14 },
  metricUnit: { fontFamily: Type.font, fontSize: 11 },
});
