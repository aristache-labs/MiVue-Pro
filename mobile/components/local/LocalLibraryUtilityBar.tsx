import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Type, useAppTheme } from "@/constants/Theme";

export const LOCAL_UTILITY_BAR_HEIGHT = 40;
export const LOCAL_UTILITY_BAR_TOP_GAP = 6;
export const LOCAL_UTILITY_BAR_BOTTOM_GAP = 6;
export const LOCAL_UTILITY_HIT = 44;

export interface LocalLibraryUtilityBarProps {
  readonly activeFilterCount: number;
  readonly sortLabel: string;
  readonly onPressFilters: () => void;
  readonly onPressSort: () => void;
  readonly disabled?: boolean;
  readonly testID?: string;
}

/**
 * Compact Local-only Filters + active sort control.
 */
export function LocalLibraryUtilityBar({
  activeFilterCount,
  sortLabel,
  onPressFilters,
  onPressSort,
  disabled = false,
  testID = "local-utility-bar",
}: LocalLibraryUtilityBarProps) {
  const { colors, spacing, radius } = useAppTheme();
  const filtersActive = activeFilterCount > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: LOCAL_UTILITY_BAR_TOP_GAP,
          paddingBottom: LOCAL_UTILITY_BAR_BOTTOM_GAP,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      pointerEvents={disabled ? "none" : "auto"}
      testID={testID}
    >
      <View
        style={[
          styles.shell,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderSoft,
            borderRadius: radius.md,
            minHeight: LOCAL_UTILITY_HIT,
          },
        ]}
      >
        <Pressable
          onPress={onPressFilters}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Filters"
          accessibilityHint="Opens recording filters"
          accessibilityState={{ disabled, selected: filtersActive }}
          accessibilityValue={
            filtersActive ? { text: `${activeFilterCount} active` } : undefined
          }
          style={({ pressed }) => [
            styles.filters,
            pressed && !disabled ? { backgroundColor: colors.surfaceMuted } : null,
          ]}
          testID="local-utility-filters"
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filtersActive ? colors.brand : colors.textMuted}
          />
          <Text
            style={[styles.label, { color: filtersActive ? colors.brand : colors.text }]}
            numberOfLines={1}
          >
            Filters
          </Text>
          {filtersActive ? (
            activeFilterCount > 1 ? (
              <View style={[styles.badge, { backgroundColor: colors.brand }]}>
                <Text style={[styles.badgeText, { color: colors.onBrand }]}>
                  {activeFilterCount > 99 ? "99+" : String(activeFilterCount)}
                </Text>
              </View>
            ) : (
              <View style={[styles.dot, { backgroundColor: colors.brand }]} />
            )
          ) : null}
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.borderSoft }]} />

        <Pressable
          onPress={onPressSort}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${sortLabel}`}
          accessibilityHint="Opens recording sorting options"
          accessibilityState={{ disabled }}
          style={({ pressed }) => [
            styles.sort,
            pressed && !disabled ? { backgroundColor: colors.surfaceMuted } : null,
          ]}
          testID="local-utility-sort"
        >
          <Ionicons name="swap-vertical-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {sortLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textFaint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  shell: {
    minHeight: LOCAL_UTILITY_HIT,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  filters: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: LOCAL_UTILITY_HIT,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  sort: {
    flex: 1,
    minWidth: 0,
    minHeight: LOCAL_UTILITY_HIT,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    alignSelf: "center",
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Type.fontSemi,
  },
  badge: {
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 10,
    fontFamily: Type.fontBold,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
