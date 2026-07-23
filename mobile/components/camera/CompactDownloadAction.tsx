import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { remoteDownloadActionA11y } from "@/components/camera/remoteDownloadA11y";
import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";
import { MEDIA_ACTION_HIT } from "@/components/media/mediaCardTokens";
import { Type, useAppTheme } from "@/constants/Theme";

interface CompactDownloadActionProps {
  readonly fileName: string;
  readonly state: RemoteDownloadUiState;
  readonly onPress: () => void;
  /**
   * When true, status remains visible but is not focusable or pressable
   * (parent selection card owns the tap).
   */
  readonly inert?: boolean;
}

/**
 * Compact right-column download control.
 * Available/failed: icon + "Download"/"Retry" chip (~36–40h) inside ≥44 hit area.
 */
export const CompactDownloadAction = memo(function CompactDownloadAction({
  fileName,
  state,
  onPress,
  inert = false,
}: CompactDownloadActionProps) {
  const { colors } = useAppTheme();
  const label = remoteDownloadActionA11y(fileName, state);
  const interactive =
    !inert &&
    (state.kind === "available" ||
      state.kind === "failed" ||
      state.kind === "downloaded" ||
      state.kind === "paused");

  const tone =
    state.kind === "downloaded"
      ? colors.success
      : state.kind === "failed"
        ? colors.danger
        : state.kind === "paused"
          ? colors.warn
          : colors.brand;

  const content = (
    <>
      {state.kind === "available" || state.kind === "failed" ? (
        <View
          style={[
            styles.downloadChip,
            {
              borderColor: tone,
              backgroundColor: colors.brandSoft,
            },
          ]}
        >
          <Ionicons
            name={state.kind === "failed" ? "refresh" : "download-outline"}
            size={16}
            color={tone}
          />
          <Text style={[styles.downloadText, { color: tone }]} numberOfLines={1}>
            {state.kind === "failed" ? "Retry" : "Download"}
          </Text>
        </View>
      ) : null}
      {state.kind === "downloaded" ? (
        inert ? (
          <View
            style={[
              styles.downloadedBadge,
              { backgroundColor: colors.successSoft, borderColor: colors.success },
            ]}
          >
            <Ionicons name="cloud-done-outline" size={12} color={tone} />
            <Text style={[styles.downloadedText, { color: tone }]} numberOfLines={1}>
              Downloaded
            </Text>
          </View>
        ) : (
          <View style={[styles.checkWrap, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="checkmark" size={18} color={tone} />
          </View>
        )
      ) : null}
      {state.kind === "paused" ? <Ionicons name="pause" size={20} color={tone} /> : null}
      {state.kind === "downloading" ? (
        <View style={styles.progressWrap} accessibilityElementsHidden>
          <ActivityIndicator size="small" color={tone} />
          <Text style={[styles.pct, { color: tone }]}>{state.percent}%</Text>
        </View>
      ) : null}
      {state.kind === "queued" ? (
        <View
          style={[styles.queueBadge, { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}
        >
          <Ionicons name="list" size={12} color={colors.brand} />
          <Text style={[styles.queueText, { color: colors.brand }]}>
            {state.position > 0 ? `#${state.position}` : "#"}
          </Text>
        </View>
      ) : null}
    </>
  );

  if (inert) {
    return (
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.hit}
        testID="compact-download-action"
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={(e) => {
        e?.stopPropagation?.();
        if (interactive) onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !interactive }}
      disabled={!interactive}
      hitSlop={4}
      style={({ pressed }) => [
        styles.hit,
        { opacity: pressed && interactive ? 0.7 : 1 },
      ]}
      testID="compact-download-action"
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hit: {
    minWidth: MEDIA_ACTION_HIT,
    minHeight: MEDIA_ACTION_HIT,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  downloadChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 88,
    maxWidth: 100,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  downloadText: { fontSize: 12, fontFamily: Type.fontSemi },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 88,
    maxWidth: 104,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  downloadedText: { fontSize: 11, fontFamily: Type.fontSemi },
  progressWrap: { alignItems: "center", justifyContent: "center", gap: 1 },
  pct: { fontSize: 9, fontFamily: Type.monoMed, lineHeight: 11 },
  queueBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    flexDirection: "row",
    gap: 2,
  },
  queueText: { fontSize: 11, fontFamily: Type.fontSemi },
});
