import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { useAppTheme } from "@/constants/Theme";

/** Space between the circular control and the top edge of the tab bar. */
export const BACK_TO_TOP_TAB_GAP = 10;

const SHOW_MS = 180;
const HIDE_MS = 140;
const SIZE = 48;

export interface FloatingBackToTopProps {
  readonly visible: boolean;
  readonly onPress: () => void;
  /** When true, skip translate/scale/opacity motion. */
  readonly reduceMotion?: boolean;
  /**
   * @deprecated Unused. Screen content already ends above the tab bar;
   * absolute `bottom` is {@link BACK_TO_TOP_TAB_GAP} only (tabBarHeight must not be added again).
   */
  readonly tabBarHeight?: number;
}

/**
 * Compact circular “Back to top” control — floats just above the tab bar, outside list layout.
 *
 * Position: `bottom: BACK_TO_TOP_TAB_GAP` (10). Parent tab scenes end at the tab-bar top edge,
 * so `tabBarHeight` must not be included in this offset.
 */
export const FloatingBackToTop = memo(function FloatingBackToTop({
  visible,
  onPress,
  reduceMotion: reduceMotionProp,
}: FloatingBackToTopProps) {
  const { colors, scheme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const entranceScale = useRef(new Animated.Value(0.84)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const arrowY = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(false);
  const mountedVisible = useRef(false);

  const surfaceBg =
    scheme === "dark" ? "rgba(20, 184, 166, 0.22)" : colors.brandSoft;
  const surfaceBorder =
    scheme === "dark" ? "rgba(45, 212, 191, 0.52)" : colors.brand;

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
        entranceScale.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: SHOW_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: SHOW_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(entranceScale, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!mountedVisible.current && !visible) {
      opacity.setValue(0);
      translateY.setValue(10);
      entranceScale.setValue(0.84);
      return;
    }

    if (reduce) {
      opacity.setValue(0);
      translateY.setValue(6);
      entranceScale.setValue(0.9);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: HIDE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 6,
        duration: HIDE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(entranceScale, {
        toValue: 0.9,
        duration: HIDE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, reduceMotionProp, opacity, translateY, entranceScale]);

  const onPressIn = () => {
    if (reduceMotionRef.current || reduceMotionProp === true) return;
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 0.91, duration: 90, useNativeDriver: true }),
      Animated.timing(arrowY, { toValue: -2, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  const onPressOut = () => {
    if (reduceMotionRef.current || reduceMotionProp === true) {
      pressScale.setValue(1);
      arrowY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(arrowY, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: BACK_TO_TOP_TAB_GAP }]}>
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={{
          opacity,
          transform: [{ translateY }, { scale: entranceScale }],
        }}
      >
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <Pressable
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            accessibilityRole="button"
            accessibilityLabel="Back to top"
            accessibilityHint="Scrolls to the beginning of the list"
            hitSlop={6}
            style={[
              styles.circle,
              {
                backgroundColor: surfaceBg,
                borderColor: surfaceBorder,
              },
            ]}
            testID="floating-back-to-top"
          >
            <Animated.View style={{ transform: [{ translateY: arrowY }] }}>
              <Ionicons name="arrow-up" size={22} color={colors.brand} />
            </Animated.View>
          </Pressable>
        </Animated.View>
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
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 5,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
});
