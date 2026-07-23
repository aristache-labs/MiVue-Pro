import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetCloseButton } from "@/components/media/SheetCloseButton";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { MEDIA_SHEET_RADIUS } from "@/components/media/mediaCardTokens";
import { useVerticalOverflow } from "@/hooks/useVerticalOverflow";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

export interface CameraSettingOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface CameraSettingSheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly description?: string;
  readonly currentValue: string | undefined;
  readonly options: readonly CameraSettingOption[];
  readonly applying: boolean;
  readonly applyDisabledReason?: string;
  readonly onApply: (value: string) => void;
  readonly onClose: () => void;
}

/**
 * Single-select camera setting picker — Filters/legal sheet chrome.
 */
export function CameraSettingSheet({
  visible,
  title,
  description,
  currentValue,
  options,
  applying,
  applyDisabledReason,
  onApply,
  onClose,
}: CameraSettingSheetProps) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<string | undefined>(currentValue);
  const { hasOverflow, onViewportLayout, onContentSizeChange } = useVerticalOverflow();

  useEffect(() => {
    if (visible) setDraft(currentValue);
  }, [visible, currentValue]);

  const canApply = useMemo(() => {
    if (applying) return false;
    if (!draft) return false;
    if (draft === currentValue) return false;
    if (applyDisabledReason) return false;
    return options.some((o) => o.value === draft);
  }, [applying, draft, currentValue, applyDisabledReason, options]);

  return (
    <StaticBackdropSheet
      visible={visible}
      onClose={() => {
        if (!applying) onClose();
      }}
      enableSwipeToDismiss={!applying}
      sheetTestID="camera-setting-sheet"
      sheetStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: MEDIA_SHEET_RADIUS,
        borderTopRightRadius: MEDIA_SHEET_RADIUS,
        maxHeight: "88%",
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {(api) => (
        <View style={styles.root}>
          <View style={styles.header} {...api.dragHandleProps}>
            <View style={styles.headerSide} />
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerSide}>
              <SheetCloseButton onPress={api.requestClose} disabled={applying} />
            </View>
          </View>

          {description ? (
            <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
          ) : null}

          {applyDisabledReason ? (
            <Text style={[styles.banner, { color: colors.warn, backgroundColor: colors.warnSoft }]}>
              {applyDisabledReason}
            </Text>
          ) : null}

          <ScrollView
            style={styles.list}
            onLayout={onViewportLayout}
            onContentSizeChange={onContentSizeChange}
            scrollEnabled={hasOverflow}
            bounces={hasOverflow}
            showsVerticalScrollIndicator={hasOverflow}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((option) => {
              const selected = draft === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (!applying) setDraft(option.value);
                  }}
                  disabled={applying}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: applying }}
                  accessibilityLabel={option.label}
                  hitSlop={HitSlop44}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: selected ? colors.brand : colors.border,
                      backgroundColor: selected ? colors.brandSoft : colors.surfaceElevated,
                      borderRadius: radius.lg,
                      opacity: pressed && !applying ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.optionBody}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: selected ? colors.brand : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? colors.brand : colors.border,
                        backgroundColor: selected ? colors.brand : "transparent",
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color={colors.onBrand} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={api.requestClose}
              disabled={applying}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: colors.surfaceMuted,
                  opacity: applying ? 0.5 : pressed ? 0.8 : 1,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text style={[styles.btnLabel, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (canApply && draft) onApply(draft);
              }}
              disabled={!canApply}
              accessibilityRole="button"
              accessibilityLabel="Apply"
              accessibilityState={{ disabled: !canApply, busy: applying }}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: canApply ? colors.brand : colors.surfaceMuted,
                  opacity: !canApply ? 0.55 : pressed ? 0.85 : 1,
                  borderRadius: radius.md,
                },
              ]}
            >
              {applying ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Text
                  style={[
                    styles.btnLabel,
                    { color: canApply ? colors.onBrand : colors.textMuted },
                  ]}
                >
                  Apply
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </StaticBackdropSheet>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  headerSide: { width: 44, alignItems: "flex-end" },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: Type.fontBold,
    fontSize: 17,
  },
  description: {
    fontFamily: Type.font,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  banner: {
    fontFamily: Type.fontSemi,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  list: { maxHeight: 420 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 12,
  },
  optionBody: { flex: 1, minWidth: 0 },
  optionLabel: { fontFamily: Type.fontSemi, fontSize: 15 },
  optionDesc: { fontFamily: Type.font, fontSize: 12, marginTop: 2, lineHeight: 16 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLabel: { fontFamily: Type.fontBold, fontSize: 15 },
});
