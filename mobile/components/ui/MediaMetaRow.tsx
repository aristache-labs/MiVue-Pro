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
  readonly size?: "sm" | "md" | "lg";
}

/** Professional meta chips: icon + value, separated by vertical rules. */
export function MediaMetaRow({
  chips,
  compact = false,
  singleLine = false,
  size,
}: MediaMetaRowProps) {
  const { colors, radius } = useAppTheme();
  if (chips.length === 0) return null;

  const scale = size ?? (compact ? "sm" : "md");
  const padV = scale === "lg" ? 12 : scale === "md" ? 8 : 6;
  const padH = scale === "lg" ? 12 : scale === "md" ? 10 : 6;
  const iconSize = scale === "lg" ? 16 : scale === "md" ? 13 : 11;
  const fontSize = scale === "lg" ? 13 : scale === "md" ? 12 : 10;
  const sepH = scale === "lg" ? 16 : 12;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.sm,
          paddingVertical: padV,
          paddingHorizontal: padH,
          flexWrap: singleLine ? "nowrap" : "wrap",
        },
      ]}
    >
      {chips.map((chip, index) => (
        <View
          key={`${chip.icon}-${chip.label}-${index}`}
          style={[styles.chipWrap, singleLine ? styles.chipWrapFlex : null]}
        >
          {index > 0 ? (
            <View style={[styles.sep, { backgroundColor: colors.border, height: sepH }]} />
          ) : null}
          <View style={[styles.chip, singleLine ? styles.chipFlex : null]}>
            <Ionicons name={chip.icon} size={iconSize} color={colors.brand} style={styles.icon} />
            <Text
              style={[styles.label, { color: colors.text, fontSize }]}
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
  sep: { width: StyleSheet.hairlineWidth, marginRight: 6 },
  chip: { flexDirection: "row", alignItems: "center" },
  chipFlex: { flex: 1, minWidth: 0, justifyContent: "center" },
  icon: { marginRight: 4 },
  label: { fontFamily: Type.monoMed, flexShrink: 1 },
});
