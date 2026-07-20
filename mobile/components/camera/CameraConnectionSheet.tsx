import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
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
  readonly lastError?: string;
  readonly onClose: () => void;
  readonly onTryConnect: () => Promise<{ ok: boolean; error?: string }>;
  readonly onRefresh: () => Promise<{ ok: boolean; error?: string }>;
  readonly onDisconnect: () => void;
  readonly onConnectedSuccess?: () => void;
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

export function CameraConnectionSheet({
  visible,
  linkState,
  refreshing,
  cameraModel,
  cameraHost,
  lastConnectedAt,
  recordingCount,
  lastError,
  onClose,
  onTryConnect,
  onRefresh,
  onDisconnect,
  onConnectedSuccess,
}: CameraConnectionSheetProps) {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [sheetError, setSheetError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const connected = linkState === "connected";
  const unstable = linkState === "unstable";
  const showConnectedUi = connected || unstable;

  useEffect(() => {
    if (visible) setSheetError(undefined);
  }, [visible]);

  const runConnect = async () => {
    if (busy || refreshing) return;
    setBusy(true);
    setSheetError(undefined);
    try {
      const result = await onTryConnect();
      if (result.ok) {
        onConnectedSuccess?.();
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
    if (busy || refreshing) return;
    setBusy(true);
    setSheetError(undefined);
    try {
      const result = await onRefresh();
      if (!result.ok) {
        setSheetError(friendlyConnectionError(result.error) ?? "Refresh failed. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const openHelp = () => {
    onClose();
    router.push("/connection-help" as Parameters<typeof router.push>[0]);
  };

  const working = busy || refreshing;

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
                style={[
                  styles.status,
                  { color: unstable ? colors.warn : colors.brand },
                ]}
              >
                {unstable ? "Unstable" : "Connected"}
              </Text>

              <View style={{ marginTop: spacing.md, gap: 10 }}>
                {cameraModel ? <Row label="Model" value={cameraModel} /> : null}
                <Row label="Camera IP" value={cameraHost} />
                {lastConnectedAt ? (
                  <Row
                    label="Last refresh"
                    value={new Date(lastConnectedAt).toLocaleString()}
                  />
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
                <Text style={{ color: colors.brand, fontFamily: Type.fontSemi }}>Refresh connection</Text>
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

              <Pressable
                onPress={() => {
                  onDisconnect();
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Disconnect camera session"
                accessibilityHint="Clears Laneory connection only. Does not change the camera."
                hitSlop={HitSlop44}
                style={styles.secondaryBtn}
              >
                <Text style={{ color: colors.danger, fontFamily: Type.fontSemi }}>Disconnect</Text>
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
                accessibilityLabel="Try connection"
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

              <Pressable
                onPress={() => void Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="Open system settings"
                hitSlop={HitSlop44}
                style={styles.secondaryBtn}
              >
                <Text style={{ color: colors.textMuted, fontFamily: Type.fontSemi }}>
                  Open system settings
                </Text>
              </Pressable>
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
});
