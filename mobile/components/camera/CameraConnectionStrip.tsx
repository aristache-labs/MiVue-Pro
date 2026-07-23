import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { CameraLinkState } from "@/components/camera/cameraLibraryModel";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

interface CameraConnectionStripProps {
  readonly linkState: CameraLinkState;
  readonly modelName?: string;
  readonly refreshing: boolean;
  readonly onConnect: () => void;
  readonly onRetry: () => void;
  readonly onRefresh: () => void;
  readonly onOpenCameraSettings?: () => void;
}

export function CameraConnectionStrip({
  linkState,
  modelName,
  refreshing,
  onConnect,
  onRetry,
  onRefresh,
  onOpenCameraSettings,
}: CameraConnectionStripProps) {
  const { colors, radius } = useAppTheme();

  const status =
    refreshing || linkState === "connecting"
      ? "connecting"
      : linkState === "connected"
        ? "connected"
        : "disconnected";
  const connected = status === "connected";
  const connecting = status === "connecting";
  const disconnected = status === "disconnected";
  const lost = linkState === "connection_lost";

  const label = connected
    ? modelName
      ? `Connected · ${modelName}`
      : "Connected"
    : connecting
      ? "Connecting…"
      : "Disconnected";

  const dotColor = connected ? colors.brand : connecting ? colors.textMuted : colors.warn;
  const showRefresh = connected || lost;
  const showConnect = disconnected && !connecting && !lost;
  const showRetry = lost && !refreshing;

  return (
    <Pressable
      onPress={onOpenCameraSettings}
      disabled={!onOpenCameraSettings}
      accessibilityRole={onOpenCameraSettings ? "button" : undefined}
      accessibilityLabel={label}
      accessibilityHint={onOpenCameraSettings ? "Opens camera settings" : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          opacity: pressed && onOpenCameraSettings ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.left}>
        {connecting ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : (
          <View style={[styles.dot, { backgroundColor: dotColor }]} accessibilityElementsHidden />
        )}
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.right}>
        {showConnect ? (
          <Pressable
            onPress={() => onConnect()}
            accessibilityRole="button"
            accessibilityLabel="Connect"
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.brand, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: colors.brand }]}>Connect</Text>
          </Pressable>
        ) : null}

        {showRetry ? (
          <Pressable
            onPress={() => onRetry()}
            accessibilityRole="button"
            accessibilityLabel="Retry camera connection"
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.action,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Retry</Text>
          </Pressable>
        ) : null}

        {showRefresh ? (
          <Pressable
            onPress={() => onRefresh()}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh camera library"
            accessibilityState={{ busy: refreshing, disabled: refreshing }}
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.iconHit,
              { opacity: refreshing ? 0.5 : pressed ? 0.65 : 1 },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    maxHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  right: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flexShrink: 1, fontSize: 13, fontFamily: Type.fontSemi },
  action: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  actionText: { fontSize: 13, fontFamily: Type.fontSemi },
  iconHit: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
