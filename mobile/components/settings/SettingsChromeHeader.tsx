import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

interface SettingsChromeHeaderProps {
  readonly title: string;
  /** When omitted, no back control is shown (title stays centered). */
  readonly onBack?: () => void;
  /** Label after the chevron. Defaults to “Back”. */
  readonly backLabel?: string;
}

/**
 * Shared stack header — chevron + label (e.g. “‹ Back”), no native iOS capsule.
 * Title is centered on full screen width.
 */
export function SettingsChromeHeader({
  title,
  onBack,
  backLabel = "Back",
}: SettingsChromeHeaderProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
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
            accessibilityLabel={backLabel}
            hitSlop={HitSlop44}
            style={styles.backHit}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text}
              style={styles.headerBackIcon}
            />
            <Text style={[styles.backText, { color: colors.text }]} numberOfLines={1}>
              {backLabel}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.sideSpacer} />
        )}
        <View style={styles.headerFlex} />
        <View
          style={styles.sideSpacer}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
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
  backHit: {
    minHeight: 44,
    minWidth: 72,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "transparent",
  },
  sideSpacer: {
    minWidth: 72,
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
