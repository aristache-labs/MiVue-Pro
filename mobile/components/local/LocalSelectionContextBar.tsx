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
  LOCAL_SELECTION_CONTEXT_ANIM_MS,
  localSelectedCountLabel,
  selectAllCheckState,
} from "@/components/local/localLibrarySelection";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

export const LOCAL_SELECTION_CONTEXT_H = 46;
const SLIDE_PX = 8;

export interface LocalSelectionContextBarProps {
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
 * Selection chrome below the date separator: Select all | N selected | X.
 */
export function LocalSelectionContextBar({
  visible,
  selectedCount,
  filteredCount,
  allSelected,
  onClose,
  onToggleSelectAll,
  selectAllAccessibilityLabel,
  testID = "local-selection-context-bar",
}: LocalSelectionContextBarProps) {
  const { colors, spacing } = useAppTheme();
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
      duration: LOCAL_SELECTION_CONTEXT_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !visibleRef.current) setMounted(false);
    });
  }, [visible, progress, reduceMotion]);

  if (!mounted) return null;

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOCAL_SELECTION_CONTEXT_H],
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
      style={[
        styles.clip,
        {
          height,
          opacity,
          borderBottomColor: colors.borderSoft,
          overflow: "hidden",
        },
      ]}
      testID={testID}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
    >
      <Animated.View
        style={[
          styles.inner,
          {
            paddingHorizontal: spacing.lg,
            transform: [{ translateY }],
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`Selection mode. ${localSelectedCountLabel(selectedCount)}`}
      >
        <Text
          pointerEvents="none"
          style={[styles.count, { color: colors.text }]}
          numberOfLines={1}
        >
          {localSelectedCountLabel(selectedCount)}
        </Text>

        <View style={styles.row}>
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
            testID="local-selection-select-all"
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

          <View style={styles.centerSpacer} />

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Exit selection mode"
            accessibilityHint="Clears the selection and exits selection mode"
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.sideHit,
              { opacity: pressed ? 0.65 : 1 },
            ]}
            testID="local-selection-close"
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    height: LOCAL_SELECTION_CONTEXT_H,
    width: "100%",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: LOCAL_SELECTION_CONTEXT_H,
  },
  count: {
    ...StyleSheet.absoluteFillObject,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 15,
    lineHeight: LOCAL_SELECTION_CONTEXT_H,
    fontFamily: Type.fontSemi,
    zIndex: 0,
  },
  sideHit: {
    minWidth: LOCAL_SELECTION_CONTEXT_H,
    minHeight: LOCAL_SELECTION_CONTEXT_H,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  centerSpacer: {
    flex: 1,
    minWidth: 0,
  },
  selectAllHit: {
    minHeight: LOCAL_SELECTION_CONTEXT_H,
    minWidth: LOCAL_SELECTION_CONTEXT_H,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
    zIndex: 1,
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
