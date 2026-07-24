import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  CONTEXTUAL_ACTION_PAD_H,
  CONTEXTUAL_CTA_MAX_WIDTH,
  computeContextualTabGeometry,
} from "@/components/selection/contextualTabGeometry";
import { Type, useAppTheme } from "@/constants/Theme";

export type ContextualTabTone = "danger" | "brand";

export interface ContextualTabActionProps {
  readonly tone: ContextualTabTone;
  readonly icon: "trash-outline" | "download-outline" | "cloud-download-outline";
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  /** Bottom inset from the parent tab frame — height only, never CTA padding. */
  readonly bottomInset: number;
  readonly testID?: string;
}

/**
 * CTA centered in the full tab-bar frame. Container matches normal tab surface;
 * only the button fill uses brand/danger.
 */
export function ContextualTabAction({
  tone,
  icon,
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  busy = false,
  bottomInset,
  testID,
}: ContextualTabActionProps) {
  const { colors, radius } = useAppTheme();
  const geo = computeContextualTabGeometry(bottomInset);
  const isDanger = tone === "danger";
  const fill = isDanger ? colors.danger : colors.brand;
  const onFill = isDanger ? colors.onDanger : colors.onBrand;
  const inactive = disabled || busy;

  return (
    <View
      style={[
        styles.container,
        {
          height: geo.containerHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingLeft: CONTEXTUAL_ACTION_PAD_H,
          paddingRight: CONTEXTUAL_ACTION_PAD_H,
        },
      ]}
      testID={testID ?? `contextual-tab-${tone}`}
    >
      <Pressable
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: inactive, busy }}
        style={({ pressed }) => [
          styles.cta,
          {
            height: geo.buttonHeight,
            minHeight: geo.buttonHeight,
            backgroundColor: fill,
            borderRadius: radius.lg,
            maxWidth: CONTEXTUAL_CTA_MAX_WIDTH,
            opacity: inactive ? 0.45 : pressed ? 0.88 : 1,
          },
        ]}
        testID={testID ? `${testID}-cta` : `contextual-tab-${tone}-cta`}
      >
        <View style={styles.ctaInner} pointerEvents="none">
          {busy ? (
            <ActivityIndicator size="small" color={onFill} />
          ) : (
            <Ionicons name={icon} size={20} color={onFill} />
          )}
          <Text style={[styles.label, { color: onFill }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  cta: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    maxWidth: "100%",
  },
  label: {
    fontSize: 15,
    fontFamily: Type.fontSemi,
    flexShrink: 1,
  },
});
