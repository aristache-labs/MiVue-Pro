import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderHandlers,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { HeaderDivider } from "@/components/navigation/HeaderDivider";
import { SheetCloseButton } from "@/components/media/SheetCloseButton";
import { MEDIA_SHEET_PAD_H } from "@/components/media/mediaCardTokens";
import { Type, useAppTheme } from "@/constants/Theme";

export type SheetHeaderProps = {
  readonly title: string;
  readonly leftAction?: ReactNode;
  /** Defaults to SheetCloseButton when onClose is provided. */
  readonly rightAction?: ReactNode;
  readonly onClose?: () => void;
  readonly closeAccessibilityLabel?: string;
  readonly closeDisabled?: boolean;
  readonly showDragHandle?: boolean;
  readonly showDivider?: boolean;
  /** Passed to HeaderDivider sheet inset. */
  readonly dividerInset?: number;
  /** Rendered under the title row and above the divider (e.g. legal draft banner). */
  readonly belowTitle?: ReactNode;
  readonly dragHandleProps?: GestureResponderHandlers;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
};

/**
 * Shared bottom-sheet header chrome — handle, centered title, actions, optional divider.
 * Does not own sheet body / scroll content.
 */
export function SheetHeader({
  title,
  leftAction,
  rightAction,
  onClose,
  closeAccessibilityLabel = "Close",
  closeDisabled = false,
  showDragHandle = true,
  showDivider = true,
  dividerInset = MEDIA_SHEET_PAD_H,
  belowTitle,
  dragHandleProps,
  style,
  testID = "sheet-header",
}: SheetHeaderProps) {
  const { colors } = useAppTheme();

  const right =
    rightAction ??
    (onClose ? (
      <SheetCloseButton
        onPress={onClose}
        accessibilityLabel={closeAccessibilityLabel}
        disabled={closeDisabled}
      />
    ) : (
      <View style={styles.sideSpacer} />
    ));

  return (
    <View style={[styles.root, style]} testID={testID}>
      {showDragHandle ? (
        <View style={styles.handleRow} {...(dragHandleProps ?? {})}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
      ) : null}

      <View style={styles.titleRow} {...(!showDragHandle && dragHandleProps ? dragHandleProps : {})}>
        <View style={[styles.side, styles.sideLeft]}>{leftAction ?? <View style={styles.sideSpacer} />}</View>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>

      {belowTitle ? <View style={styles.belowTitle}>{belowTitle}</View> : null}

      {showDivider ? (
        <HeaderDivider variant="sheet" inset={dividerInset} testID={`${testID}-divider`} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    paddingHorizontal: 4,
  },
  side: {
    width: 72,
    minHeight: 44,
    justifyContent: "center",
  },
  sideLeft: {
    alignItems: "flex-start",
    paddingLeft: 8,
  },
  sideRight: {
    alignItems: "flex-end",
    paddingRight: 4,
  },
  sideSpacer: {
    width: 44,
    height: 44,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: Type.fontBold,
    fontSize: 17,
  },
  belowTitle: {
    paddingHorizontal: MEDIA_SHEET_PAD_H,
    paddingBottom: 12,
  },
});
