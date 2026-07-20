import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { remoteDownloadActionA11y } from "@/components/camera/remoteDownloadA11y";
import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";
import { mediaCardActionHitStyle } from "@/components/media/MediaCard";
import { Type, useAppTheme } from "@/constants/Theme";

interface CompactDownloadActionProps {
  readonly fileName: string;
  readonly state: RemoteDownloadUiState;
  readonly onPress: () => void;
}

/**
 * Compact right-column download control (icon / #queue / spinner / check).
 * Hit area ≥44×44; glyph ~20–22.
 */
export const CompactDownloadAction = memo(function CompactDownloadAction({
  fileName,
  state,
  onPress,
}: CompactDownloadActionProps) {
  const { colors } = useAppTheme();
  const label = remoteDownloadActionA11y(fileName, state);
  const interactive =
    state.kind === "available" ||
    state.kind === "failed" ||
    state.kind === "downloaded" ||
    state.kind === "paused";

  const tone =
    state.kind === "downloaded"
      ? colors.success
      : state.kind === "failed"
        ? colors.danger
        : state.kind === "paused"
          ? colors.warn
          : colors.brand;

  return (
    <Pressable
      onPress={(e) => {
        // Prevent bubbling to card body when nested.
        e?.stopPropagation?.();
        if (interactive || state.kind === "queued" || state.kind === "downloading") {
          onPress();
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: state.kind === "queued" || state.kind === "downloading" }}
      disabled={state.kind === "queued" || state.kind === "downloading"}
      hitSlop={4}
      style={({ pressed }) => [
        mediaCardActionHitStyle,
        { opacity: pressed && interactive ? 0.65 : 1 },
      ]}
      testID="compact-download-action"
    >
      {state.kind === "available" ? (
        <Ionicons name="download-outline" size={22} color={tone} />
      ) : null}
      {state.kind === "failed" ? (
        <Ionicons name="refresh" size={22} color={tone} />
      ) : null}
      {state.kind === "downloaded" ? (
        <View style={[styles.checkWrap, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark" size={18} color={tone} />
        </View>
      ) : null}
      {state.kind === "paused" ? (
        <Ionicons name="pause" size={20} color={tone} />
      ) : null}
      {state.kind === "downloading" ? (
        <View style={styles.progressWrap} accessibilityElementsHidden>
          <ActivityIndicator size="small" color={tone} />
          <Text style={[styles.pct, { color: tone }]}>{state.percent}%</Text>
        </View>
      ) : null}
      {state.kind === "queued" ? (
        <View style={[styles.queueBadge, { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}>
          <Text style={[styles.queueText, { color: colors.brand }]}>
            {state.position > 0 ? `#${state.position}` : "#"}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { alignItems: "center", justifyContent: "center", gap: 1 },
  pct: { fontSize: 9, fontFamily: Type.monoMed, lineHeight: 11 },
  queueBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  queueText: { fontSize: 12, fontFamily: Type.fontSemi },
});
