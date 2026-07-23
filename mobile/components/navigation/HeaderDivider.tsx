import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "@/constants/Theme";

export type HeaderDividerVariant = "screen" | "sheet";

/** Default horizontal inset for sheet variant when the sheet itself is not padded. */
export const HEADER_DIVIDER_SHEET_INSET = 24;

/** Soften borderSoft so screen hairlines stay restrained in both themes. */
export const HEADER_DIVIDER_OPACITY = 0.85;

/**
 * Sheet surfaces need a stronger token — borderSoft disappears on dark elevated sheets.
 * Use colors.border at this opacity for readable contrast without a hard rule.
 */
export const HEADER_DIVIDER_SHEET_OPACITY = 0.9;

export type HeaderDividerProps = {
  readonly variant?: HeaderDividerVariant;
  /** Horizontal inset for sheet variant. Ignored for screen. Default {@link HEADER_DIVIDER_SHEET_INSET}. */
  readonly inset?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
};

/**
 * Decorative hairline between header chrome and content.
 * Screen: edge-to-edge. Sheet: optional horizontal inset.
 */
export function HeaderDivider({
  variant = "screen",
  inset = HEADER_DIVIDER_SHEET_INSET,
  style,
  testID = "header-divider",
}: HeaderDividerProps) {
  const { colors } = useAppTheme();
  const horizontal = variant === "sheet" ? inset : 0;
  const isSheet = variant === "sheet";

  return (
    <View
      accessible={false}
      pointerEvents="none"
      testID={testID}
      style={[
        styles.line,
        {
          backgroundColor: isSheet ? colors.border : colors.borderSoft,
          opacity: isSheet ? HEADER_DIVIDER_SHEET_OPACITY : HEADER_DIVIDER_OPACITY,
          marginHorizontal: horizontal,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
});
