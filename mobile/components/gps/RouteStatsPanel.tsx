import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RouteStats } from "./routeStats";
import { formatDistance, formatSpeed } from "./routeStats";

interface RouteStatsPanelProps {
  readonly stats: RouteStats;
  readonly textColor: string;
  readonly surfaceColor: string;
  readonly mutedColor: string;
}

/**
 * Panel displaying route statistics: total distance, avg speed, max speed
 */
export const RouteStatsPanel = memo(function RouteStatsPanel({
  stats,
  textColor,
  surfaceColor,
  mutedColor,
}: RouteStatsPanelProps) {
  return (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>
      <View style={styles.statItem}>
        <Ionicons name="navigate-outline" size={16} color={mutedColor} />
        <View style={styles.statContent}>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Distance</Text>
          <Text style={[styles.statValue, { color: textColor }]}>
            {formatDistance(stats.totalDistanceKm)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statItem}>
        <Ionicons name="speedometer-outline" size={16} color={mutedColor} />
        <View style={styles.statContent}>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Avg Speed</Text>
          <Text style={[styles.statValue, { color: textColor }]}>
            {formatSpeed(stats.avgSpeedKmh)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statItem}>
        <Ionicons name="flash-outline" size={16} color={mutedColor} />
        <View style={styles.statContent}>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Max Speed</Text>
          <Text style={[styles.statValue, { color: textColor }]}>
            {formatSpeed(stats.maxSpeedKmh)}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 13,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 18,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
  },
});
