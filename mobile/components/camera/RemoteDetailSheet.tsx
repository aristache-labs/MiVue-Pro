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
import { CompactMediaCategoryBadge } from "@/components/media/CompactMediaCategoryBadge";
import { SheetCloseButton } from "@/components/media/SheetCloseButton";
import { formatRecordingDateTime } from "@/components/media/recordingDateTime";
import { HeaderDivider } from "@/components/navigation/HeaderDivider";
import {
  SHEET_BODY_PAD_TOP,
  SHEET_HEADER_HANDLE_TO_ROW,
  SHEET_HEADER_HANDLE_TOP,
  SHEET_HEADER_TO_DIVIDER,
} from "@/components/sheets/SheetHeader";
import { PrimaryButton } from "@/components/ui";
import { Type, useAppTheme } from "@/constants/Theme";
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
  const { colors } = useAppTheme();
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
        paddingTop: SHEET_HEADER_HANDLE_TOP,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      {({ requestClose }) => {
        if (!file || !downloadState) return null;
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
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.border, marginBottom: SHEET_HEADER_HANDLE_TO_ROW },
              ]}
            />
            <View style={[styles.headerRow, { paddingBottom: SHEET_HEADER_TO_DIVIDER }]}>
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
                <View style={styles.identityMetaRow}>
                  {when ? (
                    <Text style={[styles.when, { color: colors.textMuted }]} numberOfLines={1}>
                      {when}
                    </Text>
                  ) : (
                    <View style={styles.whenSpacer} />
                  )}
                  <CompactMediaCategoryBadge category={file.category} />
                </View>
              </View>
              <SheetCloseButton onPress={requestClose} accessibilityLabel="Close" />
            </View>
            <HeaderDivider variant="sheet" inset={0} testID="remote-detail-header-divider" />

            <View style={[styles.metaBlock, { marginTop: SHEET_BODY_PAD_TOP }]}>
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
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerBody: { flex: 1, minWidth: 0, gap: 4 },
  fileName: { fontSize: 16, fontFamily: Type.fontSemi },
  identityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  when: { flex: 1, minWidth: 0, fontSize: 13, fontFamily: Type.font },
  whenSpacer: { flex: 1, minWidth: 0 },
  metaBlock: { marginBottom: 12 },
  metaCols: { flexDirection: "row", gap: 16 },
  metaCol: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 12, fontFamily: Type.font },
  metaValue: { fontSize: 14, fontFamily: Type.fontSemi },
});
