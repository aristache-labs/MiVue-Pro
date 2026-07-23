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

import { Radius, Spacing, Type, useAppTheme } from "@/constants/Theme";

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
const SLIDE_DISTANCE = 28;

/**
 * Floating bottom confirmation snackbar — sibling of scroll content, not inside it.
 * Matches Laneory cards: elevated surface, soft icon chip, readable primary text.
 */
export function ScreenToast({
  message,
  tone = "success",
  style,
  testID = "screen-toast",
  durationMs,
  onDismiss,
}: ScreenToastProps) {
  const { colors, scheme } = useAppTheme();
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

  const accent = renderedTone === "danger" ? colors.danger : colors.success;
  const soft = renderedTone === "danger" ? colors.dangerSoft : colors.successSoft;
  const icon = renderedTone === "danger" ? "alert-circle" : "checkmark-circle";
  const bottom = Math.max(insets.bottom, Spacing.sm) + Spacing.sm;

  // Elevated card + soft tint — readable over dark settings cards.
  const cardBg =
    scheme === "dark"
      ? colors.surfaceElevated
      : soft.startsWith("rgba")
        ? colors.surfaceElevated
        : soft;
  const borderColor =
    scheme === "dark"
      ? renderedTone === "danger"
        ? "rgba(248, 113, 113, 0.42)"
        : "rgba(74, 222, 128, 0.38)"
      : renderedTone === "danger"
        ? colors.danger
        : colors.success;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom }, style]}
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
            backgroundColor: cardBg,
            borderColor,
            opacity,
            transform: [{ translateY }],
            ...Platform.select({
              ios: {
                shadowColor: "#0f172a",
                shadowOpacity: scheme === "dark" ? 0.45 : 0.16,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
              },
              android: { elevation: 10 },
              default: {},
            }),
          },
        ]}
      >
        <View style={[styles.iconChip, { backgroundColor: soft }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {rendered}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 40,
    elevation: 12,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  message: {
    flex: 1,
    ...Type.bodyStrong,
    letterSpacing: -0.1,
  },
});
