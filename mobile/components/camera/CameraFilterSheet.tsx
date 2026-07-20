import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  EMPTY_CAMERA_FILTERS,
  type CameraLibraryFilters,
  type DownloadedFilter,
} from "@/components/camera/cameraLibraryModel";
import {
  datePreset,
  localTodayKey,
  TIME_PRESETS,
  type MediaTypeFilter,
  type RecordingCategory,
} from "@/components/local/localLibraryFilters";
import { LOCAL_ACTION_HIT } from "@/components/local/localLibrarySections";
import { Type, useAppTheme } from "@/constants/Theme";

interface CameraFilterSheetProps {
  readonly visible: boolean;
  readonly initial: CameraLibraryFilters;
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

function toggleCat(list: readonly RecordingCategory[], cat: RecordingCategory): RecordingCategory[] {
  return list.includes(cat) ? list.filter((c) => c !== cat) : [...list, cat];
}

function toggleMedia(list: readonly MediaTypeFilter[], mt: MediaTypeFilter): MediaTypeFilter[] {
  return list.includes(mt) ? list.filter((m) => m !== mt) : [...list, mt];
}

export function CameraFilterSheet({ visible, initial, onClose, onApply }: CameraFilterSheetProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);
  const today = localTodayKey();

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.avoid}>
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
              onPress={() => setDraft(EMPTY_CAMERA_FILTERS)}
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
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 16 }}
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
                selected={draft.dateMode === "range"}
                onPress={() => setDraft({ ...draft, ...datePreset("last7", today) })}
              />
            </View>

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
              {(Object.keys(TIME_PRESETS) as (keyof typeof TIME_PRESETS)[]).map((key) => (
                <Chip
                  key={key}
                  label={key[0]!.toUpperCase() + key.slice(1)}
                  selected={
                    draft.timeMode === "range" &&
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

            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
              Category
            </Text>
            <View style={styles.rowWrap}>
              {(["normal", "parking", "event"] as const).map((cat) => (
                <Chip
                  key={cat}
                  label={cat[0]!.toUpperCase() + cat.slice(1)}
                  selected={draft.categories.includes(cat)}
                  onPress={() => setDraft({ ...draft, categories: toggleCat(draft.categories, cat) })}
                />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
              Media type
            </Text>
            <View style={styles.rowWrap}>
              {(["video", "image"] as const).map((mt) => (
                <Chip
                  key={mt}
                  label={mt === "video" ? "Videos" : "Photos"}
                  selected={draft.mediaTypes.includes(mt)}
                  onPress={() => setDraft({ ...draft, mediaTypes: toggleMedia(draft.mediaTypes, mt) })}
                />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
              Downloaded
            </Text>
            <View style={styles.rowWrap}>
              {(
                [
                  ["any", "Any"],
                  ["downloaded", "Downloaded"],
                  ["not_downloaded", "Not downloaded"],
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

            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>
              Duration
            </Text>
            <View style={styles.rowWrap}>
              <Chip
                label="Any"
                selected={draft.durationMinSec === undefined && draft.durationMaxSec === undefined}
                onPress={() =>
                  setDraft({ ...draft, durationMinSec: undefined, durationMaxSec: undefined })
                }
              />
              <Chip
                label="Under 1 min"
                selected={draft.durationMaxSec === 60 && draft.durationMinSec === undefined}
                onPress={() =>
                  setDraft({ ...draft, durationMinSec: undefined, durationMaxSec: 60 })
                }
              />
              <Chip
                label="1–5 min"
                selected={draft.durationMinSec === 60 && draft.durationMaxSec === 300}
                onPress={() => setDraft({ ...draft, durationMinSec: 60, durationMaxSec: 300 })}
              />
              <Chip
                label="Over 5 min"
                selected={draft.durationMinSec === 300 && draft.durationMaxSec === undefined}
                onPress={() =>
                  setDraft({ ...draft, durationMinSec: 300, durationMaxSec: undefined })
                }
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={[styles.footerBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.textMuted, fontFamily: Type.fontSemi }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
              style={[styles.footerBtn, { backgroundColor: colors.brand, borderColor: colors.brand }]}
            >
              <Text style={{ color: colors.onBrand, fontFamily: Type.fontSemi }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoid: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "88%", borderTopWidth: StyleSheet.hairlineWidth },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetTitle: { fontSize: 17, fontFamily: Type.fontBold },
  headerBtn: { minHeight: 44, justifyContent: "center" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontFamily: Type.fontSemi },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
