import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBar } from "@react-navigation/bottom-tabs";

import { ContextualTabAction } from "@/components/selection/ContextualTabAction";
import {
  TAB_BAR_CONTENT_HEIGHT,
  computeContextualTabGeometry,
} from "@/components/selection/contextualTabGeometry";
import { SELECTION_TAB_ANIM_MS } from "@/components/selection/selectionLabels";
import { useSelectionTabChrome } from "@/context/SelectionTabChromeContext";
import { useAppTheme } from "@/constants/Theme";

export { TAB_BAR_CONTENT_HEIGHT };
/** Re-export for tests / callers. */
export { SELECTION_TAB_ANIM_MS };
const SLIDE_PX = 8;

/**
 * Default bottom tabs, or contextual selection CTA occupying the same frame.
 * Animation is gated on selectionModeActive only — label/count updates do not re-animate.
 */
export function LaneoryTabBar(props: BottomTabBarProps) {
  const { chrome, selectionModeActive } = useSelectionTabChrome();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const geo = computeContextualTabGeometry(insets.bottom);
  const frameH = geo.containerHeight;
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(selectionModeActive ? 1 : 0)).current;
  const [showAction, setShowAction] = useState(selectionModeActive);
  const [displayChrome, setDisplayChrome] = useState(chrome);
  const activeRef = useRef(selectionModeActive);
  activeRef.current = selectionModeActive;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);

  // Content updates without restarting enter/exit animation.
  useEffect(() => {
    if (chrome) setDisplayChrome(chrome);
  }, [chrome]);

  useEffect(() => {
    if (selectionModeActive) setShowAction(true);
    if (reduceMotion) {
      progress.setValue(selectionModeActive ? 1 : 0);
      if (!selectionModeActive) {
        setShowAction(false);
        setDisplayChrome(null);
      }
      return;
    }
    Animated.timing(progress, {
      toValue: selectionModeActive ? 1 : 0,
      duration: SELECTION_TAB_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !activeRef.current) {
        setShowAction(false);
        setDisplayChrome(null);
      }
    });
  }, [selectionModeActive, progress, reduceMotion]);

  const tabsOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const actionOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const tabsY = reduceMotion
    ? 0
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SLIDE_PX],
      });
  const actionY = reduceMotion
    ? 0
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [SLIDE_PX, 0],
      });

  const tabsHidden = selectionModeActive;

  return (
    <View
      style={{
        height: frameH,
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        overflow: "hidden",
      }}
      testID="laneory-tab-bar-frame"
    >
      <Animated.View
        pointerEvents={tabsHidden ? "none" : "auto"}
        accessibilityElementsHidden={tabsHidden}
        importantForAccessibility={tabsHidden ? "no-hide-descendants" : "auto"}
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: tabsOpacity,
            transform: [{ translateY: tabsY }],
          },
        ]}
      >
        <BottomTabBar
          {...props}
          style={{
            backgroundColor: colors.surface,
            borderTopColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: frameH,
            paddingBottom: insets.bottom,
          }}
        />
      </Animated.View>

      {showAction && displayChrome ? (
        <Animated.View
          pointerEvents={tabsHidden ? "auto" : "none"}
          accessibilityElementsHidden={!tabsHidden}
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: actionOpacity,
              transform: [{ translateY: actionY }],
            },
          ]}
        >
          <ContextualTabAction
            tone={displayChrome.kind === "local-delete" ? "danger" : "brand"}
            icon={
              displayChrome.kind === "local-delete"
                ? "trash-outline"
                : "download-outline"
            }
            label={displayChrome.label}
            accessibilityLabel={displayChrome.accessibilityLabel}
            onPress={displayChrome.onPress}
            disabled={displayChrome.disabled}
            busy={displayChrome.busy}
            bottomInset={insets.bottom}
            testID={
              displayChrome.kind === "local-delete"
                ? "selection-tab-delete-bar"
                : "selection-tab-download-bar"
            }
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
