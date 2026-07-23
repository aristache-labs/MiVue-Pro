import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

export interface SettingsRowBaseProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly subtitle?: string;
  readonly value?: string;
  readonly onPress?: () => void;
  readonly destructive?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
  /** Hub category rows use taller min height. */
  readonly variant?: "default" | "category";
  /** Tighter vertical padding for dense Settings detail screens (keeps ≥44 hit). */
  readonly compact?: boolean;
}

/**
 * Shared settings row — chevron only when interactive.
 * Prefer SettingsValueRow / SettingsActionRow / SettingsDangerRow / SettingsCategoryRow wrappers.
 */
export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  destructive,
  loading = false,
  disabled = false,
  accessibilityLabel,
  variant = "default",
  compact = false,
}: SettingsRowBaseProps) {
  const { colors, radius } = useAppTheme();
  const titleColor = destructive ? colors.danger : colors.text;
  const interactive = Boolean(onPress) && !disabled && !loading;
  const tall = variant === "category";

  const content = (
    <View style={styles.row}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.danger : colors.brand}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={tall ? 2 : compact ? 2 : 3}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.brand} accessibilityLabel="Loading" />
      ) : value ? (
        <Text style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {interactive ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      ) : null}
    </View>
  );

  const wrapStyle = [
    styles.wrap,
    compact ? styles.wrapCompact : null,
    tall ? styles.wrapCategory : null,
    { borderBottomColor: colors.borderSoft, opacity: disabled ? 0.45 : 1 },
  ];

  if (!onPress || disabled) {
    return (
      <View
        style={wrapStyle}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: true }}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !interactive, busy: loading }}
      hitSlop={HitSlop44}
      style={({ pressed }) => [...wrapStyle, { opacity: pressed ? 0.75 : disabled ? 0.45 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsValueRow(props: Omit<SettingsRowBaseProps, "onPress" | "variant">) {
  return <SettingsRow {...props} />;
}

export function SettingsActionRow(props: SettingsRowBaseProps) {
  return <SettingsRow {...props} />;
}

export function SettingsDangerRow(props: Omit<SettingsRowBaseProps, "destructive">) {
  return <SettingsRow {...props} destructive />;
}

export function SettingsCategoryRow(
  props: Omit<SettingsRowBaseProps, "variant" | "destructive" | "loading" | "compact"> & {
    readonly summary: string;
  },
) {
  const { summary, ...rest } = props;
  return <SettingsRow {...rest} subtitle={summary} variant="category" />;
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  wrapCompact: {
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  wrapCategory: {
    minHeight: 76,
    paddingVertical: 14,
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
  subtitle: { fontSize: 12, fontFamily: Type.font, marginTop: 1, lineHeight: 15 },
  value: {
    fontSize: 13,
    fontFamily: Type.mono,
    fontVariant: ["tabular-nums"],
    maxWidth: 168,
    flexShrink: 0,
    textAlign: "right",
  },
});
