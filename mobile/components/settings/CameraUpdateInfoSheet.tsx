import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { MEDIA_SHEET_RADIUS } from "@/components/media/mediaCardTokens";
import {
  CAMERA_UPDATE_INFO_TITLE,
  isApprovedHttpsUrl,
  OFFICIAL_CAMERA_UPDATE_URLS,
  type CameraUpdateInfoKind,
} from "@/components/settings/cameraSoftwareInfo";
import { CompactSheetHeader, SHEET_BODY_PAD_TOP } from "@/components/sheets/SheetHeader";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

export type CameraUpdateInfoSheetProps = {
  readonly kind: CameraUpdateInfoKind | null;
  readonly onClose: () => void;
};

const BODY =
  "Updates for this camera are currently managed through the official Mio software.";
const SECONDARY =
  "Laneory can display the installed version, but does not currently download or install camera update packages.";

/**
 * Informational sheet only — Laneory does not download or install camera packages.
 * Official instruction URLs stay disabled until an approved HTTPS constant exists.
 */
export function CameraUpdateInfoSheet({ kind, onClose }: CameraUpdateInfoSheetProps) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const visible = kind !== null;
  const title = kind ? CAMERA_UPDATE_INFO_TITLE[kind] : "";
  const officialUrl = kind ? OFFICIAL_CAMERA_UPDATE_URLS[kind] : undefined;
  const canOpenInstructions = isApprovedHttpsUrl(officialUrl);

  return (
    <StaticBackdropSheet
      visible={visible}
      onClose={onClose}
      enableSwipeToDismiss
      sheetTestID="camera-update-info-sheet"
      sheetStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: MEDIA_SHEET_RADIUS,
        borderTopRightRadius: MEDIA_SHEET_RADIUS,
        maxHeight: "88%",
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {(api) => (
        <View style={styles.root}>
          <CompactSheetHeader
            title={title}
            showHandle={false}
            compact
            dividerInset={0}
            dragHandleProps={api.dragHandleProps}
            onClose={api.requestClose}
          />

          <View style={styles.content}>
            <Text
              style={[styles.body, { color: colors.text }]}
              maxFontSizeMultiplier={1.4}
              accessibilityRole="text"
            >
              {BODY}
            </Text>
            <Text
              style={[styles.secondary, { color: colors.textMuted }]}
              maxFontSizeMultiplier={1.4}
              accessibilityRole="text"
            >
              {SECONDARY}
            </Text>

            <View style={styles.actions}>
              {canOpenInstructions ? (
                <>
                  <Pressable
                    onPress={() => {
                      void Linking.openURL(officialUrl);
                    }}
                    accessibilityRole="link"
                    accessibilityLabel="Open update instructions"
                    hitSlop={HitSlop44}
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        backgroundColor: colors.brand,
                        borderRadius: radius.md,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.btnLabel, { color: colors.onBrand }]}>
                      Open update instructions
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={api.requestClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    hitSlop={HitSlop44}
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderRadius: radius.md,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.btnLabel, { color: colors.text }]}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={api.requestClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={HitSlop44}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radius.md,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.btnLabel, { color: colors.text }]}>Close</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
    </StaticBackdropSheet>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, paddingTop: 0 },
  content: { paddingTop: SHEET_BODY_PAD_TOP, gap: 12 },
  body: { fontFamily: Type.font, fontSize: 15, lineHeight: 22 },
  secondary: { fontFamily: Type.font, fontSize: 13, lineHeight: 18 },
  actions: { marginTop: 8, gap: 10 },
  btn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnLabel: { fontFamily: Type.fontSemi, fontSize: 15 },
});
