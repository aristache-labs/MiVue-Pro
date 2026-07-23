import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Radius, Type, useAppTheme } from "@/constants/Theme";

/** Segmented Filters | Sort control height. */
export const LIBRARY_LIST_CONTROLS_HEIGHT = 48;
/** Space between category row and this control. */
export const LIBRARY_LIST_CONTROLS_TOP_GAP = 12;
/** Space between this control and list / date separator. */
export const LIBRARY_LIST_CONTROLS_BOTTOM_GAP = 12;

export interface LibraryListControlsProps {
  readonly activeFilterCount: number;
  /** True when sort differs from default (newest). */
  readonly sortActive: boolean;
  readonly onPressFilters: () => void;
  readonly onPressSort: () => void;
  readonly disabled?: boolean;
  readonly testID?: string;
}

/**
 * Shared full-width Filters | Sort segmented control for Camera Library and Local Library.
 */
export function LibraryListControls({
  activeFilterCount,
  sortActive,
  onPressFilters,
  onPressSort,
  disabled = false,
  testID,
}: LibraryListControlsProps) {
  const { colors, spacing } = useAppTheme();
  const filtersActive = activeFilterCount > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: LIBRARY_LIST_CONTROLS_TOP_GAP,
          paddingBottom: LIBRARY_LIST_CONTROLS_BOTTOM_GAP,
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
            backgroundColor: colors.surface,
            borderColor: colors.border,
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
            styles.half,
            filtersActive ? { backgroundColor: colors.brandSoft } : null,
            pressed && !disabled
              ? { backgroundColor: filtersActive ? colors.brandSoft : colors.surfaceElevated, opacity: 0.92 }
              : null,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filtersActive ? colors.brand : colors.textMuted}
          />
          <Text
            style={[
              styles.label,
              { color: filtersActive ? colors.brand : colors.text },
            ]}
          >
            Filters
          </Text>
          {filtersActive ? (
            <View style={[styles.badge, { backgroundColor: colors.brand }]}>
              <Text style={[styles.badgeText, { color: colors.onBrand }]}>
                {activeFilterCount > 99 ? "99+" : String(activeFilterCount)}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Pressable
          onPress={onPressSort}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Sort recordings"
          accessibilityHint="Opens recording sorting options"
          accessibilityState={{ disabled, selected: sortActive }}
          style={({ pressed }) => [
            styles.half,
            sortActive ? { backgroundColor: colors.brandSoft } : null,
            pressed && !disabled
              ? { backgroundColor: sortActive ? colors.brandSoft : colors.surfaceElevated, opacity: 0.92 }
              : null,
          ]}
        >
          <Ionicons
            name="swap-vertical-outline"
            size={18}
            color={sortActive ? colors.brand : colors.textMuted}
          />
          <Text
            style={[
              styles.label,
              { color: sortActive ? colors.brand : colors.text },
            ]}
          >
            Sort
          </Text>
          {sortActive ? (
            <View style={[styles.sortDot, { backgroundColor: colors.brand }]} />
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  shell: {
    height: LIBRARY_LIST_CONTROLS_HEIGHT,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  half: {
    flex: 1,
    minHeight: LIBRARY_LIST_CONTROLS_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Type.fontSemi,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: Type.fontBold,
  },
  sortDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
