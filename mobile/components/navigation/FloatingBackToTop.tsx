import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

const SHOW_MS = 170;
const HIDE_MS = 160;

export interface FloatingBackToTopProps {
  readonly visible: boolean;
  readonly tabBarHeight: number;
  readonly onPress: () => void;
  /** When true, skip translate/scale/opacity motion. */
  readonly reduceMotion?: boolean;
}

/**
 * Compact premium “Back to top” pill — floats above the tab bar, outside list layout.
 */
export const FloatingBackToTop = memo(function FloatingBackToTop({
  visible,
  tabBarHeight,
  onPress,
  reduceMotion: reduceMotionProp,
}: FloatingBackToTopProps) {
  const { colors, radius } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const scale = useRef(new Animated.Value(0.97)).current;
  const reduceMotionRef = useRef(false);
  const mountedVisible = useRef(false);

  useEffect(() => {
    if (reduceMotionProp !== undefined) {
      reduceMotionRef.current = reduceMotionProp;
      return;
    }
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => {
      reduceMotionRef.current = v;
    });
    return () => {
      alive = false;
      if (sub && typeof (sub as { remove?: () => void }).remove === "function") {
        (sub as { remove: () => void }).remove();
      }
    };
  }, [reduceMotionProp]);

  useEffect(() => {
    const reduce = reduceMotionRef.current || reduceMotionProp === true;
    if (visible) {
      mountedVisible.current = true;
      if (reduce) {
        opacity.setValue(1);
        translateY.setValue(0);
        scale.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: SHOW_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: SHOW_MS, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: SHOW_MS, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (!mountedVisible.current && !visible) {
      opacity.setValue(0);
      translateY.setValue(8);
      scale.setValue(0.97);
      return;
    }

    if (reduce) {
      opacity.setValue(0);
      translateY.setValue(8);
      scale.setValue(0.97);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: HIDE_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 8, duration: HIDE_MS, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.97, duration: HIDE_MS, useNativeDriver: true }),
    ]).start();
  }, [visible, reduceMotionProp, opacity, translateY, scale]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: tabBarHeight + 12 }]}
    >
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={{
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Back to top"
          accessibilityHint="Scrolls to the beginning of the list"
          hitSlop={HitSlop44}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: radius.pill,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          testID="floating-back-to-top"
        >
          <Ionicons name="arrow-up" size={16} color={colors.brand} />
          <Text style={[styles.label, { color: colors.brand }]}>Back to top</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 40,
    ...Platform.select({
      android: { elevation: 40 },
      ios: {},
      default: {},
    }),
  },
  pill: {
    minWidth: 116,
    maxWidth: 132,
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  label: {
    fontSize: 13,
    fontFamily: Type.fontSemi,
  },
});
