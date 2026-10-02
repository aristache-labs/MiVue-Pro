import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  cameraFilterDraftIssue,
  countFilteredRemoteFiles,
  EMPTY_CAMERA_FILTERS,
  isCameraFiltersEmpty,
  showCategorySectionInFilters,
  type CameraFilterCategory,
  type CameraLibraryFilters,
  type CategoryFilter,
  type DownloadedFilter,
} from "@/components/camera/cameraLibraryModel";
import {
  dateToDayKey,
  dateToHhmm,
  dayKeyToDate,
  formatDayDisplay,
  formatTimeDisplay,
  hhmmToDate,
  pickerA11yLabel,
  type PickerField,
} from "@/components/local/localDateTime";
import { datePreset, localTodayKey } from "@/components/local/localLibraryFilters";
import { LOCAL_ACTION_HIT } from "@/components/local/localLibrarySections";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { MEDIA_SHEET_PAD_H, MEDIA_SHEET_RADIUS } from "@/components/media/mediaCardTokens";
import { HeaderDivider } from "@/components/navigation/HeaderDivider";
import {
  CompactSheetHeader,
  SHEET_BODY_PAD_TOP,
  SHEET_HEADER_TO_DIVIDER,
} from "@/components/sheets/SheetHeader";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useVerticalOverflow } from "@/hooks/useVerticalOverflow";
import type { RemoteFile } from "@/packages/parsers/src/index";

interface CameraFilterSheetProps {
  readonly visible: boolean;
  readonly initial: CameraLibraryFilters;
  readonly categoryScope: CategoryFilter;
  readonly files: readonly RemoteFile[];
  readonly search: string;
  readonly downloadedNames: ReadonlySet<string>;
  readonly queuedNames: ReadonlySet<string>;
  readonly onClose: () => void;
  readonly onApply: (filters: CameraLibraryFilters) => void;
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
      {label ? <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text> : null}
      <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

function toggleIn<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function pickerValue(draft: CameraLibraryFilters, field: PickerField): Date {
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
  draft: CameraLibraryFilters,
  field: PickerField,
  date: Date,
): CameraLibraryFilters {
  if (!Number.isFinite(date.getTime())) return draft;
  if (field === "singleDay") return { ...draft, singleDay: dateToDayKey(date) };
  if (field === "rangeStart") return { ...draft, rangeStart: dateToDayKey(date) };
  if (field === "rangeEnd") return { ...draft, rangeEnd: dateToDayKey(date) };
  if (field === "singleTime") return { ...draft, singleTime: dateToHhmm(date) };
  if (field === "timeFrom") return { ...draft, timeFrom: dateToHhmm(date) };
  return { ...draft, timeTo: dateToHhmm(date) };
}

/**
 * Camera Library filters — Date / Time / Category(All) / Download state.
 * Uses StaticBackdropSheet (same scrim as media details).
 */
export function CameraFilterSheet({
  visible,
  initial,
  categoryScope,
  files,
  search,
  downloadedNames,
  queuedNames,
  onClose,
  onApply,
}: CameraFilterSheetProps) {
  const { scheme, colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);
  /** Single active picker — same overlay pattern as LocalFilterSheet. */
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);
  const [iosTemp, setIosTemp] = useState<Date | null>(null);
  const openingRef = useRef(false);
  const today = localTodayKey();
  const showCategory = showCategorySectionInFilters(categoryScope);
  const resetDisabled = isCameraFiltersEmpty(draft);
  const draftIssue = cameraFilterDraftIssue(draft);
  const { hasOverflow, onViewportLayout, onContentSizeChange } = useVerticalOverflow();

  useEffect(() => {
    if (!visible) return;
    setDraft(initial);
    setActivePicker(null);
    setIosTemp(null);
    openingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open
  }, [visible]);

  const draftCount = useMemo(
    () =>
      draftIssue
        ? 0
        : countFilteredRemoteFiles({
            files,
            category: categoryScope,
            search,
            filters: draft,
            downloadedNames,
            queuedNames,
          }),
    [files, categoryScope, search, draft, downloadedNames, queuedNames, draftIssue],
  );

  const pickerMode: "date" | "time" =
    activePicker === "singleTime" || activePicker === "timeFrom" || activePicker === "timeTo"
      ? "time"
      : "date";

  const dismissPicker = useCallback(() => {
    setActivePicker(null);
    setIosTemp(null);
    openingRef.current = false;
  }, []);

  const openPicker = (field: PickerField) => {
    if (openingRef.current || activePicker) return;
    openingRef.current = true;
    const value = pickerValue(draft, field);
    if (!Number.isFinite(value.getTime())) {
      openingRef.current = false;
      return;
    }
    setIosTemp(value);
    setActivePicker(field);
    openingRef.current = false;
  };

  const commitPicker = (date: Date) => {
    if (!activePicker || !Number.isFinite(date.getTime())) {
      dismissPicker();
      return;
    }
    setDraft((prev) => applyPickerDate(prev, activePicker, date));
    dismissPicker();
  };

  const onPickerValueChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    if (!Number.isFinite(date.getTime()) || !activePicker) return;
    if (Platform.OS === "android") {
      commitPicker(date);
      return;
    }
    setIosTemp(date);
  };

  const onPickerDismiss = () => {
    dismissPicker();
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
      scrimTestID="camera-filter-scrim"
      sheetTestID="camera-filter-sheet"
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
            <CompactSheetHeader
              title="Filters"
              compact
              showHandle
              dividerInset={MEDIA_SHEET_PAD_H}
              onClose={() => {
                if (activePicker) {
                  dismissPicker();
                  return;
                }
                requestClose();
              }}
              closeAccessibilityLabel="Close filters"
              leftAction={
                <Pressable
                  onPress={() => setDraft(EMPTY_CAMERA_FILTERS)}
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
              }
            />

            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: MEDIA_SHEET_PAD_H,
                paddingTop: SHEET_BODY_PAD_TOP,
                paddingBottom: 12,
              }}
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
                <Chip
                  label="Today"
                  selected={draft.dateMode === "single" && draft.singleDay === today}
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

              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
                Time
              </Text>
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
                    setDraft({
                      ...draft,
                      timeMode: "single",
                      singleTime: draft.singleTime ?? "12:00",
                    })
                  }
                />
                <Chip
                  label="Time range"
                  selected={draft.timeMode === "range"}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      timeMode: "range",
                      timeFrom: draft.timeFrom ?? "22:00",
                      timeTo: draft.timeTo ?? "03:00",
                    })
                  }
                />
              </View>
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
                    {(["normal", "parking", "event", "photo"] as CameraFilterCategory[]).map(
                      (cat) => (
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
                            setDraft({
                              ...draft,
                              categories: toggleIn(draft.categories, cat),
                            })
                          }
                        />
                      ),
                    )}
                  </View>
                </>
              ) : null}

              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
                Download state
              </Text>
              <View style={styles.rowWrap}>
                {(
                  [
                    ["any", "Any"],
                    ["downloaded", "Downloaded"],
                    ["not_downloaded", "Not downloaded"],
                    ["in_queue", "In queue"],
                  ] as const
                ).map(([id, label]) => (
                  <Chip
                    key={id}
                    label={label}
                    selected={draft.downloaded === id}
                    onPress={() => setDraft({ ...draft, downloaded: id as DownloadedFilter })}
                  />
                ))}
              </View>
            </ScrollView>

            {draftIssue ? (
              <Text
                style={[styles.issue, { color: colors.warn, paddingHorizontal: MEDIA_SHEET_PAD_H }]}
              >
                {draftIssue}
              </Text>
            ) : null}

            <Pressable
              onPress={() => {
                if (draftIssue) return;
                onApply({
                  ...draft,
                  durationMinSec: undefined,
                  durationMaxSec: undefined,
                  sizeMinBytes: undefined,
                  sizeMaxBytes: undefined,
                });
                requestClose();
              }}
              disabled={Boolean(draftIssue)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${draftCount} results`}
              accessibilityState={{ disabled: Boolean(draftIssue) }}
              style={({ pressed }) => [
                styles.applyBtn,
                {
                  backgroundColor: colors.brand,
                  marginHorizontal: spacing.lg,
                  opacity: draftIssue ? 0.45 : pressed ? 0.85 : 1,
                  minHeight: LOCAL_ACTION_HIT,
                },
              ]}
            >
              <Text style={[styles.applyText, { color: colors.onBrand }]}>
                Show {draftCount} results
              </Text>
            </Pressable>

            {/* Same picker UX as LocalFilterSheet: Android dialog / iOS overlay Modal */}
            {activePicker && Platform.OS === "android" ? (
              <DateTimePicker
                value={pickerValue(draft, activePicker)}
                mode={pickerMode}
                display="default"
                minuteInterval={1}
                is24Hour
                onValueChange={onPickerValueChange}
                onDismiss={onPickerDismiss}
                testID="camera-filter-android-picker"
              />
            ) : null}

            {activePicker && Platform.OS === "ios" ? (
              <Modal
                transparent
                animationType="fade"
                visible
                onRequestClose={dismissPicker}
                testID="camera-filter-ios-picker"
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
                  <HeaderDivider
                    variant="sheet"
                    inset={MEDIA_SHEET_PAD_H}
                    style={{ marginTop: SHEET_HEADER_TO_DIVIDER }}
                    testID="camera-filter-ios-picker-divider"
                  />
                <DateTimePicker
                  value={iosTemp ?? pickerValue(draft, activePicker)}
                  mode={pickerMode}
                  display="spinner"
                  minuteInterval={1}
                  is24Hour
                  themeVariant={scheme}
                  textColor={colors.text}
                  onValueChange={onPickerValueChange}
                  onDismiss={onPickerDismiss}
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
  headerHit: {
    minWidth: LOCAL_ACTION_HIT,
    minHeight: LOCAL_ACTION_HIT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  sectionLabel: { fontSize: 12, fontFamily: Type.fontSemi, marginBottom: 8, letterSpacing: 0.3 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontFamily: Type.fontSemi },
  fieldBtn: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: LOCAL_ACTION_HIT,
    justifyContent: "center",
  },
  fieldLabel: { fontSize: 11, fontFamily: Type.font, marginBottom: 2 },
  fieldValue: { fontSize: 14, fontFamily: Type.fontSemi },
  rangeRow: { flexDirection: "row", gap: 8 },
  issue: { fontSize: 12, fontFamily: Type.font, marginBottom: 6 },
  applyBtn: { alignItems: "center", justifyContent: "center", marginTop: 4, borderRadius: 12 },
  applyText: { fontSize: 15, fontFamily: Type.fontSemi },
  pickerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
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
