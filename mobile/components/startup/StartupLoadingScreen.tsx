import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_NAME } from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

export const STARTUP_SUBTITLE = "Your local dashcam library";
export const STARTUP_STATUS_MESSAGE = `Starting ${APP_NAME}…`;
export const STARTUP_LOCAL_NOTE = "Local-first · Your recordings stay on your device.";
export const STARTUP_A11Y_LABEL = `${APP_NAME} is starting`;

const LOGO = require("../../assets/images/android-icon-monochrome.png");

type StartupLoadingScreenProps = {
  readonly onLayout?: (event: LayoutChangeEvent) => void;
};

export function StartupLoadingScreen({ onLayout }: StartupLoadingScreenProps) {
  const { colors, radius, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

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
      <View style={styles.center} accessible={false}>
        <View
          style={[
            styles.logoWrap,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSoft,
              borderRadius: radius.xl,
            },
          ]}
          accessible={false}
        >
          <Image
            source={LOGO}
            style={[styles.logo, { tintColor: colors.brand }]}
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

        <ActivityIndicator
          color={colors.brand}
          style={{ marginTop: spacing.xxxl }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text
          style={[styles.status, { color: colors.textMuted, marginTop: spacing.md }]}
          accessibilityLiveRegion="polite"
          accessible={false}
          maxFontSizeMultiplier={1.3}
        >
          {STARTUP_STATUS_MESSAGE}
        </Text>
      </View>

      <Text
        style={[styles.note, { color: colors.textFaint }]}
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
  logoWrap: {
    width: 88,
    height: 88,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 52,
    height: 52,
    resizeMode: "contain",
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
