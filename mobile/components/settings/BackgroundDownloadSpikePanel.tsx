import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { sanitizeDiagnosticLine } from "@/components/camera/cameraLibraryModel";
import {
  SettingsActionRow,
  SettingsSection,
  SettingsValueRow,
} from "@/components/settings";
import { Type, useAppTheme } from "@/constants/Theme";
import {
  addBackgroundDownloadSpikeListener,
  buildSpikeCameraFileUrl,
  cancelBackgroundDownloadSpike,
  getBackgroundDownloadSpikeSessionId,
  getBackgroundDownloadSpikeTask,
  isBackgroundDownloadSpikeAvailable,
  restoreBackgroundDownloadSpikeSession,
  startBackgroundDownloadSpike,
  type SpikeEventPayload,
} from "background-download-spike";

const ENABLED_KEY = "laneory.bgDownloadSpike.enabled";
const PATH_KEY = "laneory.bgDownloadSpike.remotePath";
const EXPECTED_KEY = "laneory.bgDownloadSpike.expectedBytes";
const MAX_LOG_LINES = 40;

type Props = {
  readonly cameraHost: string;
};

function formatLogLine(event: SpikeEventPayload): string {
  const bits = [
    event.ts ?? new Date().toISOString(),
    `phase=${event.phase}`,
    event.nativeTaskId !== undefined ? `task=${event.nativeTaskId}` : undefined,
    event.bytesWritten !== undefined ? `bytes=${event.bytesWritten}` : undefined,
    event.httpStatus !== undefined ? `http=${event.httpStatus}` : undefined,
    event.contentLength !== undefined && event.contentLength !== null
      ? `clen=${event.contentLength}`
      : undefined,
    event.acceptRanges ? `acceptRanges=${event.acceptRanges}` : undefined,
    event.message ? `msg=${event.message}` : undefined,
    event.urlErrorCode !== undefined ? `urlErr=${event.urlErrorCode}` : undefined,
    event.restoredTaskCount !== undefined
      ? `restoredTasks=${event.restoredTaskCount}/${event.restoredTaskState ?? "?"}`
      : undefined,
  ].filter(Boolean);
  return sanitizeDiagnosticLine(bits.join(" ")) ?? bits.join(" ");
}

/**
 * Experimental Stage-0 harness. Off by default. Not wired to DownloadQueue.
 * Requires an iOS development build that includes background-download-spike.
 */
export function BackgroundDownloadSpikePanel({ cameraHost }: Props) {
  const { colors, radius } = useAppTheme();
  const [enabled, setEnabled] = useState(false);
  const [remotePath, setRemotePath] = useState("/SD/Normal/");
  const [expectedBytes, setExpectedBytes] = useState("");
  const [phase, setPhase] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const available = isBackgroundDownloadSpikeAvailable();

  const pushLog = useCallback((line: string) => {
    setLogs((prev) => [line, ...prev].slice(0, MAX_LOG_LINES));
  }, []);

  useEffect(() => {
    void (async () => {
      const [en, path, expected] = await Promise.all([
        AsyncStorage.getItem(ENABLED_KEY),
        AsyncStorage.getItem(PATH_KEY),
        AsyncStorage.getItem(EXPECTED_KEY),
      ]);
      setEnabled(en === "1");
      if (path) setRemotePath(path);
      if (expected) setExpectedBytes(expected);
    })();
  }, []);

  useEffect(() => {
    if (!enabled || !available) return undefined;
    const sub = addBackgroundDownloadSpikeListener((event) => {
      setPhase(String(event.phase));
      pushLog(formatLogLine(event));
    });
    void restoreBackgroundDownloadSpikeSession()
      .then((snap) => {
        setPhase(String(snap.phase));
        pushLog(formatLogLine({ ...snap, message: snap.message ?? "restoreSession" }));
      })
      .catch((error) => {
        pushLog(
          sanitizeDiagnosticLine(
            error instanceof Error ? error.message : String(error),
          ) ?? "restore failed",
        );
      });
    return () => sub.remove();
  }, [enabled, available, pushLog]);

  const setEnabledPersist = useCallback(async (next: boolean) => {
    setEnabled(next);
    await AsyncStorage.setItem(ENABLED_KEY, next ? "1" : "0");
  }, []);

  const onStart = useCallback(async () => {
    setBusy(true);
    try {
      const path = remotePath.trim();
      await AsyncStorage.setItem(PATH_KEY, path);
      const expectedRaw = expectedBytes.trim();
      await AsyncStorage.setItem(EXPECTED_KEY, expectedRaw);
      const expected =
        expectedRaw.length > 0 ? Number.parseInt(expectedRaw, 10) : undefined;
      if (expected !== undefined && (!Number.isSafeInteger(expected) || expected < 0)) {
        throw new Error("expectedBytes must be a non-negative integer");
      }
      const url = buildSpikeCameraFileUrl(cameraHost, path);
      const base =
        FileSystem.documentDirectory !== null && FileSystem.documentDirectory !== undefined
          ? FileSystem.documentDirectory
          : "";
      if (!base) {
        throw new Error("documentDirectory unavailable");
      }
      const name = path.split("/").filter(Boolean).pop() ?? `spike-${Date.now()}.bin`;
      const destinationPath = `${base}bg-spike/${name}`.replace(/^file:\/\//, "");
      // Ensure parent exists via FileSystem when possible.
      await FileSystem.makeDirectoryAsync(`${base}bg-spike`, { intermediates: true }).catch(
        () => undefined,
      );
      const snap = await startBackgroundDownloadSpike({
        url,
        destinationPath,
        expectedBytes: expected,
      });
      setPhase(String(snap.phase));
      pushLog(formatLogLine({ ...snap, message: "startDownload" }));
    } catch (error) {
      Alert.alert(
        "Spike start failed",
        sanitizeDiagnosticLine(error instanceof Error ? error.message : String(error)) ??
          "Start failed",
      );
    } finally {
      setBusy(false);
    }
  }, [cameraHost, remotePath, expectedBytes, pushLog]);

  const onCancel = useCallback(async () => {
    setBusy(true);
    try {
      const snap = await cancelBackgroundDownloadSpike();
      setPhase(String(snap.phase));
      pushLog(formatLogLine({ ...snap, message: "cancel" }));
    } finally {
      setBusy(false);
    }
  }, [pushLog]);

  const onRefresh = useCallback(async () => {
    setBusy(true);
    try {
      const snap = await getBackgroundDownloadSpikeTask();
      setPhase(String(snap.phase));
      pushLog(formatLogLine({ ...snap, message: "getActiveTask" }));
    } finally {
      setBusy(false);
    }
  }, [pushLog]);

  return (
    <SettingsSection title="Background download spike (experimental)">
      <SettingsActionRow
        icon="flask-outline"
        title={enabled ? "Disable spike panel" : "Enable spike panel"}
        subtitle="Off by default. Stage 0 feasibility only — not Download Queue."
        onPress={() => void setEnabledPersist(!enabled)}
        accessibilityLabel="Toggle background download spike panel"
      />
      {!enabled ? null : (
        <>
          <SettingsValueRow
            icon="phone-portrait-outline"
            title="Native module"
            value={
              available
                ? "iOS available"
                : Platform.OS === "ios"
                  ? "Unavailable (need rebuild)"
                  : "iOS only"
            }
            subtitle={`session=${getBackgroundDownloadSpikeSessionId()}`}
          />
          <SettingsValueRow icon="pulse-outline" title="Phase" value={phase} />
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Host (from session)</Text>
            <Text style={[styles.value, { color: colors.text }]}>{cameraHost}</Text>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Remote path</Text>
            <TextInput
              value={remotePath}
              onChangeText={setRemotePath}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="/SD/Normal/FILE.MP4"
              placeholderTextColor={colors.textFaint}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.sm,
                },
              ]}
              accessibilityLabel="Remote SD path for spike download"
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Expected bytes (optional)
            </Text>
            <TextInput
              value={expectedBytes}
              onChangeText={setExpectedBytes}
              keyboardType="number-pad"
              placeholder="e.g. 371000000"
              placeholderTextColor={colors.textFaint}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.sm,
                },
              ]}
              accessibilityLabel="Expected byte size"
            />
          </View>
          <SettingsActionRow
            icon="download-outline"
            title="Start spike download"
            subtitle="Single URLSession.background task"
            loading={busy}
            disabled={busy || !available}
            onPress={() => void onStart()}
            accessibilityLabel="Start background download spike"
          />
          <SettingsActionRow
            icon="refresh-outline"
            title="Refresh task status"
            loading={busy}
            disabled={busy || !available}
            onPress={() => void onRefresh()}
            accessibilityLabel="Refresh spike task status"
          />
          <SettingsActionRow
            icon="close-circle-outline"
            title="Cancel spike download"
            loading={busy}
            disabled={busy || !available}
            onPress={() => void onCancel()}
            accessibilityLabel="Cancel background download spike"
          />
          <View style={styles.logBlock}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Technical log (redacted)
            </Text>
            {logs.length === 0 ? (
              <Text style={[styles.logLine, { color: colors.textFaint }]}>No events yet</Text>
            ) : (
              logs.map((line, index) => (
                <Text
                  key={`${index}-${line.slice(0, 24)}`}
                  style={[styles.logLine, { color: colors.text }]}
                  selectable
                >
                  {line}
                </Text>
              ))
            )}
          </View>
        </>
      )}
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  label: { ...Type.caption },
  value: { ...Type.body },
  input: {
    ...Type.body,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  logBlock: { paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  logLine: { fontFamily: Type.mono, fontSize: 11, lineHeight: 16 },
});
