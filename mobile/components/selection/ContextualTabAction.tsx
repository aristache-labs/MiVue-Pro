import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SELECTION_CTA_H } from "@/components/selection/selectionLabels";
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
  readonly testID?: string;
}

/**
 * Filled CTA centered in the tab-bar frame (above the home indicator).
 */
export function ContextualTabAction({
  tone,
  icon,
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  busy = false,
  testID,
}: ContextualTabActionProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isDanger = tone === "danger";
  const soft = isDanger ? colors.dangerSoft : colors.brandSoft;
  const fill = isDanger ? colors.danger : colors.brand;
  const onFill = isDanger ? colors.onDanger : colors.onBrand;
  const inactive = disabled || busy;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: soft,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          paddingHorizontal: spacing.xl,
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
            backgroundColor: fill,
            borderRadius: radius.lg,
            maxWidth: 420,
            opacity: inactive ? 0.45 : pressed ? 0.88 : 1,
          },
        ]}
        testID={testID ? `${testID}-cta` : `contextual-tab-${tone}-cta`}
      >
        {busy ? (
          <ActivityIndicator size="small" color={onFill} />
        ) : (
          <Ionicons name={icon} size={20} color={onFill} />
        )}
        <Text style={[styles.label, { color: onFill }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  cta: {
    width: "100%",
    minHeight: SELECTION_CTA_H,
    height: SELECTION_CTA_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontFamily: Type.fontSemi,
    flexShrink: 1,
  },
});
