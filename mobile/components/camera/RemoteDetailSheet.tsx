import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CameraThumb } from "@/components/camera/CameraThumb";
import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import {
  remoteDetailPrimaryLabel,
  shouldShowViewInQueue,
} from "@/components/camera/remoteDownloadA11y";
import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";
import { shouldEnqueueOnDownloadPress } from "@/components/camera/remoteDownloadState";
import { formatCompactDateTime } from "@/components/local/localLibrarySections";
import { formatDuration } from "@/components/mediaMeta";
import {
  MEDIA_SCRIM_COLOR,
  MEDIA_SHEET_MS,
  MEDIA_SHEET_PAD_H,
  MEDIA_SHEET_RADIUS,
  MEDIA_THUMB_H,
  MEDIA_THUMB_W,
} from "@/components/media/mediaCardTokens";
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
 * Camera recording detail sheet.
 * Scrim is static (no fade / no slide). Only the sheet panel translates.
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
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(320)).current;
  const closingRef = useRef(false);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => {
      reduceMotionRef.current = v;
    });
    return () => {
      alive = false;
      // RN typings differ across versions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);

  const finishClose = useCallback(() => {
    closingRef.current = false;
    setMounted(false);
    onClose();
  }, [onClose]);

  const animateClosed = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reduceMotionRef.current) {
      translateY.setValue(320);
      finishClose();
      return;
    }
    Animated.timing(translateY, {
      toValue: 320,
      duration: MEDIA_SHEET_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) finishClose();
      else closingRef.current = false;
    });
  }, [finishClose, translateY]);

  useEffect(() => {
    if (visible && file) {
      closingRef.current = false;
      setMounted(true);
      translateY.setValue(320);
      if (reduceMotionRef.current) {
        translateY.setValue(0);
        return;
      }
      Animated.timing(translateY, {
        toValue: 0,
        duration: MEDIA_SHEET_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (!visible && mounted) {
      animateClosed();
    }
  }, [visible, file, mounted, animateClosed, translateY]);

  const requestClose = useCallback(() => {
    if (!mounted || closingRef.current) return;
    animateClosed();
  }, [animateClosed, mounted]);

  if (!mounted || !file || !downloadState) return null;

  const catAccent = categoryColor(file.category, scheme);
  const when = formatCompactDateTime(file.name);
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
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View style={styles.root} pointerEvents="box-none">
        {/* Static scrim — never animated opacity / never translated */}
        <Pressable
          style={styles.scrim}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="remote-detail-scrim"
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateY }],
            },
          ]}
          testID="remote-detail-sheet"
        >
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MEDIA_SCRIM_COLOR,
  },
  sheet: {
    borderTopLeftRadius: MEDIA_SHEET_RADIUS,
    borderTopRightRadius: MEDIA_SHEET_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: MEDIA_SHEET_PAD_H,
    paddingTop: 8,
    gap: 12,
  },
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
