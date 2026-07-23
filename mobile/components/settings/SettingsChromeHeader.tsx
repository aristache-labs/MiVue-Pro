import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

interface SettingsChromeHeaderProps {
  readonly title: string;
  readonly onBack: () => void;
}

/**
 * Custom stack header — icon-only chevron-back, no native iOS capsule.
 * Title is centered on full screen width; sides are symmetric 44×44.
 */
export function SettingsChromeHeader({ title, onBack }: SettingsChromeHeaderProps) {
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
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={HitSlop44}
          style={styles.headerSide}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.text}
            style={styles.headerBackIcon}
          />
        </Pressable>
        <View style={styles.headerFlex} />
        <View
          style={styles.headerSide}
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
  headerSide: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  headerFlex: { flex: 1 },
  headerBackIcon: {
    transform: [{ translateX: -1 }],
  },
  headerTitleAbsolute: {
    ...StyleSheet.absoluteFillObject,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 17,
    lineHeight: 44,
    fontFamily: Type.fontSemi,
  },
});
