import { useCallback, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";

import { formatCountAbbrev } from "@/components/camera/cameraLibraryModel";
import { Radius, Type, useAppTheme } from "@/constants/Theme";

export type LibraryCategoryId = "all" | "normal" | "parking" | "event" | "photo";

export const LIBRARY_CATEGORY_TABS: readonly {
  readonly id: LibraryCategoryId;
  readonly label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "normal", label: "Normal" },
  { id: "parking", label: "Parking" },
  { id: "event", label: "Event" },
  { id: "photo", label: "Photos" },
] as const;

export const LIBRARY_CATEGORY_GAP = 6;
/** Compact two-line chips (label + count), matching pre-standardization density. */
export const LIBRARY_CATEGORY_HEIGHT = 48;
/** Space between tab header bottom and category row. */
export const LIBRARY_CATEGORY_TOP_GAP = 8;

export type LibraryCategoryCounts = Readonly<Record<LibraryCategoryId, number>>;

export interface LibraryCategoryTabsProps {
  readonly selectedId: LibraryCategoryId;
  readonly counts: LibraryCategoryCounts;
  readonly onSelect: (id: LibraryCategoryId) => void;
  readonly disabled?: boolean;
  readonly testID?: string;
}

/**
 * Shared All / Normal / Parking / Event / Photos selector for Camera Library and Local Library.
 */
export function LibraryCategoryTabs({
  selectedId,
  counts,
  onSelect,
  disabled = false,
  testID,
}: LibraryCategoryTabsProps) {
  const { colors, spacing } = useAppTheme();
  const [rowWidth, setRowWidth] = useState(0);

  const onRowLayout = useCallback((event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  }, []);

  const cardCount = LIBRARY_CATEGORY_TABS.length;
  const cardWidth =
    rowWidth > 0
      ? (rowWidth - LIBRARY_CATEGORY_GAP * (cardCount - 1)) / cardCount
      : undefined;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: spacing.lg,
          paddingTop: LIBRARY_CATEGORY_TOP_GAP,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
      pointerEvents={disabled ? "none" : "auto"}
      testID={testID}
    >
      <View style={styles.row} onLayout={onRowLayout}>
        {LIBRARY_CATEGORY_TABS.map((chip) => {
          const selected = selectedId === chip.id;
          const value = counts[chip.id] ?? 0;
          const abbrev = formatCountAbbrev(value);
          return (
            <Pressable
              key={chip.id}
              onPress={() => onSelect(chip.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${chip.label}, ${abbrev.a11y}`}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  borderColor: selected ? colors.brand : colors.border,
                  backgroundColor: selected ? colors.brandSoft : colors.surface,
                },
              ]}
            >
              <Text
                style={[styles.label, { color: selected ? colors.brand : colors.text }]}
                numberOfLines={1}
              >
                {chip.label}
              </Text>
              <Text
                style={[
                  styles.count,
                  { color: selected ? colors.brandStrong : colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {abbrev.display}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: LIBRARY_CATEGORY_GAP,
    minHeight: LIBRARY_CATEGORY_HEIGHT,
  },
  card: {
    height: LIBRARY_CATEGORY_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    flexShrink: 0,
  },
  label: {
    fontSize: 11,
    fontFamily: Type.fontSemi,
    textAlign: "center",
    lineHeight: 14,
  },
  count: {
    fontSize: 11,
    fontFamily: Type.monoMed,
    textAlign: "center",
    lineHeight: 14,
  },
});
