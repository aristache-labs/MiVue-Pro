import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CameraThumb } from "@/components/camera/CameraThumb";
import {
  formatMediaSizeMbGb,
  formatRemoteDateTime,
} from "@/components/camera/cameraLibraryModel";
import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";
import { formatDuration } from "@/components/mediaMeta";
import { Card } from "@/components/ui";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import type { RemoteFile } from "@/packages/parsers/src/index";

const THUMB_W = 84;
const THUMB_H = 63;

interface RemoteRecordingCardProps {
  readonly file: RemoteFile;
  readonly downloadState: RemoteDownloadUiState;
  readonly thumbActive?: boolean;
  readonly onDownload: (file: RemoteFile) => void;
  readonly onOpenDownloaded?: (file: RemoteFile) => void;
  readonly onOpenDetail?: (file: RemoteFile) => void;
}

function actionLabel(state: RemoteDownloadUiState): string {
  switch (state.kind) {
    case "queued":
      return state.position > 0 ? `Queued · #${state.position}` : "Queued";
    case "downloading":
      return `Downloading · ${state.percent}%`;
    case "paused":
      return "Paused";
    case "downloaded":
      return "Downloaded";
    case "failed":
      return "Retry";
    default:
      return "Download";
  }
}

export const RemoteRecordingCard = memo(function RemoteRecordingCard({
  file,
  downloadState,
  thumbActive = true,
  onDownload,
  onOpenDownloaded,
  onOpenDetail,
}: RemoteRecordingCardProps) {
  const { colors, radius, scheme } = useAppTheme();
  const catAccent = categoryColor(file.category, scheme);
  const when = formatRemoteDateTime(file.recordedAt);
  const sizeLabel = formatMediaSizeMbGb(file.sizeBytes);
  const duration =
    file.durationSeconds !== undefined && file.durationSeconds > 0
      ? formatDuration(file.durationSeconds)
      : undefined;
  const metaLine = duration ? `${sizeLabel} · ${duration}` : sizeLabel;
  const label = actionLabel(downloadState);
  const canDownload = downloadState.kind === "available" || downloadState.kind === "failed";
  const isDownloaded = downloadState.kind === "downloaded";
  const isStatusOnly = !canDownload && !isDownloaded;

  const onCardPress = () => {
    if (isDownloaded && onOpenDownloaded) {
      onOpenDownloaded(file);
      return;
    }
    onOpenDetail?.(file);
  };

  const actionFg = isDownloaded
    ? colors.success
    : downloadState.kind === "failed"
      ? colors.danger
      : downloadState.kind === "paused"
        ? colors.warn
        : colors.brand;

  return (
    <Card
      style={[
        styles.card,
        { padding: 12, borderRadius: radius.md, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onCardPress}
          accessibilityRole="button"
          accessibilityLabel={isDownloaded ? `Open ${file.name}` : `Details for ${file.name}`}
          style={({ pressed }) => [styles.thumbPress, { opacity: pressed ? 0.85 : 1 }]}
        >
          <CameraThumb
            remotePath={file.path}
            category={file.category}
            width={THUMB_W}
            height={THUMB_H}
            active={thumbActive}
          />
          {duration ? (
            <View
              pointerEvents="none"
              style={[styles.durationBadge, { backgroundColor: colors.bg }]}
            >
              <Text style={[styles.durationText, { color: colors.text }]}>{duration}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={onCardPress}
          style={styles.body}
          accessibilityRole="button"
          accessibilityLabel={`${file.name}, ${CATEGORY_LABEL[file.category]}, ${when}`}
        >
          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {when}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {metaLine}
          </Text>
          {downloadState.kind === "downloading" ? (
            <View
              style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}
              accessibilityLabel={`Downloading ${downloadState.percent} percent`}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(downloadState.percent, 3)}%`,
                    backgroundColor: colors.brand,
                  },
                ]}
              />
            </View>
          ) : null}
        </Pressable>

        <View style={styles.rightCol}>
          <View style={[styles.catBadge, { backgroundColor: catAccent + "22", borderRadius: 4 }]}>
            <Text style={[styles.catText, { color: catAccent }]}>
              {CATEGORY_LABEL[file.category]}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (isDownloaded && onOpenDownloaded) {
                onOpenDownloaded(file);
                return;
              }
              if (canDownload) onDownload(file);
            }}
            disabled={isStatusOnly}
            accessibilityRole="button"
            accessibilityLabel={
              isDownloaded
                ? `${file.name} downloaded`
                : canDownload
                  ? `Download ${file.name}`
                  : `${label} for ${file.name}`
            }
            accessibilityState={{ disabled: isStatusOnly }}
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.action,
              isDownloaded
                ? {
                    borderColor: "transparent",
                    backgroundColor: colors.successSoft,
                  }
                : canDownload
                  ? {
                      borderColor: colors.brand,
                      backgroundColor: colors.brandSoft,
                    }
                  : {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceMuted,
                    },
              { opacity: pressed && !isStatusOnly ? 0.75 : 1 },
            ]}
          >
            {isDownloaded ? (
              <Ionicons name="checkmark" size={14} color={actionFg} />
            ) : canDownload ? (
              <Ionicons name="download-outline" size={14} color={actionFg} />
            ) : downloadState.kind === "downloading" ? (
              <Ionicons name="arrow-down-outline" size={14} color={actionFg} />
            ) : null}
            <Text style={[styles.actionText, { color: actionFg }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {},
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumbPress: { position: "relative" },
  durationBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  durationText: { fontSize: 10, fontFamily: Type.monoMed },
  body: { flex: 1, minWidth: 0, paddingRight: 4 },
  fileName: { fontSize: 14, fontFamily: Type.fontSemi, marginBottom: 2 },
  meta: { fontSize: 12, fontFamily: Type.font, marginTop: 1 },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 6, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    flexShrink: 0,
    maxWidth: 118,
  },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  catText: { fontSize: 10, fontFamily: Type.fontSemi },
  action: {
    minHeight: 44,
    minWidth: 44,
    maxWidth: 118,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionText: { fontSize: 12, fontFamily: Type.fontSemi, flexShrink: 1 },
});
