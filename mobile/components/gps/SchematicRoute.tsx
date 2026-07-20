import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import type { GpsSample } from "@/packages/parsers/src/index";
import { useAppTheme } from "@/constants/Theme";

interface SchematicRouteProps {
  readonly samples: readonly GpsSample[];
  readonly activeIndex: number;
  readonly height?: number;
}

/** Local schematic map — no tile servers. Path geometry memoized; marker updates with index. */
export const SchematicRoute = memo(function SchematicRoute({
  samples,
  activeIndex,
  height = 180,
}: SchematicRouteProps) {
  const { colors } = useAppTheme();
  const width = 320;
  const pad = 24;

  const geometry = useMemo(() => {
    if (samples.length === 0) return null;
    const lats = samples.map((s) => s.latitude);
    const lons = samples.map((s) => s.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const spanLat = maxLat - minLat || 1;
    const spanLon = maxLon - minLon || 1;
    const points = samples.map((sample) => ({
      x: pad + ((sample.longitude - minLon) / spanLon) * (width - 2 * pad),
      y: height - pad - ((sample.latitude - minLat) / spanLat) * (height - 2 * pad),
    }));
    const fullPath = points.map((p) => `${p.x},${p.y}`).join(" ");
    return { points, fullPath, start: points[0]!, end: points[points.length - 1]! };
  }, [samples, height]);

  if (!geometry) {
    return <View style={[styles.empty, { height, backgroundColor: colors.surfaceMuted }]} />;
  }

  const idx = Math.min(Math.max(0, activeIndex), geometry.points.length - 1);
  const progressPath = geometry.points
    .slice(0, idx + 1)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
  const marker = geometry.points[idx]!;

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
        <Polyline
          points={geometry.fullPath}
          fill="none"
          stroke={colors.textFaint}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
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
        <Circle cx={geometry.start.x} cy={geometry.start.y} r={4} fill={colors.textFaint} />
        <Circle cx={geometry.end.x} cy={geometry.end.y} r={4} fill={colors.textFaint} />
        <Circle
          cx={marker.x}
          cy={marker.y}
          r={7}
          fill={colors.brand}
          stroke={colors.onBrand}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: "100%", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  empty: { width: "100%", borderRadius: 10 },
});
