import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderDivider } from "@/components/navigation/HeaderDivider";
import { Type, useAppTheme } from "@/constants/Theme";

/** Content row height (excluding status-bar / safe-area inset). */
export const TAB_SCREEN_HEADER_ROW_HEIGHT = 56;
/** Side slots keep the title geometrically centered regardless of actions. */
export const TAB_SCREEN_HEADER_SIDE_WIDTH = 112;

export interface TabScreenHeaderProps {
  readonly title: string;
  readonly left?: ReactNode;
  readonly right?: ReactNode;
}

/**
 * Shared native-stack header chrome for Library / Local / Queue / Settings.
 * Title is centered on the screen; left/right actions sit in fixed-width slots.
 */
export function TabScreenHeader({ title, left, right }: TabScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useAppTheme();

  return (
    <View style={{ backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View
        style={[
          styles.row,
          {
            height: TAB_SCREEN_HEADER_ROW_HEIGHT,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <Text
          pointerEvents="none"
          numberOfLines={1}
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
        <View style={[styles.side, styles.sideLeft]} pointerEvents="box-none">
          {left ?? null}
        </View>
        <View style={[styles.side, styles.sideRight]} pointerEvents="box-none">
          {right ?? null}
        </View>
      </View>
      <HeaderDivider variant="screen" testID="tab-screen-header-divider" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: Type.fontBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: "58%",
  },
  side: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: TAB_SCREEN_HEADER_SIDE_WIDTH,
    justifyContent: "center",
  },
  sideLeft: {
    left: 0,
    alignItems: "flex-start",
    paddingLeft: 4,
  },
  sideRight: {
    right: 0,
    alignItems: "flex-end",
    paddingRight: 4,
  },
});
