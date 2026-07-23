import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { MEDIA_SHEET_PAD_H } from "@/components/media/mediaCardTokens";
import { CompactSheetHeader, SHEET_BODY_PAD_TOP } from "@/components/sheets/SheetHeader";
import { Type, useAppTheme } from "@/constants/Theme";

export type MapPrivacySheetMode = "online" | "local";

export interface MapPrivacySheetProps {
  readonly visible: boolean;
  readonly mapMode: MapPrivacySheetMode;
  readonly onClose: () => void;
  readonly onOpenSettings: () => void;
}

function PrivacyRow({
  icon,
  title,
  body,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly body: string;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.brandSoft, borderRadius: radius.sm }]}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowBody, { color: colors.textMuted }]}>{body}</Text>
      </View>
    </View>
  );
}

/** Compact Player sheet — map privacy copy without leaving Player until Settings is chosen. */
export function MapPrivacySheet({
  visible,
  mapMode,
  onClose,
  onOpenSettings,
}: MapPrivacySheetProps) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const online = mapMode === "online";

  return (
    <StaticBackdropSheet
      visible={visible}
      onClose={onClose}
      enableSwipeToDismiss
      slideDistance={360}
      sheetTestID="map-privacy-sheet"
      scrimTestID="map-privacy-scrim"
      scrimAccessibilityLabel="Close map privacy"
      sheetStyle={{
        backgroundColor: colors.surfaceElevated,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingBottom: Math.max(insets.bottom, 16),
        maxHeight: "70%",
      }}
    >
      {({ requestClose, dragHandleProps }) => (
        <>
          <CompactSheetHeader
            title={online ? "Map privacy" : "Local map"}
            compact
            showHandle
            onClose={requestClose}
            closeAccessibilityLabel="Close map privacy"
            dragHandleProps={dragHandleProps}
            testID="map-privacy-header"
          />
          <View style={[styles.body, { paddingHorizontal: MEDIA_SHEET_PAD_H, paddingTop: SHEET_BODY_PAD_TOP }]}>
            {online ? (
              <>
                <PrivacyRow
                  icon="map-outline"
                  title="Visible map tiles"
                  body="Only the map area visible on screen is requested from the selected tile provider."
                />
                <PrivacyRow
                  icon="shield-checkmark-outline"
                  title="Recordings stay local"
                  body="Laneory does not upload the video or the complete GPS track for map display."
                />
              </>
            ) : (
              <PrivacyRow
                icon="phone-portrait-outline"
                title="Entirely on this device"
                body="The schematic route is generated locally and does not request online map tiles."
              />
            )}

            <Pressable
              onPress={() => {
                requestClose();
                onOpenSettings();
              }}
              accessibilityRole="button"
              accessibilityLabel="Maps and Privacy settings"
              hitSlop={8}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  borderColor: colors.brand,
                  backgroundColor: colors.brandSoft,
                  opacity: pressed ? 0.85 : 1,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Text style={[styles.settingsLabel, { color: colors.brand }]}>
                Maps & Privacy settings
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </StaticBackdropSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 15, fontFamily: Type.fontSemi },
  rowBody: { fontSize: 13, lineHeight: 18, fontFamily: Type.font },
  settingsBtn: {
    minHeight: 44,
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  settingsLabel: { fontSize: 14, fontFamily: Type.fontSemi },
});
