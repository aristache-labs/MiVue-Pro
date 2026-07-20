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
}

/** Professional meta chips: icon + value, separated by vertical rules. */
export function MediaMetaRow({ chips, compact = false }: MediaMetaRowProps) {
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
          paddingHorizontal: compact ? 8 : 10,
        },
      ]}
    >
      {chips.map((chip, index) => (
        <View key={`${chip.icon}-${chip.label}-${index}`} style={styles.chipWrap}>
          {index > 0 ? <View style={[styles.sep, { backgroundColor: colors.border }]} /> : null}
          <View style={styles.chip}>
            <Ionicons name={chip.icon} size={compact ? 12 : 13} color={colors.brand} style={styles.icon} />
            <Text style={[styles.label, { color: colors.textMuted, fontSize: compact ? 11 : 12 }]} numberOfLines={1}>
              {chip.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  chipWrap: { flexDirection: "row", alignItems: "center" },
  sep: { width: StyleSheet.hairlineWidth, height: 14, marginHorizontal: 8 },
  chip: { flexDirection: "row", alignItems: "center" },
  icon: { marginRight: 4 },
  label: { fontFamily: Type.monoMed },
});
