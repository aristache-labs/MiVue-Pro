import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CameraThumb } from "@/components/camera/CameraThumb";
import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import {
  remoteDetailPrimaryLabel,
  shouldShowViewInQueue,
} from "@/components/camera/remoteDownloadA11y";
import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";
import { shouldEnqueueOnDownloadPress } from "@/components/camera/remoteDownloadState";
import { formatDuration } from "@/components/mediaMeta";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import {
  MEDIA_SHEET_PAD_H,
  MEDIA_SHEET_RADIUS,
  MEDIA_THUMB_H,
  MEDIA_THUMB_W,
} from "@/components/media/mediaCardTokens";
import { formatRecordingDateTime } from "@/components/media/recordingDateTime";
import { PrimaryButton } from "@/components/ui";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import type { RemoteFile } from "@/packages/parsers/src/index";

interface RemoteDetailSheetProps {
  readonly file: RemoteFile | null;
  readonly downloadState: RemoteDownloadUiState | null;
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onDownload: (file: RemoteFile) => void;
  readonly onResume?: (file: RemoteFile) => void;
  readonly onPlay?: (file: RemoteFile) => void;
  readonly onViewQueue?: () => void;
}

/**
 * Camera recording detail sheet — shared StaticBackdropSheet with Filters.
 */
export function RemoteDetailSheet({
  file,
  downloadState,
  visible,
  onClose,
  onDownload,
  onResume,
  onPlay,
  onViewQueue,
}: RemoteDetailSheetProps) {
  const { colors, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const open = visible && file !== null && downloadState !== null;

  return (
    <StaticBackdropSheet
      visible={open}
      onClose={onClose}
      scrimTestID="remote-detail-scrim"
      sheetTestID="remote-detail-sheet"
      sheetStyle={{
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
        borderTopLeftRadius: MEDIA_SHEET_RADIUS,
        borderTopRightRadius: MEDIA_SHEET_RADIUS,
        paddingHorizontal: MEDIA_SHEET_PAD_H,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 16),
        gap: 12,
      }}
    >
      {({ requestClose }) => {
        if (!file || !downloadState) return null;
        const catAccent = categoryColor(file.category, scheme);
        const when = formatRecordingDateTime(file.recordedAt);
        const sizeLabel = formatMediaSizeMbGb(file.sizeBytes);
        const duration =
          file.durationSeconds !== undefined && file.durationSeconds > 0
            ? formatDuration(file.durationSeconds)
            : undefined;
        const primary = remoteDetailPrimaryLabel(downloadState);
        const showQueue = shouldShowViewInQueue(downloadState);
        const primaryEnabled =
          shouldEnqueueOnDownloadPress(downloadState) ||
          downloadState.kind === "paused" ||
          downloadState.kind === "downloaded";

        const onPrimary = () => {
          if (downloadState.kind === "downloaded") {
            onPlay?.(file);
            return;
          }
          if (downloadState.kind === "paused") {
            onResume?.(file);
            return;
          }
          if (shouldEnqueueOnDownloadPress(downloadState)) {
            onDownload(file);
          }
        };

        return (
          <>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.headerRow}>
              <CameraThumb
                remotePath={file.path}
                category={file.category}
                width={MEDIA_THUMB_W}
                height={MEDIA_THUMB_H}
                active
              />
              <View style={styles.headerBody}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={2}>
                  {file.name}
                </Text>
                <View style={[styles.catBadge, { backgroundColor: catAccent + "22" }]}>
                  <Text style={[styles.catText, { color: catAccent }]}>
                    {CATEGORY_LABEL[file.category]}
                  </Text>
                </View>
                {when ? (
                  <Text style={[styles.when, { color: colors.textMuted }]} numberOfLines={1}>
                    {when}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={requestClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={HitSlop44}
                style={styles.closeHit}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.metaBlock}>
              <View style={styles.metaCols}>
                <View style={styles.metaCol}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Size</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
                    {sizeLabel}
                  </Text>
                </View>
                {duration ? (
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Duration</Text>
                    <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
                      {duration}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <PrimaryButton
              label={primary}
              onPress={onPrimary}
              disabled={!primaryEnabled}
              icon={
                downloadState.kind === "downloaded"
                  ? "play"
                  : downloadState.kind === "failed"
                    ? "refresh"
                    : downloadState.kind === "paused"
                      ? "play"
                      : "download-outline"
              }
              accessibilityLabel={`${primary} ${file.name}`}
            />
            {showQueue && onViewQueue ? (
              <PrimaryButton
                label="View download queue"
                variant="outline"
                onPress={() => {
                  onViewQueue();
                  requestClose();
                }}
                accessibilityLabel="View download queue"
              />
            ) : null}
          </>
        );
      }}
    </StaticBackdropSheet>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerBody: { flex: 1, minWidth: 0, gap: 6 },
  fileName: { fontSize: 16, fontFamily: Type.fontSemi },
  catBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  catText: { fontSize: 10, fontFamily: Type.fontSemi },
  when: { fontSize: 13, fontFamily: Type.font },
  closeHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
    marginRight: -8,
  },
  metaBlock: { marginBottom: 4 },
  metaCols: { flexDirection: "row", gap: 16 },
  metaCol: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 12, fontFamily: Type.font },
  metaValue: { fontSize: 14, fontFamily: Type.fontSemi },
});
