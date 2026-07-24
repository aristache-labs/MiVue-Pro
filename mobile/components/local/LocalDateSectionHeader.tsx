import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  LOCAL_ACTION_HIT,
  localDateSectionA11yLabel,
} from "@/components/local/localLibrarySections";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

export interface LocalDateSectionHeaderProps {
  readonly title: string;
  readonly countLabel: string;
  /** Global Sort control — only on the primary sticky header. */
  readonly showSort?: boolean;
  readonly sortDisabled?: boolean;
  readonly sortValueLabel?: string;
  readonly onPressSort?: () => void;
  readonly testID?: string;
}

/**
 * Date separator: `DATE · N files` with optional global Sort on the right.
 */
export function LocalDateSectionHeader({
  title,
  countLabel,
  showSort = false,
  sortDisabled = false,
  sortValueLabel,
  onPressSort,
  testID,
}: LocalDateSectionHeaderProps) {
  const { colors } = useAppTheme();
  const a11y = localDateSectionA11yLabel(title, countLabel);

  return (
    <View
      collapsable={false}
      style={[
        styles.row,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
      testID={testID}
      accessibilityRole={showSort ? undefined : "header"}
      accessibilityLabel={showSort ? undefined : a11y}
    >
      <View
        style={styles.leading}
        accessible
        accessibilityRole="text"
        accessibilityLabel={a11y}
      >
        <Text style={[styles.title, { color: colors.textMuted }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.dot, { color: colors.textMuted }]} importantForAccessibility="no">
          {" · "}
        </Text>
        <Text style={[styles.count, { color: colors.textMuted }]} numberOfLines={1}>
          {countLabel}
        </Text>
      </View>

      {showSort ? (
        <Pressable
          onPress={onPressSort}
          disabled={sortDisabled}
          accessibilityRole="button"
          accessibilityLabel="Sort files"
          accessibilityHint="Opens Local Library sorting options"
          accessibilityValue={
            sortValueLabel
              ? { text: `Currently sorted by ${sortValueLabel}` }
              : undefined
          }
          accessibilityState={{ disabled: sortDisabled }}
          hitSlop={HitSlop44}
          style={({ pressed }) => [
            styles.sortHit,
            {
              opacity: sortDisabled ? 0.4 : pressed ? 0.65 : 1,
            },
          ]}
          testID="local-section-sort"
        >
          <Ionicons
            name="swap-vertical-outline"
            size={17}
            color={sortDisabled ? colors.textMuted : colors.brand}
          />
          <Text
            style={[
              styles.sortLabel,
              { color: sortDisabled ? colors.textMuted : colors.brand },
            ]}
            numberOfLines={1}
          >
            Sort
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leading: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
  },
  title: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.5,
  },
  dot: {
    flexShrink: 0,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Type.fontSemi,
  },
  count: {
    flexShrink: 0,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Type.font,
  },
  sortHit: {
    flexShrink: 0,
    minWidth: LOCAL_ACTION_HIT,
    minHeight: LOCAL_ACTION_HIT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  sortLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: Type.fontSemi,
  },
});
