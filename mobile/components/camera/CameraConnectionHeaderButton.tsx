import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import type { CameraLinkState } from "@/components/camera/cameraLibraryModel";
import { visibleConnectionStatus } from "@/components/settings/settingsSummaries";
import { HitSlop44, useAppTheme } from "@/constants/Theme";

interface CameraConnectionHeaderButtonProps {
  readonly linkState: CameraLinkState;
  readonly refreshing?: boolean;
  readonly onPress: () => void;
}

function a11yFor(
  status: ReturnType<typeof visibleConnectionStatus>,
  refreshing: boolean,
): {
  label: string;
  hint?: string;
  disabled: boolean;
} {
  if (refreshing || status === "connecting") {
    return { label: "Connecting to camera", disabled: true };
  }
  switch (status) {
    case "connected":
      return {
        label: "Camera connected",
        hint: "Opens camera connection details",
        disabled: false,
      };
    default:
      return {
        label: "Camera disconnected",
        hint: "Opens camera connection options",
        disabled: false,
      };
  }
}

/**
 * Compact Library header control — replaces Settings gear.
 * Icon ~22–24pt inside ≥44×44 hit target; state is not color-only.
 */
export function CameraConnectionHeaderButton({
  linkState,
  refreshing = false,
  onPress,
}: CameraConnectionHeaderButtonProps) {
  const { colors } = useAppTheme();
  const status = visibleConnectionStatus(linkState);
  const busy = refreshing || status === "connecting";
  const { label, hint, disabled } = a11yFor(status, refreshing);

  const iconName: keyof typeof Ionicons.glyphMap =
    status === "connected" ? "videocam" : "videocam-off";

  const badgeColor =
    status === "connected" ? colors.brand : status === "connecting" ? colors.textMuted : colors.warn;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled && busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ busy, disabled: busy }}
      hitSlop={HitSlop44}
      style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.65 : busy ? 0.85 : 1 }]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : (
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={22} color={colors.text} />
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor,
                borderColor: colors.bg,
              },
            ]}
            accessibilityElementsHidden
          >
            {status === "connected" ? (
              <Ionicons name="checkmark" size={8} color={colors.onBrand} />
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
