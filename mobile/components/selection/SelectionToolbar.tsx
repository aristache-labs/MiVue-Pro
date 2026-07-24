import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  SELECTION_TOOLBAR_ANIM_MS,
  SELECTION_TOOLBAR_H,
} from "@/components/selection/selectionLabels";
import {
  selectAllCheckState,
} from "@/components/local/localLibrarySelection";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

const SLIDE_PX = 8;

export interface SelectionToolbarProps {
  readonly visible: boolean;
  readonly selectedCount: number;
  readonly filteredCount: number;
  readonly allSelected: boolean;
  readonly onClose: () => void;
  readonly onToggleSelectAll: () => void;
  readonly selectAllAccessibilityLabel: string;
  readonly testID?: string;
}

/**
 * Coherent Select all / X toolbar under the date separator.
 * Animates only on selection-mode enter/exit — not on count changes.
 */
export function SelectionToolbar({
  visible,
  selectedCount,
  filteredCount,
  allSelected,
  onClose,
  onToggleSelectAll,
  selectAllAccessibilityLabel,
  testID = "selection-toolbar",
}: SelectionToolbarProps) {
  const { colors, spacing, radius } = useAppTheme();
  const selectAllDisabled = filteredCount === 0;
  const checkState = selectAllCheckState(selectedCount, filteredCount);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (visible) setMounted(true);
    if (reduceMotion) {
      progress.setValue(visible ? 1 : 0);
      if (!visible) setMounted(false);
      return;
    }
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: SELECTION_TOOLBAR_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !visibleRef.current) setMounted(false);
    });
  }, [visible, progress, reduceMotion]);

  if (!mounted) return null;

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SELECTION_TOOLBAR_H + 8],
  });
  const opacity = progress;
  const translateY = reduceMotion
    ? 0
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-SLIDE_PX, 0],
      });

  const checkIcon =
    checkState === "checked"
      ? ("checkmark" as const)
      : checkState === "indeterminate"
        ? ("remove" as const)
        : ("square-outline" as const);

  return (
    <Animated.View
      style={[styles.clip, { height, opacity, overflow: "hidden" }]}
      testID={testID}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
    >
      <Animated.View
        style={[
          styles.pad,
          {
            paddingHorizontal: spacing.lg,
            transform: [{ translateY }],
          },
        ]}
      >
        <View
          style={[
            styles.bar,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSoft,
              borderRadius: radius.lg,
            },
          ]}
          accessibilityRole="summary"
          accessibilityLabel="Selection mode"
        >
          <Pressable
            onPress={onToggleSelectAll}
            disabled={selectAllDisabled}
            accessibilityRole="checkbox"
            accessibilityLabel={
              allSelected ? "Deselect all" : selectAllAccessibilityLabel
            }
            accessibilityHint={
              allSelected
                ? "Clears the current selection"
                : "Selects all files in the filtered list"
            }
            accessibilityState={{
              disabled: selectAllDisabled,
              checked:
                checkState === "checked"
                  ? true
                  : checkState === "indeterminate"
                    ? "mixed"
                    : false,
            }}
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.selectAllHit,
              { opacity: selectAllDisabled ? 0.4 : pressed ? 0.65 : 1 },
            ]}
            testID="selection-toolbar-select-all"
          >
            <View
              style={[
                styles.checkBox,
                {
                  borderColor:
                    checkState === "unchecked" ? colors.textMuted : colors.brand,
                  backgroundColor:
                    checkState === "unchecked" ? "transparent" : colors.brandSoft,
                },
              ]}
            >
              {checkState !== "unchecked" ? (
                <Ionicons
                  name={checkIcon}
                  size={checkState === "indeterminate" ? 14 : 16}
                  color={colors.brand}
                />
              ) : null}
            </View>
            <Text style={[styles.selectAllLabel, { color: colors.brand }]} numberOfLines={1}>
              Select all
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Exit selection mode"
            accessibilityHint="Clears the selection and exits selection mode"
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.closeHit,
              { opacity: pressed ? 0.65 : 1 },
            ]}
            testID="selection-toolbar-close"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    width: "100%",
  },
  pad: {
    width: "100%",
    paddingTop: 4,
    paddingBottom: 4,
  },
  bar: {
    height: SELECTION_TOOLBAR_H,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  selectAllHit: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  closeHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  selectAllLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Type.fontSemi,
  },
});
