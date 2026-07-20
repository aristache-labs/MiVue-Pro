import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import type { GpsSample } from "@/packages/parsers/src/index";
import { useAppTheme } from "@/constants/Theme";

interface SchematicRouteProps {
  readonly samples: readonly GpsSample[];
  readonly activeIndex: number;
  readonly height?: number;
}

export function SchematicRoute({ samples, activeIndex, height = 180 }: SchematicRouteProps) {
  const { colors } = useAppTheme();
  const width = 320;
  const pad = 24;

  if (samples.length === 0) {
    return <View style={[styles.empty, { height, backgroundColor: colors.surfaceMuted }]} />;
  }

  const lats = samples.map((s) => s.latitude);
  const lons = samples.map((s) => s.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const spanLat = maxLat - minLat || 1;
  const spanLon = maxLon - minLon || 1;

  const project = (sample: GpsSample) => ({
    x: pad + ((sample.longitude - minLon) / spanLon) * (width - 2 * pad),
    y: height - pad - ((sample.latitude - minLat) / spanLat) * (height - 2 * pad),
  });

  const allPoints = samples.map(project);
  const fullPath = allPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const progressPath = allPoints
    .slice(0, Math.min(activeIndex + 1, allPoints.length))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
  const marker = allPoints[Math.min(activeIndex, allPoints.length - 1)]!;
  const start = allPoints[0]!;
  const end = allPoints[allPoints.length - 1]!;

  return (
    <View style={[styles.wrap, { height, backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0.25, 0.5, 0.75].map((t) => (
          <Line
            key={`h-${t}`}
            x1={pad}
            y1={pad + t * (height - 2 * pad)}
            x2={width - pad}
            y2={pad + t * (height - 2 * pad)}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        <Polyline points={fullPath} fill="none" stroke={colors.textFaint} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {progressPath.length > 0 ? (
          <Polyline
            points={progressPath}
            fill="none"
            stroke={colors.brand}
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        <Circle cx={start.x} cy={start.y} r={4} fill={colors.textFaint} />
        <Circle cx={end.x} cy={end.y} r={4} fill={colors.textFaint} />
        <Circle cx={marker.x} cy={marker.y} r={7} fill={colors.brand} stroke={colors.onBrand} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  empty: { width: "100%", borderRadius: 10 },
});
