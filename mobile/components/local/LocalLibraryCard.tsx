import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { formatDuration } from "@/components/mediaMeta";
import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import { LOCAL_LONG_PRESS_MS } from "@/components/local/localLibrarySelection";
import { formatCompactDateTime } from "@/components/local/localLibrarySections";
import { MediaCard, mediaCardActionHitStyle } from "@/components/media/MediaCard";
import { MEDIA_THUMB_H, MEDIA_THUMB_W } from "@/components/media/mediaCardTokens";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { useAppTheme } from "@/constants/Theme";
import type { LocalMediaFile } from "@/context/DemoModeContext";
import type { FileCategory } from "@/packages/parsers/src/index";
import { Haptics } from "@/src/utils/haptics";

function displayMediaName(name: string): string {
  return name.replace(/\.(mp4|mov|m4v|jpg|jpeg|png|webp)$/iu, "");
}

function openLocalMedia(item: LocalMediaFile): void {
  const href =
    `/player?uri=${encodeURIComponent(item.uri)}&name=${encodeURIComponent(item.name)}&kind=${item.kind}` as const;
  router.push(href as Parameters<typeof router.push>[0]);
}

export interface LocalLibraryCardProps {
  readonly item: LocalMediaFile;
  readonly category: FileCategory;
  readonly durationSec?: number;
  readonly selecting: boolean;
  readonly selected: boolean;
  readonly onToggleSelect: (uri: string) => void;
  /** Enter selection mode with this item selected (long press / a11y). */
  readonly onEnterSelection: (uri: string) => void;
  readonly onShare: (file: LocalMediaFile) => void;
  readonly onDelete: (file: LocalMediaFile) => void;
}

/** Local Library row — long-press enters selection; tap plays or toggles. */
export const LocalLibraryCard = memo(function LocalLibraryCard({
  item,
  category,
  durationSec,
  selecting,
  selected,
  onToggleSelect,
  onEnterSelection,
  onShare,
  onDelete,
}: LocalLibraryCardProps) {
  const { colors, scheme } = useAppTheme();
  const when = formatCompactDateTime(item.name);
  const sizeLabel = item.sizeBytes > 0 ? formatMediaSizeMbGb(item.sizeBytes) : "—";
  const typeLabel = CATEGORY_LABEL[category];
  const catAccent = categoryColor(category, scheme);
  const playA11y = item.kind === "image" ? `View ${item.name}` : `Play ${item.name}`;
  const suppressPressRef = useRef(false);

  const handlePress = () => {
    if (suppressPressRef.current) {
      suppressPressRef.current = false;
      return;
    }
    if (selecting) {
      Haptics.selection();
      onToggleSelect(item.uri);
      return;
    }
    openLocalMedia(item);
  };

  const handleLongPress = () => {
    suppressPressRef.current = true;
    if (selecting) {
      Haptics.selection();
      onToggleSelect(item.uri);
      return;
    }
    Haptics.medium();
    onEnterSelection(item.uri);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={LOCAL_LONG_PRESS_MS}
      accessibilityRole={selecting ? "checkbox" : "button"}
      accessibilityLabel={
        selecting
          ? selected
            ? `Deselect ${item.name}`
            : `Select ${item.name}`
          : playA11y
      }
      accessibilityHint={
        selecting ? undefined : "Double tap to play. Long press to select"
      }
      accessibilityState={selecting ? { selected, checked: selected } : undefined}
      accessibilityActions={
        selecting ? undefined : [{ name: "select", label: "Select" }]
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "select") {
          onEnterSelection(item.uri);
        }
      }}
    >
      <MediaCard
        source="local"
        title={displayMediaName(item.name)}
        whenLabel={when}
        sizeLabel={sizeLabel}
        categoryLabel={typeLabel}
        categoryAccent={catAccent}
        durationLabel={
          durationSec !== undefined && durationSec > 0 ? formatDuration(durationSec) : undefined
        }
        selected={selecting && selected}
        selecting={selecting}
        thumbnail={
          <VideoThumbnail
            uri={item.uri}
            kind={item.kind}
            width={MEDIA_THUMB_W}
            height={MEDIA_THUMB_H}
          />
        }
        thumbnailOverlay={
          selecting ? (
            <View pointerEvents="none" style={styles.selectMarkHit}>
              <View
                style={[
                  styles.selectMarkHalo,
                  { backgroundColor: colors.bg, opacity: 0.4 },
                ]}
              />
              <View
                style={[
                  styles.selectMark,
                  selected
                    ? { backgroundColor: colors.brand, borderColor: colors.brand }
                    : {
                        backgroundColor: "transparent",
                        borderColor: colors.surfaceElevated,
                      },
                ]}
              >
                {selected ? (
                  <Ionicons name="checkmark" size={14} color={colors.onBrand} />
                ) : null}
              </View>
            </View>
          ) : (
            <>
              <View
                pointerEvents="none"
                style={[styles.thumbScrim, { backgroundColor: colors.bg, opacity: 0.35 }]}
              />
              <View pointerEvents="none" style={styles.playHit}>
                <View
                  style={[
                    styles.playGlyph,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name={item.kind === "image" ? "eye" : "play"}
                    size={16}
                    color={colors.brand}
                    style={item.kind === "image" ? undefined : { marginLeft: 2 }}
                  />
                </View>
              </View>
            </>
          )
        }
        actions={
          !selecting ? (
            <View style={styles.actions}>
              <Pressable
                onPress={() => onShare(item)}
                accessibilityRole="button"
                accessibilityLabel={`Share ${item.name}`}
                hitSlop={4}
                style={({ pressed }) => [mediaCardActionHitStyle, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="share-outline" size={22} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => onDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
                hitSlop={4}
                style={({ pressed }) => [mediaCardActionHitStyle, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
          ) : undefined
        }
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  thumbScrim: {
    ...StyleSheet.absoluteFillObject,
    top: undefined,
    height: 28,
  },
  playHit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  selectMarkHit: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  selectMarkHalo: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
});
