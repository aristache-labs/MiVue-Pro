import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing, Type, useAppTheme } from "@/constants/Theme";

export type ScreenToastTone = "success" | "danger";

export interface ScreenToastProps {
  readonly message: string | undefined;
  readonly tone?: ScreenToastTone;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  /** Success ~2.8s, danger ~4s when omitted. */
  readonly durationMs?: number;
  /** Called when the hold timer expires so the parent can clear `message`. */
  readonly onDismiss?: () => void;
}

const ENTER_MS = 200;
const EXIT_MS = 160;
const ROW_MIN_H = 52;
const ROW_MAX_H = 58;
const SLIDE_DISTANCE = 72;

/**
 * Full-width bottom snackbar — sibling of scroll content, not inside it.
 * Parent owns message state; clear `message` after onDismiss to hide.
 */
export function ScreenToast({
  message,
  tone = "success",
  style,
  testID = "screen-toast",
  durationMs,
  onDismiss,
}: ScreenToastProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState<string | undefined>(undefined);
  const [renderedTone, setRenderedTone] = useState<ScreenToastTone>(tone);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduceMotionRef = useRef(false);
  const announcedRef = useRef<string | undefined>(undefined);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const genRef = useRef(0);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => {
      reduceMotionRef.current = v;
    });
    return () => {
      alive = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = undefined;
    }

    const gen = ++genRef.current;
    const rm = reduceMotionRef.current;

    if (!message) {
      if (!rendered) return;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: rm ? 80 : EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        ...(rm
          ? []
          : [
              Animated.timing(translateY, {
                toValue: SLIDE_DISTANCE,
                duration: EXIT_MS,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
      ]).start(({ finished }) => {
        if (finished && gen === genRef.current) setRendered(undefined);
      });
      return;
    }

    setRendered(message);
    setRenderedTone(tone);
    opacity.setValue(0);
    translateY.setValue(rm ? 0 : SLIDE_DISTANCE);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: rm ? 80 : ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...(rm
        ? []
        : [
            Animated.timing(translateY, {
              toValue: 0,
              duration: ENTER_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
    ]).start();

    if (announcedRef.current !== message) {
      announcedRef.current = message;
      if (Platform.OS !== "android") {
        void AccessibilityInfo.announceForAccessibility(message);
      }
    }

    const hold = durationMs ?? (tone === "danger" ? 4000 : 2800);
    holdTimerRef.current = setTimeout(() => {
      onDismissRef.current?.();
    }, hold);

    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = undefined;
      }
    };
    // Intentionally omit `rendered` — enter/exit driven by `message` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, tone, durationMs, opacity, translateY]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  if (!rendered) return null;

  const fg = renderedTone === "danger" ? colors.danger : colors.success;
  const soft = renderedTone === "danger" ? colors.dangerSoft : colors.successSoft;
  const bg = soft.startsWith("rgba") ? colors.surfaceElevated : soft;
  const icon = renderedTone === "danger" ? "alert-circle" : "checkmark-circle";
  const padBottom = Math.max(insets.bottom, 10);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, style]}
      testID={`${testID}-host`}
    >
      <Animated.View
        pointerEvents="none"
        accessibilityRole="summary"
        accessibilityLiveRegion={Platform.OS === "android" ? "polite" : undefined}
        accessibilityLabel={rendered}
        testID={testID}
        style={[
          styles.toast,
          {
            backgroundColor: bg,
            borderTopColor: fg,
            paddingBottom: padBottom,
            opacity,
            transform: [{ translateY }],
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: -2 },
              },
              android: { elevation: 8 },
              default: {},
            }),
          },
        ]}
      >
        <View style={styles.row}>
          <Ionicons name={icon} size={20} color={fg} style={styles.icon} />
          <Text style={[styles.message, { color: fg }]} numberOfLines={2}>
            {rendered}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    elevation: 8,
  },
  toast: {
    width: "100%",
    borderTopWidth: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  row: {
    minHeight: ROW_MIN_H,
    maxHeight: ROW_MAX_H,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
    gap: 10,
  },
  icon: { flexShrink: 0 },
  message: {
    flex: 1,
    ...Type.bodyStrong,
  },
});
