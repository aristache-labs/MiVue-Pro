import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  clampRangeAfterEnd,
  clampRangeAfterStart,
  dateToDayKey,
  dateToHhmm,
  dayKeyToDate,
  formatDayDisplay,
  formatTimeDisplay,
  hhmmToDate,
  pickerA11yLabel,
  type PickerField,
} from "@/components/local/localDateTime";
import {
  datePreset,
  EMPTY_FILTERS,
  filterNormalizedFiles,
  isFiltersEmpty,
  localTodayKey,
  RECORDING_CATEGORIES,
  showLocalCategorySectionInFilters,
  TIME_PRESETS,
  type LocalCategoryScope,
  type LocalLibraryFilters,
  type MediaTypeFilter,
  type NormalizedLocalFile,
} from "@/components/local/localLibraryFilters";
import { LOCAL_ACTION_HIT } from "@/components/local/localLibrarySections";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { MEDIA_SHEET_PAD_H, MEDIA_SHEET_RADIUS } from "@/components/media/mediaCardTokens";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useVerticalOverflow } from "@/hooks/useVerticalOverflow";

interface LocalFilterSheetProps {
  readonly visible: boolean;
  readonly initial: LocalLibraryFilters;
  readonly normalized: readonly NormalizedLocalFile[];
  /** Top category chip — Category section only when All. */
  readonly categoryScope?: LocalCategoryScope;
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

function FieldButton({
  label,
  value,
  a11yLabel,
  onPress,
}: {
  readonly label?: string;
  readonly value: string;
  readonly a11yLabel: string;
  readonly onPress: () => void;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.fieldBtn,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.sm,
          opacity: pressed ? 0.8 : 1,
          flex: label ? 1 : undefined,
        },
      ]}
    >
      {label ? (
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

function toggleIn<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function pickerValue(draft: LocalLibraryFilters, field: PickerField): Date {
  switch (field) {
    case "singleDay":
      return dayKeyToDate(draft.singleDay ?? localTodayKey());
    case "rangeStart":
      return dayKeyToDate(draft.rangeStart ?? localTodayKey());
    case "rangeEnd":
      return dayKeyToDate(draft.rangeEnd ?? draft.rangeStart ?? localTodayKey());
    case "singleTime":
      return hhmmToDate(draft.singleTime ?? "12:00");
    case "timeFrom":
      return hhmmToDate(draft.timeFrom ?? "06:00");
    case "timeTo":
      return hhmmToDate(draft.timeTo ?? "18:00");
    default:
      return new Date();
  }
}

function applyPickerDate(
  draft: LocalLibraryFilters,
  field: PickerField,
  date: Date,
): LocalLibraryFilters {
  if (field === "singleDay") {
    return { ...draft, singleDay: dateToDayKey(date) };
  }
  if (field === "rangeStart") {
    const clamped = clampRangeAfterStart(dateToDayKey(date), draft.rangeEnd);
    return { ...draft, ...clamped };
  }
  if (field === "rangeEnd") {
    const clamped = clampRangeAfterEnd(draft.rangeStart, dateToDayKey(date));
    return { ...draft, ...clamped };
  }
  if (field === "singleTime") {
    return { ...draft, singleTime: dateToHhmm(date) };
  }
  if (field === "timeFrom") {
    return { ...draft, timeFrom: dateToHhmm(date) };
  }
  return { ...draft, timeTo: dateToHhmm(date) };
}

/**
 * Local Library filters — same static backdrop + header as Camera Filters.
 */
export function LocalFilterSheet({
  visible,
  initial,
  normalized,
  categoryScope = "all",
  onClose,
  onApply,
}: LocalFilterSheetProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);
  const [iosTemp, setIosTemp] = useState<Date | null>(null);
  const showCategory = showLocalCategorySectionInFilters(categoryScope);
  const resetDisabled = isFiltersEmpty(draft);
  const { hasOverflow, onViewportLayout, onContentSizeChange } = useVerticalOverflow();

  useEffect(() => {
    if (!visible) return;
    setDraft(initial);
    setActivePicker(null);
    setIosTemp(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open
  }, [visible]);

  const draftCount = useMemo(
    () => filterNormalizedFiles(normalized, draft).length,
    [normalized, draft],
  );

  const today = localTodayKey();
  const pickerMode: "date" | "time" =
    activePicker === "singleTime" || activePicker === "timeFrom" || activePicker === "timeTo"
      ? "time"
      : "date";

  const dismissPicker = useCallback(() => {
    setActivePicker(null);
    setIosTemp(null);
  }, []);

  const openPicker = (field: PickerField) => {
    if (activePicker) return;
    setIosTemp(pickerValue(draft, field));
    setActivePicker(field);
  };

  const commitPicker = (date: Date) => {
    if (!activePicker || !Number.isFinite(date.getTime())) {
      dismissPicker();
      return;
    }
    setDraft((prev) => applyPickerDate(prev, activePicker, date));
    dismissPicker();
  };

  const onNativeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      dismissPicker();
      return;
    }
    if (!date || !activePicker) return;
    if (Platform.OS === "android") {
      commitPicker(date);
      return;
    }
    setIosTemp(date);
  };

  const interceptClose = useCallback(() => {
    if (activePicker) {
      dismissPicker();
      return true;
    }
    return false;
  }, [activePicker, dismissPicker]);

  return (
    <StaticBackdropSheet
      visible={visible}
      onClose={onClose}
      interceptClose={interceptClose}
      scrimAccessibilityLabel="Close filters"
      scrimTestID="local-filter-scrim"
      sheetTestID="local-filter-sheet"
      sheetStyle={{
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
        borderTopLeftRadius: MEDIA_SHEET_RADIUS,
        borderTopRightRadius: MEDIA_SHEET_RADIUS,
        paddingBottom: Math.max(insets.bottom, 12),
        maxHeight: "88%",
      }}
    >
      {({ requestClose }) => (
        <View style={styles.sheetBody}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.sheetHeader}>
            <View style={styles.headerSide}>
              <Pressable
                onPress={() => setDraft(EMPTY_FILTERS)}
                disabled={resetDisabled}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
                accessibilityState={{ disabled: resetDisabled }}
                hitSlop={HitSlop44}
                style={[styles.headerHit, { opacity: resetDisabled ? 0.4 : 1 }]}
              >
                <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 15 }}>
                  Reset
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.sheetTitle, { color: colors.text }]} accessibilityRole="header">
              Filters
            </Text>
            <View style={[styles.headerSide, styles.headerSideRight]}>
              <Pressable
                onPress={() => {
                  if (activePicker) {
                    dismissPicker();
                    return;
                  }
                  requestClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                hitSlop={HitSlop44}
                style={styles.headerHit}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: MEDIA_SHEET_PAD_H, paddingBottom: 16 }}
            scrollEnabled={hasOverflow}
            alwaysBounceVertical={false}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={hasOverflow}
            onLayout={onViewportLayout}
            onContentSizeChange={onContentSizeChange}
          >
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Date</Text>
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
              <FieldButton
                value={formatDayDisplay(draft.singleDay)}
                a11yLabel={pickerA11yLabel("singleDay")}
                onPress={() => openPicker("singleDay")}
              />
            ) : null}
            {draft.dateMode === "range" ? (
              <View style={styles.rangeRow}>
                <FieldButton
                  label="From"
                  value={formatDayDisplay(draft.rangeStart)}
                  a11yLabel={pickerA11yLabel("rangeStart")}
                  onPress={() => openPicker("rangeStart")}
                />
                <FieldButton
                  label="To"
                  value={formatDayDisplay(draft.rangeEnd)}
                  a11yLabel={pickerA11yLabel("rangeEnd")}
                  onPress={() => openPicker("rangeEnd")}
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
              <FieldButton
                value={formatTimeDisplay(draft.singleTime)}
                a11yLabel={pickerA11yLabel("singleTime")}
                onPress={() => openPicker("singleTime")}
              />
            ) : null}
            {draft.timeMode === "range" ? (
              <View style={styles.rangeRow}>
                <FieldButton
                  label="From"
                  value={formatTimeDisplay(draft.timeFrom)}
                  a11yLabel={pickerA11yLabel("timeFrom")}
                  onPress={() => openPicker("timeFrom")}
                />
                <FieldButton
                  label="To"
                  value={formatTimeDisplay(draft.timeTo)}
                  a11yLabel={pickerA11yLabel("timeTo")}
                  onPress={() => openPicker("timeTo")}
                />
              </View>
            ) : null}

            {showCategory ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
                  Category
                </Text>
                <View style={styles.rowWrap}>
                  {RECORDING_CATEGORIES.map((cat) => (
                    <Chip
                      key={cat}
                      label={
                        cat === "normal"
                          ? "Normal"
                          : cat === "parking"
                            ? "Parking"
                            : cat === "event"
                              ? "Event"
                              : "Photos"
                      }
                      selected={draft.categories.includes(cat)}
                      onPress={() =>
                        setDraft({ ...draft, categories: toggleIn(draft.categories, cat) })
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
              Media type
            </Text>
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
            onPress={() => {
              onApply(draft);
              requestClose();
            }}
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
            <Text style={[styles.applyText, { color: colors.onBrand }]}>
              Show {draftCount} results
            </Text>
          </Pressable>

          {activePicker && Platform.OS === "android" ? (
            <DateTimePicker
              value={pickerValue(draft, activePicker)}
              mode={pickerMode}
              display="default"
              minuteInterval={1}
              is24Hour
              onChange={onNativeChange}
              testID="local-filter-android-picker"
            />
          ) : null}

          {activePicker && Platform.OS === "ios" ? (
            <Modal
              transparent
              animationType="fade"
              visible
              onRequestClose={dismissPicker}
              testID="local-filter-ios-picker"
            >
              <Pressable
                style={styles.pickerBackdrop}
                onPress={dismissPicker}
                accessibilityLabel="Cancel"
              />
              <View
                style={[
                  styles.iosPickerSheet,
                  {
                    backgroundColor: colors.surfaceElevated,
                    paddingBottom: Math.max(insets.bottom, 12),
                    borderTopLeftRadius: radius.lg,
                    borderTopRightRadius: radius.lg,
                  },
                ]}
              >
                <View style={styles.iosPickerHeader}>
                  <Pressable
                    onPress={dismissPicker}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    hitSlop={HitSlop44}
                    style={styles.headerHit}
                  >
                    <Text style={{ color: colors.textMuted, fontFamily: Type.fontSemi, fontSize: 16 }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => commitPicker(iosTemp ?? pickerValue(draft, activePicker))}
                    accessibilityRole="button"
                    accessibilityLabel="Done"
                    hitSlop={HitSlop44}
                    style={styles.headerHit}
                  >
                    <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 16 }}>
                      Done
                    </Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={iosTemp ?? pickerValue(draft, activePicker)}
                  mode={pickerMode}
                  display="spinner"
                  minuteInterval={1}
                  is24Hour
                  onChange={onNativeChange}
                  style={{ alignSelf: "center" }}
                />
              </View>
            </Modal>
          ) : null}
        </View>
      )}
    </StaticBackdropSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: { flexShrink: 1 },
  scroll: { flexShrink: 1 },
  handleRow: { alignItems: "center", paddingTop: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  sheetHeader: {
    height: LOCAL_ACTION_HIT + 8,
    justifyContent: "center",
    marginBottom: 4,
  },
  headerSide: {
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    width: 88,
    justifyContent: "center",
    zIndex: 1,
  },
  headerSideRight: { left: undefined, right: 8, alignItems: "flex-end" },
  headerHit: {
    minWidth: LOCAL_ACTION_HIT,
    minHeight: LOCAL_ACTION_HIT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  sheetTitle: {
    textAlign: "center",
    fontSize: 17,
    fontFamily: Type.fontBold,
  },
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
  fieldBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    minHeight: LOCAL_ACTION_HIT,
    justifyContent: "center",
  },
  fieldLabel: { fontSize: 11, fontFamily: Type.fontSemi, marginBottom: 2 },
  fieldValue: { fontSize: 15, fontFamily: Type.fontSemi },
  rangeRow: { flexDirection: "row", gap: 8 },
  applyBtn: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  applyText: { fontSize: 16, fontFamily: Type.fontBold },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  iosPickerSheet: { marginTop: "auto", width: "100%", paddingTop: 4 },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: LOCAL_ACTION_HIT,
    alignItems: "center",
  },
});
