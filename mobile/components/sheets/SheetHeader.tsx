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

/** Compact sheet chrome — default for all bottom sheets. */
export const SHEET_HEADER_COMPACT = true;

/** Top inset above handle / title row (px). */
export const SHEET_HEADER_HANDLE_TOP = 8;
/** Gap from handle to title row (px). */
export const SHEET_HEADER_HANDLE_TO_ROW = 5;
/** Fixed title-row height (px). Touch targets stay ≥44 via hitSlop, not layout growth. */
export const SHEET_HEADER_ROW_HEIGHT = 44;
/** Gap from title row to divider (px) — applied as divider marginTop only. */
export const SHEET_HEADER_TO_DIVIDER = 2;
/**
 * Single source for space after the sheet divider before body content.
 * Consumers must use this as ScrollView/list `paddingTop` — do not also pad the header
 * or add marginTop on the first child.
 */
export const SHEET_BODY_PAD_TOP = 16;
/** Camera connection may use a slightly larger body inset (max 20). */
export const SHEET_BODY_PAD_TOP_CONNECTION = 20;

export type CompactSheetHeaderProps = {
  readonly title: string;
  readonly leftAction?: ReactNode;
  /** Defaults to SheetCloseButton when onClose is provided. */
  readonly rightAction?: ReactNode;
  readonly onClose?: () => void;
  readonly closeAccessibilityLabel?: string;
  readonly closeDisabled?: boolean;
  readonly showHandle?: boolean;
  /** @deprecated Use showHandle. */
  readonly showDragHandle?: boolean;
  readonly showDivider?: boolean;
  /** Compact spacing (default true). Pages never use this component. */
  readonly compact?: boolean;
  /** Centered (default) or start-aligned title (e.g. Camera connection). */
  readonly titleAlign?: "center" | "start";
  /** Passed to HeaderDivider sheet inset. */
  readonly dividerInset?: number;
  /** Rendered under the title row and above the divider (e.g. legal draft banner). */
  readonly belowTitle?: ReactNode;
  readonly dragHandleProps?: GestureResponderHandlers;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
};

/** @deprecated Prefer CompactSheetHeaderProps. */
export type SheetHeaderProps = CompactSheetHeaderProps;

/**
 * Single top block for bottom sheets: handle → 44px header row → hairline.
 * Owns all vertical chrome spacing. Consumers must not add paddingTop / margin
 * around this component.
 *
 * With handle: ≤76px top→separator. Without handle: ≤60px.
 */
export function CompactSheetHeader({
  title,
  leftAction,
  rightAction,
  onClose,
  closeAccessibilityLabel = "Close",
  closeDisabled = false,
  showHandle,
  showDragHandle,
  showDivider = true,
  compact = SHEET_HEADER_COMPACT,
  titleAlign = "center",
  dividerInset = MEDIA_SHEET_PAD_H,
  belowTitle,
  dragHandleProps,
  style,
  testID = "sheet-header",
}: CompactSheetHeaderProps) {
  const { colors } = useAppTheme();

  const withHandle = showHandle ?? showDragHandle ?? true;
  const handleTop = compact ? SHEET_HEADER_HANDLE_TOP : 10;
  const handleToRow = compact ? SHEET_HEADER_HANDLE_TO_ROW : 8;
  const toDivider = compact ? SHEET_HEADER_TO_DIVIDER : 10;

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

  const startAligned = titleAlign === "start";

  return (
    <View
      style={[styles.sheetHeaderBlock, { paddingTop: handleTop }, style]}
      testID={testID}
    >
      {withHandle ? (
        <View style={styles.handleWrap} {...(dragHandleProps ?? {})}>
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.border, marginBottom: handleToRow },
            ]}
          />
        </View>
      ) : null}

      <View
        style={styles.headerRow}
        {...(!withHandle && dragHandleProps ? dragHandleProps : {})}
      >
        {startAligned ? (
          <>
            <Text
              style={[styles.titleStart, { color: colors.text }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
            <View style={[styles.sideSlot, styles.sideRight]}>{right}</View>
          </>
        ) : (
          <>
            {/* Absolute title keeps geometric center regardless of Reset / Close width. */}
            <Text
              pointerEvents="none"
              style={[styles.titleAbsolute, { color: colors.text }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
            <View style={[styles.sideSlot, styles.sideLeft]}>
              {leftAction ?? <View style={styles.sideSpacer} />}
            </View>
            <View style={styles.sideFlex} />
            <View style={[styles.sideSlot, styles.sideRight]}>{right}</View>
          </>
        )}
      </View>

      {belowTitle ? (
        <View style={[styles.belowTitle, { paddingBottom: toDivider }]}>{belowTitle}</View>
      ) : null}

      {showDivider ? (
        <HeaderDivider
          variant="sheet"
          inset={dividerInset}
          testID={`${testID}-divider`}
          style={belowTitle ? undefined : { marginTop: toDivider }}
        />
      ) : null}
    </View>
  );
}

/** @deprecated Prefer CompactSheetHeader — same component. */
export const SheetHeader = CompactSheetHeader;

const styles = StyleSheet.create({
  sheetHeaderBlock: {
    flexShrink: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  handleWrap: {
    alignItems: "center",
  },
  handle: {
    width: 56,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
  },
  headerRow: {
    height: SHEET_HEADER_ROW_HEIGHT,
    minHeight: SHEET_HEADER_ROW_HEIGHT,
    maxHeight: SHEET_HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 4,
    position: "relative",
    overflow: "hidden",
  },
  sideSlot: {
    width: 76,
    height: SHEET_HEADER_ROW_HEIGHT,
    justifyContent: "center",
    zIndex: 1,
  },
  sideLeft: {
    alignItems: "flex-start",
    paddingLeft: 8,
  },
  sideRight: {
    alignItems: "flex-end",
    paddingRight: 4,
  },
  sideFlex: {
    flex: 1,
  },
  sideSpacer: {
    width: 44,
    height: 44,
  },
  titleAbsolute: {
    position: "absolute",
    left: 80,
    right: 80,
    textAlign: "center",
    fontFamily: Type.fontBold,
    fontSize: 17,
    lineHeight: 22,
  },
  titleStart: {
    flex: 1,
    minWidth: 0,
    textAlign: "left",
    fontFamily: Type.fontBold,
    fontSize: 18,
    lineHeight: 22,
    paddingLeft: 8,
  },
  belowTitle: {
    paddingHorizontal: MEDIA_SHEET_PAD_H,
  },
});
