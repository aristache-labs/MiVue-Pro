import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { MEDIA_SCRIM_COLOR } from "@/components/media/mediaCardTokens";
import {
  canSaveCameraIpv4,
  parseCameraIpv4Input,
} from "@/components/settings/cameraIp";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";

interface CameraIpSheetProps {
  readonly visible: boolean;
  readonly currentHost: string;
  readonly onClose: () => void;
  /** Local persistence only — caller must not probe the camera. */
  readonly onSave: (host: string) => void;
}

/**
 * Centered Camera IP dialog — sits mid-screen above the keyboard (no bottom sheet lift).
 * Cancel / backdrop / Android back discard the draft.
 */
export function CameraIpSheet({
  visible,
  currentHost,
  onClose,
  onSave,
}: CameraIpSheetProps) {
  const { colors, radius } = useAppTheme();
  const [draft, setDraft] = useState(currentHost);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const saveLockRef = useRef(false);

  useEffect(() => {
    if (!visible) return undefined;
    setDraft(currentHost);
    setSaving(false);
    saveLockRef.current = false;
    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelection(0, currentHost.length);
    }, 200);
    return () => clearTimeout(id);
  }, [visible, currentHost]);

  const parsed = parseCameraIpv4Input(draft);
  const error = draft.trim().length > 0 && !parsed.ok ? parsed.error : undefined;
  const canSave = !saving && canSaveCameraIpv4(draft, currentHost);

  const dismiss = useCallback(() => {
    if (saving) return;
    Keyboard.dismiss();
    setDraft(currentHost);
    onClose();
  }, [currentHost, onClose, saving]);

  const save = useCallback(() => {
    if (saveLockRef.current || !canSaveCameraIpv4(draft, currentHost)) return;
    const next = parseCameraIpv4Input(draft);
    if (!next.ok) return;
    saveLockRef.current = true;
    setSaving(true);
    try {
      Keyboard.dismiss();
      onSave(next.value);
      onClose();
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }, [currentHost, draft, onClose, onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={styles.scrim}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss camera IP editor"
          testID="camera-ip-scrim"
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: radius.lg,
            },
          ]}
          testID="camera-ip-sheet"
        >
          <View style={styles.header}>
            <Pressable
              onPress={dismiss}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityState={{ disabled: saving }}
              hitSlop={HitSlop44}
              style={styles.headerSide}
            >
              <Text
                style={{
                  color: saving ? colors.textFaint : colors.textMuted,
                  fontFamily: Type.fontSemi,
                  fontSize: 16,
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              Camera IP
            </Text>
            <Pressable
              onPress={save}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="Save"
              accessibilityState={{ disabled: !canSave }}
              hitSlop={HitSlop44}
              style={styles.headerSide}
            >
              <Text
                style={{
                  color: canSave ? colors.brand : colors.textFaint,
                  fontFamily: Type.fontSemi,
                  fontSize: 16,
                }}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Camera IP address</Text>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              selectTextOnFocus
              editable={!saving}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: error ? colors.warn : colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                },
              ]}
              accessibilityLabel="Camera IP address"
              onSubmitEditing={() => {
                if (canSave) save();
              }}
            />
            {error ? (
              <Text style={[styles.error, { color: colors.warn }]} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : (
              <Text style={[styles.help, { color: colors.textMuted }]}>
                Private IPv4 address used to reach the camera over its Wi‑Fi network.
              </Text>
            )}
            <Text style={[styles.example, { color: colors.textMuted }]}>Example: 192.72.1.1</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: MEDIA_SCRIM_COLOR,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 14,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 8,
    gap: 8,
  },
  headerSide: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: Type.fontSemi,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  label: { fontSize: 12, fontFamily: Type.fontSemi, letterSpacing: 0.2 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 17,
    fontFamily: Type.mono,
    fontVariant: ["tabular-nums"],
  },
  help: { fontSize: 13, fontFamily: Type.font, lineHeight: 18 },
  error: { fontSize: 13, fontFamily: Type.font, lineHeight: 18 },
  example: { fontSize: 12, fontFamily: Type.mono, fontVariant: ["tabular-nums"] },
});
