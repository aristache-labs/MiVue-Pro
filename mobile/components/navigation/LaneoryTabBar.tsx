import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBar } from "@react-navigation/bottom-tabs";

import type { SelectionTabChromeState } from "@/context/SelectionTabChromeContext";
import { useSelectionTabChrome } from "@/context/SelectionTabChromeContext";
import { Type, useAppTheme } from "@/constants/Theme";

/** Matches React Navigation default tab content height (above safe area). */
export const TAB_BAR_CONTENT_HEIGHT = 49;
/** Tab ↔ action crossfade / slide duration (ms). */
export const SELECTION_TAB_ANIM_MS = 220;
const SLIDE_PX = 8;

function toneFg(
  tone: "brand" | "warn" | "danger",
  colors: ReturnType<typeof useAppTheme>["colors"],
): string {
  switch (tone) {
    case "warn":
      return colors.warn;
    case "danger":
      return colors.danger;
    default:
      return colors.brand;
  }
}

function SelectionActionChrome({
  chrome,
  reduceMotion,
}: {
  readonly chrome: SelectionTabChromeState;
  readonly reduceMotion: boolean;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (chrome.kind === "local-delete") {
    const disabled = Boolean(chrome.deleteDisabled || chrome.deleteBusy);
    return (
      <View
        style={[
          styles.actionRoot,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom,
          },
        ]}
        testID="selection-tab-delete-bar"
        accessibilityElementsHidden={false}
      >
        <Pressable
          onPress={chrome.onDelete}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={
            chrome.deleteAccessibilityLabel ??
            (chrome.selectedCount > 0
              ? `Delete ${chrome.selectedCount} selected items`
              : "Delete")
          }
          accessibilityState={{ disabled, busy: chrome.deleteBusy }}
          style={({ pressed }) => [
            styles.deleteHit,
            {
              opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
          testID="selection-tab-delete"
        >
          {chrome.deleteBusy ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
              <Text style={[styles.deleteLabel, { color: colors.danger }]}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  const actions = chrome.actions ?? [];
  if (actions.length === 0 && chrome.mutedMessage) {
    return (
      <View
        style={[
          styles.actionRoot,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom,
          },
        ]}
        testID="selection-tab-library-bar"
      >
        <Text style={[styles.muted, { color: colors.textMuted }]} numberOfLines={1}>
          {chrome.mutedMessage}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.actionRoot,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
        },
      ]}
      testID="selection-tab-library-bar"
    >
      <View style={styles.libraryRow}>
        {actions.map((action) => {
          const fg = toneFg(action.tone, colors);
          const disabled = Boolean(action.disabled || action.busy);
          return (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              accessibilityHint={action.accessibilityHint}
              accessibilityState={{ disabled, busy: action.busy }}
              style={({ pressed }) => [
                styles.libraryAction,
                { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
              ]}
              testID={`selection-tab-action-${action.key}`}
            >
              {action.busy ? (
                <ActivityIndicator size="small" color={fg} />
              ) : (
                <>
                  <Ionicons name={action.icon} size={20} color={fg} />
                  <Text style={[styles.libraryLabel, { color: fg }]} numberOfLines={1}>
                    {action.label}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Default bottom tabs, or contextual selection actions occupying the same frame.
 */
export function LaneoryTabBar(props: BottomTabBarProps) {
  const { chrome } = useSelectionTabChrome();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const frameH = TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(chrome ? 1 : 0)).current;
  const [showAction, setShowAction] = useState(Boolean(chrome));
  const [displayChrome, setDisplayChrome] = useState(chrome);
  const chromeRef = useRef(chrome);
  chromeRef.current = chrome;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);

  useEffect(() => {
    const active = Boolean(chrome);
    if (chrome) {
      setDisplayChrome(chrome);
      setShowAction(true);
    }
    if (reduceMotion) {
      progress.setValue(active ? 1 : 0);
      if (!active) {
        setShowAction(false);
        setDisplayChrome(null);
      }
      return;
    }
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: SELECTION_TAB_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !chromeRef.current) {
        setShowAction(false);
        setDisplayChrome(null);
      }
    });
  }, [chrome, progress, reduceMotion]);

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

  const tabsHidden = Boolean(chrome);

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
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: actionOpacity,
              transform: [{ translateY: actionY }],
            },
          ]}
        >
          <SelectionActionChrome chrome={displayChrome} reduceMotion={reduceMotion} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRoot: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteHit: {
    minHeight: 44,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  deleteLabel: {
    fontSize: 16,
    fontFamily: Type.fontSemi,
  },
  muted: {
    fontSize: 14,
    fontFamily: Type.fontSemi,
    paddingHorizontal: 16,
  },
  libraryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
    width: "100%",
  },
  libraryAction: {
    flex: 1,
    minHeight: 44,
    maxWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  libraryLabel: {
    fontSize: 14,
    fontFamily: Type.fontSemi,
    flexShrink: 1,
  },
});
