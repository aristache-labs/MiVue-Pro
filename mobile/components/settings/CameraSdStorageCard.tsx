import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { CameraSdStorageView } from "@/components/settings/cameraSdStorage";
import { Type, useAppTheme } from "@/constants/Theme";

export interface CameraSdStorageCardProps {
  readonly view: CameraSdStorageView;
}

/**
 * Compact Camera SD capacity summary for Downloads & Storage.
 * Read-only presentation — no CGI from this component.
 */
export function CameraSdStorageCard({ view }: CameraSdStorageCardProps) {
  const { colors, radius } = useAppTheme();
  const showBar = view.kind === "ready" || view.kind === "refreshing";
  const usage = view.usage;
  const refreshing = view.kind === "refreshing";

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={view.accessibilityLabel}
      testID="camera-sd-storage-card"
    >
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          Storage
        </Text>
        <View style={styles.topTrailing}>
          {refreshing ? (
            <ActivityIndicator
              size="small"
              color={colors.textMuted}
              style={styles.refreshSpinner}
            />
          ) : null}
          {view.percentLabel ? (
            <Text
              style={[styles.percent, { color: colors.textMuted }]}
              numberOfLines={1}
              accessibilityElementsHidden
            >
              {view.percentLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <Text
        style={[
          styles.primary,
          {
            color:
              view.kind === "ready" || view.kind === "refreshing"
                ? colors.text
                : colors.textMuted,
          },
        ]}
        numberOfLines={3}
      >
        {view.primaryLabel}
      </Text>

      {showBar && usage ? (
        <View
          style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}
          accessibilityRole="progressbar"
          accessibilityLabel="Camera SD card storage"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: usage.usedPercent,
            text: view.accessibilityLabel,
          }}
          testID="camera-sd-storage-progress"
        >
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(usage.usedPercent, usage.usedPercent > 0 ? usage.usedPercent : 0)}%`,
                backgroundColor: colors.brand,
                borderRadius: radius.sm,
              },
            ]}
          />
        </View>
      ) : view.kind === "loading" ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      ) : null}

      {view.secondaryLabel ? (
        <Text style={[styles.secondary, { color: colors.textMuted }]} numberOfLines={2}>
          {view.secondaryLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 20,
  },
  topTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  refreshSpinner: {
    transform: [{ scale: 0.85 }],
  },
  title: {
    fontSize: 15,
    fontFamily: Type.fontSemi,
    flexShrink: 1,
  },
  percent: {
    fontSize: 13,
    fontFamily: Type.monoMed,
    fontVariant: ["tabular-nums"],
  },
  primary: {
    fontSize: 14,
    fontFamily: Type.font,
    lineHeight: 20,
  },
  secondary: {
    fontSize: 12,
    fontFamily: Type.font,
    lineHeight: 16,
  },
  track: {
    height: 7,
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: 7,
  },
  loadingRow: {
    minHeight: 20,
    justifyContent: "center",
    alignItems: "flex-start",
  },
});
