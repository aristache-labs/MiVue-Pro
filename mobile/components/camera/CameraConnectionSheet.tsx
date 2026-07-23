import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatCameraTimestamp,
  friendlyConnectionError,
  type CameraLinkState,
} from "@/components/camera/cameraLibraryModel";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

interface CameraConnectionSheetProps {
  readonly visible: boolean;
  readonly linkState: CameraLinkState;
  readonly refreshing: boolean;
  readonly cameraModel?: string;
  readonly cameraHost: string;
  readonly lastConnectedAt?: string;
  readonly recordingCount: number;
  readonly onClose: () => void;
  readonly onTryConnect: () => Promise<{ ok: boolean; error?: string }>;
  readonly onRefresh: () => Promise<{ ok: boolean; error?: string }>;
}

function Row({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** Linking.openSettings() is supported on iOS and Android — opens the app’s system settings page. */
const CAN_OPEN_SYSTEM_SETTINGS = Platform.OS === "ios" || Platform.OS === "android";

export function CameraConnectionSheet({
  visible,
  linkState,
  refreshing,
  cameraModel,
  cameraHost,
  lastConnectedAt,
  recordingCount,
  onClose,
  onTryConnect,
  onRefresh,
}: CameraConnectionSheetProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [sheetError, setSheetError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const connected = linkState === "connected";
  const showConnectedUi = connected;

  useEffect(() => {
    if (visible) setSheetError(undefined);
  }, [visible]);

  const working = busy || refreshing;

  const runConnect = async () => {
    if (working) return;
    setBusy(true);
    setSheetError(undefined);
    try {
      const result = await onTryConnect();
      if (result.ok) {
        onClose();
      } else {
        setSheetError(
          friendlyConnectionError(result.error) ?? "Could not connect to the camera. Try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const runRefresh = async () => {
    if (working) return;
    setBusy(true);
    setSheetError(undefined);
    try {
      const result = await onRefresh();
      if (!result.ok) {
        setSheetError(friendlyConnectionError(result.error) ?? "Refresh failed. Try again.");
      }
      // Keep sheet open on success; Last refresh updates from parent props.
    } finally {
      setBusy(false);
    }
  };

  const openHelp = () => {
    onClose();
    router.push({
      pathname: "/connection-help",
      params: { source: "library" },
    } as Parameters<typeof router.push>[0]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.avoid}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {showConnectedUi ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Camera connection</Text>
              <Text
                style={[styles.status, { color: colors.brand }]}
                accessibilityLiveRegion="polite"
              >
                Connected
              </Text>

              <View style={{ marginTop: spacing.md, gap: 10 }}>
                {cameraModel ? <Row label="Model" value={cameraModel} /> : null}
                <Row label="Camera IP" value={cameraHost} />
                {lastConnectedAt ? (
                  <Row label="Last refresh" value={formatCameraTimestamp(lastConnectedAt)} />
                ) : null}
                <Row label="Recordings" value={String(recordingCount)} />
              </View>

              {sheetError ? (
                <Text style={[styles.error, { color: colors.danger }]}>{sheetError}</Text>
              ) : null}

              <Pressable
                onPress={() => void runRefresh()}
                disabled={working}
                accessibilityRole="button"
                accessibilityLabel="Refresh connection"
                accessibilityState={{ busy: working, disabled: working }}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brand,
                    opacity: working ? 0.5 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                {working ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Ionicons name="refresh" size={18} color={colors.brand} />
                )}
                <Text style={{ color: colors.brand, fontFamily: Type.fontSemi }}>
                  Refresh connection
                </Text>
              </Pressable>

              <Pressable
                onPress={openHelp}
                accessibilityRole="button"
                accessibilityLabel="Connection help"
                hitSlop={HitSlop44}
                style={styles.secondaryBtn}
              >
                <Text style={{ color: colors.text, fontFamily: Type.fontSemi }}>Connection help</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Connect camera</Text>
              <Text style={[styles.lead, { color: colors.textMuted }]}>
                Use the camera’s Wi‑Fi hotspot, then return to Laneory.
              </Text>

              <View style={{ marginTop: spacing.md, gap: 12 }}>
                {[
                  "Enable Wi‑Fi connection mode on the camera.",
                  "Connect this phone to the camera Wi‑Fi network.",
                  "Return to Laneory and try the connection.",
                ].map((step, i) => (
                  <View key={step} style={styles.stepRow}>
                    <View style={[styles.stepBadge, { backgroundColor: colors.brandSoft }]}>
                      <Text style={{ color: colors.brand, fontFamily: Type.fontBold, fontSize: 13 }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                  </View>
                ))}
              </View>

              {sheetError ? (
                <Text style={[styles.error, { color: colors.danger }]}>{sheetError}</Text>
              ) : null}

              <Pressable
                onPress={() => void runConnect()}
                disabled={working}
                accessibilityRole="button"
                accessibilityLabel={sheetError ? "Try again" : "Try connection"}
                accessibilityState={{ busy: working, disabled: working }}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.brand,
                    borderColor: colors.brand,
                    opacity: working ? 0.5 : pressed ? 0.85 : 1,
                    marginTop: spacing.lg,
                  },
                ]}
              >
                {working ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Ionicons name="wifi" size={18} color={colors.onBrand} />
                )}
                <Text style={{ color: colors.onBrand, fontFamily: Type.fontSemi }}>
                  {sheetError ? "Try again" : "Try connection"}
                </Text>
              </Pressable>

              <Pressable
                onPress={openHelp}
                accessibilityRole="button"
                accessibilityLabel="Connection help"
                hitSlop={HitSlop44}
                style={styles.secondaryBtn}
              >
                <Text style={{ color: colors.text, fontFamily: Type.fontSemi }}>Connection help</Text>
              </Pressable>

              {CAN_OPEN_SYSTEM_SETTINGS ? (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  accessibilityRole="button"
                  accessibilityLabel="Open phone settings"
                  accessibilityHint="Opens this app’s page in system Settings. It does not select a Wi‑Fi network for you."
                  hitSlop={HitSlop44}
                  style={({ pressed }) => [
                    styles.settingsBtn,
                    {
                      borderColor: colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Ionicons name="settings-outline" size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontFamily: Type.fontSemi }}>
                    Open phone settings
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoid: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handleWrap: { alignItems: "center", marginBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  title: { fontSize: 18, fontFamily: Type.fontBold },
  status: { fontSize: 14, fontFamily: Type.fontSemi, marginTop: 4 },
  lead: { fontSize: 14, fontFamily: Type.font, marginTop: 6, lineHeight: 20 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  metaLabel: { fontSize: 13, fontFamily: Type.font },
  metaValue: { fontSize: 13, fontFamily: Type.fontSemi, flexShrink: 1, textAlign: "right" },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1, fontSize: 14, fontFamily: Type.font, lineHeight: 20, paddingTop: 4 },
  error: { fontSize: 13, fontFamily: Type.fontSemi, marginTop: 12, lineHeight: 18 },
  primaryBtn: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  settingsBtn: {
    minHeight: 44,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
});
