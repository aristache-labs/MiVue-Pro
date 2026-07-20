import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { CompactDownloadAction } from "@/components/camera/CompactDownloadAction";
import { CameraThumb } from "@/components/camera/CameraThumb";
import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";
import { shouldEnqueueOnDownloadPress } from "@/components/camera/remoteDownloadState";
import { formatDuration } from "@/components/mediaMeta";
import { MediaCard } from "@/components/media/MediaCard";
import { MEDIA_THUMB_H, MEDIA_THUMB_W } from "@/components/media/mediaCardTokens";
import { formatRecordingDateTime } from "@/components/media/recordingDateTime";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { useAppTheme } from "@/constants/Theme";
import type { RemoteFile } from "@/packages/parsers/src/index";

function displayMediaName(name: string): string {
  return name.replace(/\.(mp4|mov|m4v|jpg|jpeg|png|webp)$/iu, "");
}

interface RemoteRecordingCardProps {
  readonly file: RemoteFile;
  readonly downloadState: RemoteDownloadUiState;
  readonly thumbActive?: boolean;
  readonly onDownload: (file: RemoteFile) => void;
  readonly onOpenDownloaded?: (file: RemoteFile) => void;
  readonly onOpenDetail?: (file: RemoteFile) => void;
  /** Resume paused transfer (queue id handled by parent). */
  readonly onResume?: (file: RemoteFile) => void;
}

export const RemoteRecordingCard = memo(function RemoteRecordingCard({
  file,
  downloadState,
  thumbActive = true,
  onDownload,
  onOpenDownloaded,
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

  const openBody = useCallback(() => {
    if (isDownloaded && onOpenDownloaded) {
      onOpenDownloaded(file);
      return;
    }
    onOpenDetail?.(file);
  }, [file, isDownloaded, onOpenDownloaded, onOpenDetail]);

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

  return (
    <MediaCard
      source="camera"
      title={displayMediaName(file.name)}
      whenLabel={when}
      sizeLabel={sizeLabel}
      categoryLabel={CATEGORY_LABEL[file.category]}
      categoryAccent={catAccent}
      durationLabel={duration}
      onThumbPress={openBody}
      thumbAccessibilityLabel={
        isDownloaded ? `Play ${file.name}` : `Details for ${file.name}`
      }
      onBodyPress={openBody}
      bodyAccessibilityLabel={`${file.name}, ${CATEGORY_LABEL[file.category]}${when ? `, ${when}` : ""}`}
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
        isDownloaded ? (
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
                  name="play"
                  size={16}
                  color={colors.brand}
                  style={{ marginLeft: 2 }}
                />
              </View>
            </View>
          </>
        ) : null
      }
      actions={
        <CompactDownloadAction
          fileName={file.name}
          state={downloadState}
          onPress={onAction}
        />
      }
    />
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
});
