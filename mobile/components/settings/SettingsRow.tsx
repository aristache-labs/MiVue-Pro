import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

interface SettingsRowProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly description?: string;
  readonly value?: string;
  readonly onPress?: () => void;
  readonly destructive?: boolean;
  readonly accessibilityLabel?: string;
}

export function SettingsRow({
  icon,
  title,
  description,
  value,
  onPress,
  destructive,
  accessibilityLabel,
}: SettingsRowProps) {
  const { colors, radius } = useAppTheme();
  const titleColor = destructive ? colors.danger : colors.text;
  const interactive = Boolean(onPress);

  const content = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.brand} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {interactive ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      ) : null}
    </View>
  );

  if (!interactive) {
    return (
      <View
        style={[styles.wrap, { borderBottomColor: colors.borderSoft }]}
        accessibilityLabel={accessibilityLabel ?? title}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      hitSlop={HitSlop44}
      style={({ pressed }) => [
        styles.wrap,
        { borderBottomColor: colors.borderSoft, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontFamily: Type.fontSemi },
  desc: { fontSize: 12, fontFamily: Type.font, marginTop: 2, lineHeight: 16 },
  value: { fontSize: 13, fontFamily: Type.font, maxWidth: 120, textAlign: "right" },
});
