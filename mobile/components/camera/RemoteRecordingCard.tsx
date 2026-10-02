import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useCallback, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { CompactDownloadAction } from "@/components/camera/CompactDownloadAction";
import { CameraThumb } from "@/components/camera/CameraThumb";
import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import { librarySelectionCardA11y } from "@/components/camera/remoteDownloadA11y";
import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";
import { shouldEnqueueOnDownloadPress } from "@/components/camera/remoteDownloadState";
import { LOCAL_LONG_PRESS_MS } from "@/components/local/localLibrarySelection";
import { formatDuration } from "@/components/mediaMeta";
import { MediaCard } from "@/components/media/MediaCard";
import { MEDIA_THUMB_H, MEDIA_THUMB_W } from "@/components/media/mediaCardTokens";
import { formatRecordingDateTime } from "@/components/media/recordingDateTime";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { useAppTheme } from "@/constants/Theme";
import type { RemoteFile } from "@/packages/parsers/src/index";
import { Haptics } from "@/src/utils/haptics";
import { usePressAnimation } from "@/src/hooks/usePressAnimation";

function displayMediaName(name: string): string {
  return name.replace(/\.(mp4|mov|m4v|jpg|jpeg|png|webp)$/iu, "");
}

interface RemoteRecordingCardProps {
  readonly file: RemoteFile;
  readonly downloadState: RemoteDownloadUiState;
  readonly thumbActive?: boolean;
  readonly selecting?: boolean;
  readonly selected?: boolean;
  readonly onToggleSelect?: (path: string) => void;
  /** Long-press in normal mode enters selection with this file. */
  readonly onLongPressSelect?: (path: string) => void;
  readonly onDownload: (file: RemoteFile) => void;
  readonly onOpenDownloaded?: (file: RemoteFile) => void;
  readonly onPreview?: (file: RemoteFile) => void;
  readonly onOpenDetail?: (file: RemoteFile) => void;
  /** Resume paused transfer (queue id handled by parent). */
  readonly onResume?: (file: RemoteFile) => void;
}

export const RemoteRecordingCard = memo(function RemoteRecordingCard({
  file,
  downloadState,
  thumbActive = true,
  selecting = false,
  selected = false,
  onToggleSelect,
  onLongPressSelect,
  onDownload,
  onOpenDownloaded,
  onPreview,
  onOpenDetail,
  onResume,
}: RemoteRecordingCardProps) {
  const { colors, scheme } = useAppTheme();
  const catAccent = categoryColor(file.category, scheme);
  const when = formatRecordingDateTime(file.recordedAt);
  const sizeLabel = formatMediaSizeMbGb(file.sizeBytes);
  const duration =
    file.durationSeconds !== undefined && file.durationSeconds > 0
      ? formatDuration(file.durationSeconds)
      : undefined;
  const isDownloaded = downloadState.kind === "downloaded";
  const isPhoto = file.category === "photo";
  const suppressPressRef = useRef(false);
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  const openBody = useCallback(() => {
    if (suppressPressRef.current) {
      suppressPressRef.current = false;
      return;
    }
    onOpenDetail?.(file);
  }, [file, onOpenDetail]);

  const openThumbnail = useCallback(() => {
    if (suppressPressRef.current) {
      suppressPressRef.current = false;
      return;
    }
    if (isDownloaded) {
      onOpenDownloaded?.(file);
      return;
    }
    onPreview?.(file);
  }, [file, isDownloaded, onOpenDownloaded, onPreview]);

  const onAction = useCallback(() => {
    if (downloadState.kind === "downloaded") {
      onOpenDownloaded?.(file);
      return;
    }
    if (downloadState.kind === "paused") {
      onResume?.(file);
      return;
    }
    if (shouldEnqueueOnDownloadPress(downloadState)) {
      onDownload(file);
    }
  }, [downloadState, file, onDownload, onOpenDownloaded, onResume]);

  const handlePress = useCallback(() => {
    if (suppressPressRef.current) {
      suppressPressRef.current = false;
      return;
    }
    if (selecting) {
      Haptics.selection();
      onToggleSelect?.(file.path);
      return;
    }
    openBody();
  }, [selecting, onToggleSelect, file.path, openBody]);

  const handleLongPress = useCallback(() => {
    suppressPressRef.current = true;
    if (selecting) {
      Haptics.selection();
      onToggleSelect?.(file.path);
      return;
    }
    Haptics.medium();
    onLongPressSelect?.(file.path);
  }, [selecting, onToggleSelect, onLongPressSelect, file.path]);

  /** Preview overlay is available for video and photo thumbnails outside selection mode. */
  const showPreviewOverlay = !selecting;
  const previewA11y = isPhoto ? `View ${file.name}` : `Play ${file.name}`;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={LOCAL_LONG_PRESS_MS}
      accessibilityRole={selecting ? "checkbox" : "button"}
      accessibilityLabel={
        selecting
          ? librarySelectionCardA11y(file.name, downloadState, selected)
          : `Details for ${file.name}`
      }
      accessibilityHint={
        selecting ? undefined : "Double tap to open. Long press to select"
      }
      accessibilityState={selecting ? { selected, checked: selected } : undefined}
      accessibilityActions={
        selecting || !onLongPressSelect
          ? undefined
          : [{ name: "select", label: "Select" }]
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "select") {
          onLongPressSelect?.(file.path);
        }
      }}
      testID={selecting ? "library-selection-card" : "library-recording-card"}
    >
      <MediaCard
        source="camera"
        title={displayMediaName(file.name)}
        whenLabel={when}
        sizeLabel={sizeLabel}
        categoryLabel={CATEGORY_LABEL[file.category]}
        categoryAccent={catAccent}
        durationLabel={duration}
        selected={selecting && selected}
        selecting={selecting}
        onThumbPress={selecting ? handlePress : openThumbnail}
        onThumbLongPress={handleLongPress}
        thumbAccessibilityLabel={previewA11y}
        onBodyPress={selecting ? handlePress : openBody}
        onBodyLongPress={handleLongPress}
        bodyAccessibilityLabel={`Details for ${file.name}`}
        thumbnail={
          <CameraThumb
            remotePath={file.path}
            category={file.category}
            width={MEDIA_THUMB_W}
            height={MEDIA_THUMB_H}
            active={thumbActive}
          />
        }
        thumbnailOverlay={
          selecting ? (
            <View pointerEvents="none" style={styles.selectMarkHit}>
              <View
                style={[
                  styles.selectMark,
                  selected
                    ? { backgroundColor: colors.brand, borderColor: colors.brand }
                    : {
                        backgroundColor: "transparent",
                        borderColor: "rgba(255,255,255,0.95)",
                        shadowColor: "#000",
                        shadowOpacity: 0.55,
                        shadowRadius: 1.5,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 2,
                      },
                ]}
              >
                {selected ? (
                  <Ionicons name="checkmark" size={14} color={colors.onBrand} />
                ) : null}
              </View>
            </View>
          ) : showPreviewOverlay ? (
            <>
              <View
                pointerEvents="none"
                style={[styles.thumbScrim, { backgroundColor: colors.bg, opacity: 0.35 }]}
              />
              <View pointerEvents="none" style={styles.playHit} testID="library-play-overlay">
                <View
                  style={[
                    styles.playGlyph,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name={isPhoto ? "eye" : "play"}
                    size={16}
                    color={colors.brand}
                    style={isPhoto ? undefined : { marginLeft: 2 }}
                  />
                </View>
              </View>
            </>
          ) : null
        }
        actions={
          selecting ? undefined : (
            <CompactDownloadAction
              fileName={file.name}
              state={downloadState}
              onPress={onAction}
            />
          )
        }
      />
    </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  thumbScrim: {
    ...StyleSheet.absoluteFill,
    top: undefined,
    height: 28,
  },
  playHit: {
    ...StyleSheet.absoluteFill,
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
  /** Top-left — duration badge stays bottom-leading on MediaCard. */
  selectMarkHit: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  selectMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
