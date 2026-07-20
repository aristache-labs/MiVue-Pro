import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { Type, useAppTheme } from "@/constants/Theme";

export interface MetaChip {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
}

interface MediaMetaRowProps {
  readonly chips: readonly MetaChip[];
  readonly compact?: boolean;
  /** Keep chips on one row (no wrap). */
  readonly singleLine?: boolean;
}

/** Professional meta chips: icon + value, separated by vertical rules. */
export function MediaMetaRow({ chips, compact = false, singleLine = false }: MediaMetaRowProps) {
  const { colors, radius } = useAppTheme();
  if (chips.length === 0) return null;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.sm,
          paddingVertical: compact ? 6 : 8,
          paddingHorizontal: compact ? 6 : 10,
          flexWrap: singleLine ? "nowrap" : "wrap",
        },
      ]}
    >
      {chips.map((chip, index) => (
        <View
          key={`${chip.icon}-${chip.label}-${index}`}
          style={[styles.chipWrap, singleLine ? styles.chipWrapFlex : null]}
        >
          {index > 0 ? <View style={[styles.sep, { backgroundColor: colors.border }]} /> : null}
          <View style={[styles.chip, singleLine ? styles.chipFlex : null]}>
            <Ionicons
              name={chip.icon}
              size={compact ? 11 : 13}
              color={colors.brand}
              style={styles.icon}
            />
            <Text
              style={[styles.label, { color: colors.textMuted, fontSize: compact ? 10 : 12 }]}
              numberOfLines={1}
            >
              {chip.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  chipWrap: { flexDirection: "row", alignItems: "center" },
  chipWrapFlex: { flex: 1, minWidth: 0 },
  sep: { width: StyleSheet.hairlineWidth, height: 12, marginRight: 6 },
  chip: { flexDirection: "row", alignItems: "center" },
  chipFlex: { flex: 1, minWidth: 0, justifyContent: "center" },
  icon: { marginRight: 3 },
  label: { fontFamily: Type.monoMed, flexShrink: 1 },
});
