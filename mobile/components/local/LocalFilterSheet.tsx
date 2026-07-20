import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  datePreset,
  EMPTY_FILTERS,
  filterNormalizedFiles,
  localTodayKey,
  TIME_PRESETS,
  type LocalLibraryFilters,
  type MediaTypeFilter,
  type NormalizedLocalFile,
  type RecordingCategory,
} from "@/components/local/localLibraryFilters";
import { Type, useAppTheme } from "@/constants/Theme";
import { LOCAL_ACTION_HIT } from "@/components/local/localLibrarySections";

interface LocalFilterSheetProps {
  readonly visible: boolean;
  readonly initial: LocalLibraryFilters;
  readonly normalized: readonly NormalizedLocalFile[];
  readonly onClose: () => void;
  readonly onApply: (filters: LocalLibraryFilters) => void;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.sm,
          borderColor: selected ? colors.brand : colors.border,
          backgroundColor: selected ? colors.brandSoft : colors.surface,
          opacity: pressed ? 0.75 : 1,
          minHeight: LOCAL_ACTION_HIT - 8,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.brand : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function toggleIn<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function LocalFilterSheet({
  visible,
  initial,
  normalized,
  onClose,
  onApply,
}: LocalFilterSheetProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const draftCount = useMemo(
    () => filterNormalizedFiles(normalized, draft).length,
    [normalized, draft],
  );

  const today = localTodayKey();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.avoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss filters" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Filters</Text>
            <Pressable
              onPress={() => setDraft(EMPTY_FILTERS)}
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
              hitSlop={8}
              style={styles.headerBtn}
            >
              <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 15 }}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 16 }}
          >          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Date</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="Any"
              selected={draft.dateMode === "any"}
              onPress={() =>
                setDraft({
                  ...draft,
                  dateMode: "any",
                  singleDay: undefined,
                  rangeStart: undefined,
                  rangeEnd: undefined,
                })
              }
            />
            <Chip
              label="Single day"
              selected={draft.dateMode === "single"}
              onPress={() =>
                setDraft({
                  ...draft,
                  dateMode: "single",
                  singleDay: draft.singleDay ?? today,
                })
              }
            />
            <Chip
              label="Date range"
              selected={draft.dateMode === "range"}
              onPress={() =>
                setDraft({
                  ...draft,
                  dateMode: "range",
                  rangeStart: draft.rangeStart ?? today,
                  rangeEnd: draft.rangeEnd ?? today,
                })
              }
            />
          </View>
          {draft.dateMode !== "any" ? (
            <View style={styles.rowWrap}>
              <Chip
                label="Today"
                selected={false}
                onPress={() => setDraft({ ...draft, ...datePreset("today", today) })}
              />
              <Chip
                label="Yesterday"
                selected={false}
                onPress={() => setDraft({ ...draft, ...datePreset("yesterday", today) })}
              />
              <Chip
                label="Last 7 days"
                selected={false}
                onPress={() => setDraft({ ...draft, ...datePreset("last7", today) })}
              />
              <Chip
                label="This month"
                selected={false}
                onPress={() => setDraft({ ...draft, ...datePreset("thisMonth", today) })}
              />
            </View>
          ) : null}
          {draft.dateMode === "single" ? (
            <TextInput
              value={draft.singleDay ?? ""}
              onChangeText={(singleDay) => setDraft({ ...draft, singleDay })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              accessibilityLabel="Single day"
            />
          ) : null}
          {draft.dateMode === "range" ? (
            <View style={styles.rangeRow}>
              <TextInput
                value={draft.rangeStart ?? ""}
                onChangeText={(rangeStart) => setDraft({ ...draft, rangeStart })}
                placeholder="Start YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                style={[styles.input, styles.flex, { color: colors.text, borderColor: colors.border }]}
                accessibilityLabel="Start date"
              />
              <TextInput
                value={draft.rangeEnd ?? ""}
                onChangeText={(rangeEnd) => setDraft({ ...draft, rangeEnd })}
                placeholder="End YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                style={[styles.input, styles.flex, { color: colors.text, borderColor: colors.border }]}
                accessibilityLabel="End date"
              />
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>Time</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="Any"
              selected={draft.timeMode === "any"}
              onPress={() =>
                setDraft({
                  ...draft,
                  timeMode: "any",
                  singleTime: undefined,
                  timeFrom: undefined,
                  timeTo: undefined,
                })
              }
            />
            <Chip
              label="Single time"
              selected={draft.timeMode === "single"}
              onPress={() =>
                setDraft({ ...draft, timeMode: "single", singleTime: draft.singleTime ?? "12:00" })
              }
            />
            <Chip
              label="Time range"
              selected={draft.timeMode === "range"}
              onPress={() =>
                setDraft({
                  ...draft,
                  timeMode: "range",
                  timeFrom: draft.timeFrom ?? "06:00",
                  timeTo: draft.timeTo ?? "18:00",
                })
              }
            />
          </View>
          {draft.timeMode === "range" ? (
            <View style={styles.rowWrap}>
              {(Object.keys(TIME_PRESETS) as (keyof typeof TIME_PRESETS)[]).map((key) => (
                <Chip
                  key={key}
                  label={key[0]!.toUpperCase() + key.slice(1)}
                  selected={
                    draft.timeFrom === TIME_PRESETS[key].timeFrom &&
                    draft.timeTo === TIME_PRESETS[key].timeTo
                  }
                  onPress={() =>
                    setDraft({
                      ...draft,
                      timeMode: "range",
                      ...TIME_PRESETS[key],
                    })
                  }
                />
              ))}
            </View>
          ) : null}
          {draft.timeMode === "single" ? (
            <TextInput
              value={draft.singleTime ?? ""}
              onChangeText={(singleTime) => setDraft({ ...draft, singleTime })}
              placeholder="HH:mm"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              accessibilityLabel="Single time"
            />
          ) : null}
          {draft.timeMode === "range" ? (
            <View style={styles.rangeRow}>
              <TextInput
                value={draft.timeFrom ?? ""}
                onChangeText={(timeFrom) => setDraft({ ...draft, timeFrom })}
                placeholder="From HH:mm"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.flex, { color: colors.text, borderColor: colors.border }]}
                accessibilityLabel="From time"
              />
              <TextInput
                value={draft.timeTo ?? ""}
                onChangeText={(timeTo) => setDraft({ ...draft, timeTo })}
                placeholder="To HH:mm"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.flex, { color: colors.text, borderColor: colors.border }]}
                accessibilityLabel="To time"
              />
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
            Recording category
          </Text>
          <View style={styles.rowWrap}>
            {(["normal", "parking", "event"] as RecordingCategory[]).map((cat) => (
              <Chip
                key={cat}
                label={cat === "normal" ? "Normal" : cat === "parking" ? "Parking" : "Event"}
                selected={draft.categories.includes(cat)}
                onPress={() => setDraft({ ...draft, categories: toggleIn(draft.categories, cat) })}
              />
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>Media type</Text>
          <View style={styles.rowWrap}>
            {(["video", "image"] as MediaTypeFilter[]).map((mt) => (
              <Chip
                key={mt}
                label={mt === "video" ? "Videos" : "Photos"}
                selected={draft.mediaTypes.includes(mt)}
                onPress={() => setDraft({ ...draft, mediaTypes: toggleIn(draft.mediaTypes, mt) })}
              />
            ))}
          </View>
        </ScrollView>

        <Pressable
          onPress={() => onApply(draft)}
          accessibilityRole="button"
          accessibilityLabel={`Show ${draftCount} results`}
          style={({ pressed }) => [
            styles.applyBtn,
            {
              backgroundColor: colors.brand,
              borderRadius: radius.md,
              marginHorizontal: spacing.lg,
              opacity: pressed ? 0.85 : 1,
              minHeight: LOCAL_ACTION_HIT,
            },
          ]}
        >
          <Text style={[styles.applyText, { color: colors.onBrand }]}>Show {draftCount} results</Text>
        </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoid: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "78%", paddingTop: 8, width: "100%" },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  sheetTitle: { fontSize: 17, fontFamily: Type.fontBold },
  headerBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 13, fontFamily: Type.fontSemi },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Type.monoMed,
    fontSize: 14,
    marginBottom: 8,
    minHeight: 44,
  },
  rangeRow: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  applyBtn: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  applyText: { fontSize: 16, fontFamily: Type.fontBold },
});
