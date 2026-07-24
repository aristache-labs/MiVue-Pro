import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { localSelectedCountLabel } from "@/components/local/localLibrarySelection";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

export const LOCAL_SELECTION_CONTEXT_H = 44;

export interface LocalSelectionContextBarProps {
  readonly selectedCount: number;
  readonly filteredCount: number;
  readonly allSelected: boolean;
  readonly onClose: () => void;
  readonly onToggleSelectAll: () => void;
  readonly selectAllAccessibilityLabel: string;
  readonly testID?: string;
}

/**
 * Compact selection chrome above the date separator: Close | N selected | Select all.
 */
export function LocalSelectionContextBar({
  selectedCount,
  filteredCount,
  allSelected,
  onClose,
  onToggleSelectAll,
  selectAllAccessibilityLabel,
  testID = "local-selection-context-bar",
}: LocalSelectionContextBarProps) {
  const { colors, spacing } = useAppTheme();
  const selectAllDisabled = filteredCount === 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: spacing.lg,
          borderBottomColor: colors.borderSoft,
        },
      ]}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={`Selection mode. ${localSelectedCountLabel(selectedCount)}`}
    >
      <Text
        pointerEvents="none"
        style={[styles.count, { color: colors.text }]}
        numberOfLines={1}
      >
        {localSelectedCountLabel(selectedCount)}
      </Text>

      <View style={styles.row}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close selection"
          accessibilityHint="Clears the selection and exits selection mode"
          hitSlop={HitSlop44}
          style={({ pressed }) => [
            styles.sideHit,
            { opacity: pressed ? 0.65 : 1 },
          ]}
          testID="local-selection-close"
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.centerSpacer} />

        <Pressable
          onPress={onToggleSelectAll}
          disabled={selectAllDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            allSelected ? "Deselect all" : selectAllAccessibilityLabel
          }
          accessibilityHint={
            allSelected
              ? "Clears the current selection"
              : "Selects all files in the filtered list"
          }
          accessibilityState={{ disabled: selectAllDisabled }}
          hitSlop={HitSlop44}
          style={({ pressed }) => [
            styles.selectAllHit,
            { opacity: selectAllDisabled ? 0.4 : pressed ? 0.65 : 1 },
          ]}
          testID="local-selection-select-all"
        >
          <Text
            style={[styles.selectAllLabel, { color: colors.brand }]}
            numberOfLines={1}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: LOCAL_SELECTION_CONTEXT_H,
    width: "100%",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: LOCAL_SELECTION_CONTEXT_H,
  },
  count: {
    ...StyleSheet.absoluteFillObject,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 15,
    lineHeight: LOCAL_SELECTION_CONTEXT_H,
    fontFamily: Type.fontSemi,
    zIndex: 0,
  },
  sideHit: {
    minWidth: LOCAL_SELECTION_CONTEXT_H,
    minHeight: LOCAL_SELECTION_CONTEXT_H,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  centerSpacer: {
    flex: 1,
    minWidth: 0,
  },
  selectAllHit: {
    minHeight: LOCAL_SELECTION_CONTEXT_H,
    minWidth: LOCAL_SELECTION_CONTEXT_H,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  selectAllLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Type.fontSemi,
  },
});
