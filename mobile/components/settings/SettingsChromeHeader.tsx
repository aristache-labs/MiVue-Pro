import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderDivider } from "@/components/navigation/HeaderDivider";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

/**
 * Shared stack header — chevron (+ optional label), no native iOS capsule.
 * Title is centered on full screen width.
 * Bar content height is 44; total header height = safe-area top + this bar.
 */
export const SETTINGS_CHROME_HEADER_BAR_H = 44;

interface SettingsChromeHeaderProps {
  readonly title: string;
  /** When omitted, no back control is shown (title stays centered). */
  readonly onBack?: () => void;
  /** Label after the chevron. Defaults to “Back”. Ignored when `showBackLabel` is false. */
  readonly backLabel?: string;
  /** When false, only the chevron is shown (no “Back” text). */
  readonly showBackLabel?: boolean;
  readonly onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Shared stack header — chevron (+ optional label), no native iOS capsule.
 * Title is centered on full screen width.
 */
export function SettingsChromeHeader({
  title,
  onBack,
  backLabel = "Back",
  showBackLabel = true,
  onLayout,
}: SettingsChromeHeaderProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const a11yLabel = showBackLabel ? backLabel : "Back";

  return (
    <View
      onLayout={onLayout}
      style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.bg }]}
    >
      <View style={styles.headerBar}>
        <Text
          pointerEvents="none"
          style={[styles.headerTitleAbsolute, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            hitSlop={HitSlop44}
            style={showBackLabel ? styles.backHitLabeled : styles.backHitIcon}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text}
              style={styles.headerBackIcon}
            />
            {showBackLabel ? (
              <Text style={[styles.backText, { color: colors.text }]} numberOfLines={1}>
                {backLabel}
              </Text>
            ) : null}
          </Pressable>
        ) : (
          <View style={showBackLabel ? styles.sideSpacerWide : styles.sideSpacerIcon} />
        )}
        <View style={styles.headerFlex} />
        <View
          style={showBackLabel ? styles.sideSpacerWide : styles.sideSpacerIcon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <HeaderDivider variant="screen" testID="settings-chrome-header-divider" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { zIndex: 1 },
  headerBar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    position: "relative",
  },
  backHitLabeled: {
    minHeight: 44,
    minWidth: 72,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "transparent",
  },
  backHitIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  sideSpacerWide: {
    minWidth: 72,
    height: 44,
  },
  sideSpacerIcon: {
    width: 44,
    height: 44,
  },
  headerFlex: { flex: 1 },
  headerBackIcon: {
    transform: [{ translateX: -1 }],
  },
  backText: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: Type.font,
  },
  headerTitleAbsolute: {
    ...StyleSheet.absoluteFillObject,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 17,
    lineHeight: 44,
    fontFamily: Type.fontSemi,
    paddingHorizontal: 88,
  },
});
