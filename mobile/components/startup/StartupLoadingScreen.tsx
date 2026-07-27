import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { LaneoryCapsuleLoader } from "@/components/startup/LaneoryCapsuleLoader";
import { APP_NAME } from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

export const STARTUP_SUBTITLE = "Your local dashcam library";
export const STARTUP_STATUS_MESSAGE = `Starting ${APP_NAME}…`;
export const STARTUP_LOCAL_NOTE = "Local-first · Your recordings stay on your device.";
export const STARTUP_A11Y_LABEL = `${APP_NAME} is starting`;

const LOGO = require("../../assets/brand/laneory-mark-icon.png");
/** Trimmed mark is landscape — keep explicit height so RN never falls back to raw pixel size. */
const LOGO_WIDTH = 88;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH * (590 / 1037));
const DARK_LOGO_OUTLINE_WIDTH = 96;
const DARK_LOGO_OUTLINE_HEIGHT = Math.round(DARK_LOGO_OUTLINE_WIDTH * (590 / 1037));
const ENTRANCE_MS = 400;
const ENTRANCE_OFFSET = 8;

type StartupLoadingScreenProps = {
  readonly onLayout?: (event: LayoutChangeEvent) => void;
};

export function StartupLoadingScreen({ onLayout }: StartupLoadingScreenProps) {
  const { colors, scheme, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(ENTRANCE_OFFSET)).current;

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!alive) return;
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ENTRANCE_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ENTRANCE_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      alive = false;
    };
    // Runs once on mount — entrance plays a single time regardless of re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        },
      ]}
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityLabel={STARTUP_A11Y_LABEL}
      accessibilityLiveRegion="polite"
      accessible
    >
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.block,
            { opacity, transform: [{ translateY }] },
          ]}
          accessible={false}
        >
          <View style={styles.logoStage} accessible={false}>
            {scheme === "dark" ? (
              <Image
                source={LOGO}
                style={[
                  styles.darkLogoOutline,
                  {
                    width: DARK_LOGO_OUTLINE_WIDTH,
                    height: DARK_LOGO_OUTLINE_HEIGHT,
                    tintColor: colors.brandStrong,
                  },
                ]}
                resizeMode="contain"
                accessible={false}
                importantForAccessibility="no"
              />
            ) : null}
            <Image
              source={LOGO}
              style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
              resizeMode="contain"
              accessible={false}
              importantForAccessibility="no"
            />
          </View>

          <Text
            style={[Type.largeTitle, styles.title, { color: colors.text, marginTop: spacing.xl }]}
            maxFontSizeMultiplier={1.35}
            accessible={false}
          >
            {APP_NAME}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textMuted, marginTop: spacing.sm }]}
            maxFontSizeMultiplier={1.3}
            accessible={false}
          >
            {STARTUP_SUBTITLE}
          </Text>

          <View style={{ marginTop: spacing.xxxl }} accessible={false}>
            <LaneoryCapsuleLoader />
          </View>
          <Text
            style={[styles.status, { color: colors.textMuted, marginTop: spacing.md }]}
            accessibilityLiveRegion="polite"
            accessible={false}
            maxFontSizeMultiplier={1.3}
          >
            {STARTUP_STATUS_MESSAGE}
          </Text>
        </Animated.View>
      </View>

      <Text
        style={[styles.note, { color: colors.textMuted }]}
        maxFontSizeMultiplier={1.25}
        accessible={false}
      >
        {STARTUP_LOCAL_NOTE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  block: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  logoStage: {
    width: DARK_LOGO_OUTLINE_WIDTH,
    height: DARK_LOGO_OUTLINE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  darkLogoOutline: {
    position: "absolute",
    opacity: 0.22,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    fontSize: Type.body.fontSize,
    lineHeight: Type.body.lineHeight,
    fontFamily: Type.font,
    textAlign: "center",
  },
  status: {
    fontSize: Type.bodyStrong.fontSize,
    lineHeight: Type.bodyStrong.lineHeight,
    fontFamily: Type.fontSemi,
    textAlign: "center",
  },
  note: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontFamily: Type.font,
    textAlign: "center",
  },
});
