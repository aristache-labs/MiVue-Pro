import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/constants/Theme";

/**
 * Original Laneory "capsule" loader: a pill that eases from a dot into a full
 * bar and back, crawling left-to-right and looping seamlessly. Reinterprets
 * the common elastic/liquid loading-indicator pattern seen on component
 * galleries such as Uiverse.io — no HTML, CSS or component code was reused;
 * this is an independent React Native + Animated implementation using only
 * Laneory theme tokens.
 */

const TRACK_WIDTH = 96;
const CAPSULE_HEIGHT = 12;
const DOT_FRACTION = CAPSULE_HEIGHT / TRACK_WIDTH;
const EDGE_SHIFT = (TRACK_WIDTH * (1 - DOT_FRACTION)) / 2;
const CYCLE_MS = 2200;

const PROGRESS_STOPS = [0, 0.25, 0.5, 0.75, 1];
const SCALE_STOPS = [DOT_FRACTION, 1, DOT_FRACTION, 1, DOT_FRACTION];
const SHIFT_STOPS = [-EDGE_SHIFT, 0, EDGE_SHIFT, 0, -EDGE_SHIFT];

export function LaneoryCapsuleLoader() {
  const { colors } = useAppTheme();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    if (reduceMotion) {
      loopRef.current?.stop();
      progress.setValue(0);
      return;
    }

    progress.setValue(0);
    loopRef.current = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: CYCLE_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loopRef.current.start();

    return () => {
      loopRef.current?.stop();
    };
  }, [reduceMotion, progress]);

  const scaleX = progress.interpolate({ inputRange: PROGRESS_STOPS, outputRange: SCALE_STOPS });
  const translateX = progress.interpolate({ inputRange: PROGRESS_STOPS, outputRange: SHIFT_STOPS });

  return (
    <View style={styles.root} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[styles.pill, { backgroundColor: colors.borderSoft }]} />
      <Animated.View
        style={[
          styles.pill,
          styles.fill,
          {
            backgroundColor: colors.brandStrong,
            transform: [{ translateX }, { scaleX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: TRACK_WIDTH,
    height: CAPSULE_HEIGHT,
    justifyContent: "center",
  },
  pill: {
    width: TRACK_WIDTH,
    height: CAPSULE_HEIGHT,
    borderRadius: CAPSULE_HEIGHT / 2,
  },
  fill: {
    position: "absolute",
  },
});
