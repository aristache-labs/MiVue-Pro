import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Type, useAppTheme } from "@/constants/Theme";

/** Matches Local “Delete local” selection strip height. */
export const SELECTION_ACTION_BAND_H = 44;

export type SelectionActionTone = "brand" | "danger" | "warn" | "muted";

type IonName = ComponentProps<typeof Ionicons>["name"];

export interface SelectionActionItem {
  readonly key: string;
  readonly tone: Exclude<SelectionActionTone, "muted">;
  readonly icon?: IonName;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly busy?: boolean;
}

export interface SelectionActionBandProps {
  /** When false, band collapses to zero height (unless animated `style` drives height). */
  readonly visible: boolean;
  readonly actions?: readonly SelectionActionItem[];
  /** Non-interactive message when nothing is actionable (e.g. Already downloaded). */
  readonly mutedMessage?: string;
  /** Optional animated / override wrap style (Local height animation). */
  readonly style?: StyleProp<ViewStyle> | Animated.WithAnimatedValue<ViewStyle>;
  readonly testID?: string;
}

function toneColors(
  tone: SelectionActionTone,
  colors: ReturnType<typeof useAppTheme>["colors"],
): { bg: string; fg: string } {
  switch (tone) {
    case "brand":
      return { bg: colors.brandSoft, fg: colors.brand };
    case "danger":
      return { bg: colors.dangerSoft, fg: colors.danger };
    case "warn":
      return { bg: colors.warnSoft, fg: colors.warn };
    case "muted":
    default:
      return { bg: colors.surfaceMuted, fg: colors.textMuted };
  }
}

/**
 * Inline selection toolbar under Filters/Sort — shared by Library and Local.
 * Full-width contextual band (not a floating card over the list).
 */
export function SelectionActionBand({
  visible,
  actions = [],
  mutedMessage,
  style,
  testID,
}: SelectionActionBandProps) {
  const { colors } = useAppTheme();
  const actionable = actions;
  const showMuted = visible && actionable.length === 0 && Boolean(mutedMessage);
  const showActions = visible && actionable.length > 0;
  const animatedHost = Boolean(style);

  if (!visible && !animatedHost) {
    return null;
  }

  const multi = actionable.length > 1;

  return (
    <Animated.View
      testID={testID}
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.wrap,
        {
          borderBottomColor: colors.border,
          height: animatedHost ? undefined : visible ? SELECTION_ACTION_BAND_H : 0,
          opacity: animatedHost ? undefined : visible ? 1 : 0,
        },
        !showActions && showMuted
          ? { backgroundColor: toneColors("muted", colors).bg }
          : null,
        showActions && actionable.length === 1
          ? { backgroundColor: toneColors(actionable[0]!.tone, colors).bg }
          : null,
        showActions && multi ? { backgroundColor: colors.surface } : null,
        style as StyleProp<ViewStyle>,
      ]}
    >
      {showMuted ? (
        <View style={styles.single}>
          <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
            {mutedMessage}
          </Text>
        </View>
      ) : null}

      {showActions && !multi ? <ActionHalf item={actionable[0]!} fullWidth /> : null}

      {showActions && multi ? (
        <View style={styles.row}>
          {actionable.map((item, index) => (
            <View key={item.key} style={styles.segment}>
              {index > 0 ? (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              ) : null}
              <ActionHalf item={item} compact={actionable.length >= 3} />
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function ActionHalf({
  item,
  fullWidth = false,
  compact = false,
}: {
  readonly item: SelectionActionItem;
  readonly fullWidth?: boolean;
  readonly compact?: boolean;
}) {
  const { colors } = useAppTheme();
  const tone = toneColors(item.tone, colors);

  return (
    <Pressable
      onPress={item.onPress}
      disabled={item.disabled || item.busy}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityHint={item.accessibilityHint}
      style={({ pressed }) => [
        fullWidth ? styles.single : styles.half,
        {
          backgroundColor: tone.bg,
          opacity: item.busy || item.disabled ? 0.7 : pressed ? 0.75 : 1,
          minHeight: SELECTION_ACTION_BAND_H,
        },
      ]}
    >
      {item.busy ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : (
        <>
          {item.icon ? (
            <Ionicons
              name={item.icon}
              size={compact ? 14 : 16}
              color={tone.fg}
              style={{ marginRight: compact ? 4 : 8 }}
            />
          ) : null}
          <Text
            style={[styles.label, compact ? styles.labelCompact : null, { color: tone.fg }]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
    width: "100%",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: SELECTION_ACTION_BAND_H,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    minWidth: 0,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  single: {
    height: SELECTION_ACTION_BAND_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  half: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    minWidth: 0,
  },
  label: {
    fontFamily: Type.fontBold,
    fontSize: 14,
    flexShrink: 1,
  },
  labelCompact: {
    fontSize: 12,
  },
});
