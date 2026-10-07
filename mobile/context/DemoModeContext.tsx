import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";

import { scheduleOneShotVerify } from "@/components/onboarding/appStateVerify";
import {
  ACTIVE_POLL_INTERVAL_MS,
  CAMERA_HEALTH_TIMEOUT_MS,
  FOREGROUND_VERIFY_DEBOUNCE_MS,
  isAppForegroundResume,
  isBusyForHealthCheck,
  linkStateAfterVerifyFailure,
  nextReconnectBackoffMs,
  shouldClearLibraryAfterFailures,
  shouldRunActiveHealthPoll,
  shouldRunDisconnectedReconnect,
  shouldSkipVerifyBecauseRecent,
  VERIFY_RETRY_AFTER_FIRST_FAILURE_MS,
  verifyCameraReachability,
} from "@/components/camera/cameraConnectionSupervisor";
import {
  bumpCameraSessionGeneration,
  CAMERA_REFRESH_IN_PROGRESS,
  canStartCameraRefresh,
  friendlyConnectionError,
  isCameraLibraryInteractive,
  isCameraSessionCurrent,
  sanitizeDiagnosticLine,
  type CameraLinkState,
} from "@/components/camera/cameraLibraryModel";
import {
  buildCameraPreviewUrl,
  CAMERA_PLAYBACK_PREVIEW_PROPERTY,
  cameraPreviewAvailability,
  type CameraPreviewKind,
} from "@/components/camera/cameraPreview";
import {
  appLog,
  observeQueueForAppLogs,
  type QueueLogSnapshot,
} from "@/components/diagnostics/appLogStore";

import { APP_USER_AGENT } from "../constants/Brand";
import { assertManagedLocalMediaUri } from "../components/local/localLibraryDelete";
import {
  cameraThumbCacheFileName,
  cameraThumbRequestPath,
  isJpegMagic,
  uint8ToBase64,
} from "../components/cameraThumb";
import {
  ExpoFsStreamingTransport,
  NativeTcpTransport,
  isNativeTcpAvailable,
  isPrivateIpv4,
  type StreamingTransport,
  type Transport,
} from "../packages/camera-transport/src/index";
import { DEMO_FILES, DemoTransport } from "../packages/demo/src/index";
import {
  DownloadQueue,
  ExpoFileSink,
  MemoryFileSink,
} from "../packages/download-queue/src/index";
import { AsyncStorageQueueStore, MemoryQueueStore, type QueueItem } from "../packages/local-db/src/index";
import type { RemoteFile } from "../packages/parsers/src/index";
import {
  applyCameraSetting,
  CameraClient,
  CAMERA_SETTING_PROPERTY,
  fetchCameraSettingProperties,
  formatSdCard,
  isAllowedCameraSettingValue,
  isCameraSettingKey,
  type CameraSettingKey,
  type CameraSettingValueMap,
  type FormatSdCardOutcome,
} from "../packages/protocol/src/index";

const DEFAULT_HOST = "192.72.1.1";
const HOST_KEY = "@laneory/camera_host_v1";
const MAP_PREF_KEY = "@laneory/map_preference_v1";
const COMPAT_MODEL = "MiVue 866";
/**
 * Soft cap for Expo Go live downloads (FileSystem streaming to disk).
 * Very large clips can still fail on slow camera Wi‑Fi; progress is visible in Queue.
 */
const FETCH_MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;
/** Short probe before enqueue so Download does not hang on a dead link. */
const ENQUEUE_PROBE_TIMEOUT_MS = 8_000;
/** Cold-start camera probe budget before splash may hide (probe can continue). */
const BOOTSTRAP_PROBE_BUDGET_MS = 8_000;

export interface LocalMediaFile {
  readonly name: string;
  readonly uri: string;
  readonly sizeBytes: number;
  readonly kind: "video" | "image" | "other";
}

export type CameraPreviewResult =
  | {
      readonly ok: true;
      readonly uri: string;
      readonly kind: CameraPreviewKind;
      readonly source: "camera" | "cache";
    }
  | { readonly ok: false; readonly error: string };

export type MapPreference = "online" | "schematic";

interface DemoModeContextValue {
  /** Dev/test only — not exposed in production Camera Library UI. */
  readonly demoMode: boolean;
  readonly setDemoMode: (value: boolean) => void;
  readonly cameraHost: string;
  readonly setCameraHost: (host: string) => void;
  readonly files: readonly RemoteFile[];
  readonly queueItems: readonly QueueItem[];
  readonly localFiles: readonly LocalMediaFile[];
  readonly refreshFiles: (opts?: {
    readonly host?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  readonly refreshLocalFiles: () => Promise<void>;
  /** True after the first camera reachability check (or budget timeout). */
  readonly cameraBootstrapDone: boolean;
  /** Clears Laneory camera session only — never mutates the camera. */
  readonly disconnectSession: () => void;
  readonly enqueueDownload: (file: RemoteFile) => Promise<void>;
  readonly cancelDownload: (id: string) => Promise<void>;
  readonly pauseDownload: (id: string) => Promise<void>;
  readonly resumeDownload: (id: string) => Promise<void>;
  /** Re-queue a failed/cancelled item in place (same queue id). */
  readonly retryDownload: (id: string) => Promise<void>;
  readonly removeFromQueue: (id: string) => Promise<void>;
  readonly shareCompleted: (item: QueueItem) => Promise<void>;
  readonly shareLocalFile: (file: LocalMediaFile) => Promise<boolean>;
  readonly deleteLocalFile: (file: LocalMediaFile) => Promise<void>;
  /** Sequential local-only deletes; never mutates the camera. */
  readonly deleteLocalFilesBatch: (
    files: readonly LocalMediaFile[],
  ) => Promise<{ deleted: number; failed: number }>;
  readonly queuePosition: (id: string) => number | undefined;
  readonly downloadDir: string;
  readonly lastError: string | undefined;
  /** Sanitized diagnostics note — not for Library chrome. */
  readonly connectionNote: string | undefined;
  readonly nativeTcpReady: boolean;
  readonly isExpoGo: boolean;
  readonly cameraLinkState: CameraLinkState;
  readonly isRefreshingCamera: boolean;
  readonly lastConnectedAt: string | undefined;
  readonly cameraModel: string | undefined;
  readonly cameraProperties: Readonly<Record<string, string>>;
  /** Targeted settings refresh — does not replace Library files. */
  readonly refreshCameraSettings: () => Promise<{ ok: boolean; error?: string }>;
  /** Status + settings properties without listAllFiles. */
  readonly refreshCameraInformation: () => Promise<{ ok: boolean; error?: string }>;
  readonly setCameraSetting: <K extends CameraSettingKey>(
    key: K,
    value: CameraSettingValueMap[K],
  ) => Promise<{ ok: boolean; error?: string }>;
  readonly isApplyingCameraSetting: boolean;
  readonly applyingCameraSettingKey: CameraSettingKey | undefined;
  /** Destructive SD format — one-shot CGI, no auto-retry. */
  readonly formatCameraSdCard: () => Promise<{
    ok: boolean;
    outcome?: FormatSdCardOutcome;
    error?: string;
    message?: string;
  }>;
  readonly isFormattingSdCard: boolean;
  readonly mapPreference: MapPreference;
  readonly setMapPreference: (value: MapPreference) => void;
  readonly clearThumbCache: () => Promise<void>;
  /** Fetch camera SD thumbnail (GET /thumb…); cached on disk. Failures return undefined. */
  readonly resolveCameraThumbUri: (remotePath: string) => Promise<string | undefined>;
  /** Read-only camera media preview. Video is capability-gated and HEAD-verified. */
  readonly resolveCameraPreview: (file: RemoteFile) => Promise<CameraPreviewResult>;
  /** Prevent health polling from competing with an active camera video stream. */
  readonly setCameraPreviewActive: (active: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

function createFileTransport(host: string, timeoutMs: number): ExpoFsStreamingTransport {
  return new ExpoFsStreamingTransport({
    host,
    port: 80,
    timeoutMs,
    userAgent: APP_USER_AGENT,
    fs: FileSystem,
  });
}

function createLiveTransport(host: string, timeoutMs = 30_000): Transport {
  if (isNativeTcpAvailable()) {
    return new NativeTcpTransport({
      host,
      port: 80,
      timeoutMs: Math.min(timeoutMs, 5_000),
      userAgent: APP_USER_AGENT,
    });
  }
  // Expo Go: CGI via Fetch; file body via FileSystem download (progress + less JS RAM).
  return createFileTransport(host, timeoutMs);
}

/**
 * Queue transport. Native `downloadToFile` blocks the Http10Tcp queue until the
 * file ends, so the UI stays on "Starting download…" and pause, cancel, and log
 * export wait. HEAD stays on native TCP. The body uses the FileSystem downloader.
 */
function createQueueTransport(host: string, timeoutMs: number): StreamingTransport {
  const files = createFileTransport(host, timeoutMs);
  if (!isNativeTcpAvailable()) return files;
  const native = new NativeTcpTransport({
    host,
    port: 80,
    timeoutMs: 5_000,
    userAgent: APP_USER_AGENT,
  });
  return {
    request: (request) => native.request(request),
    downloadToFile: (options) => files.downloadToFile(options),
  };
}

async function fetchCameraPreviewCapability(
  client: CameraClient,
): Promise<Readonly<Record<string, string>>> {
  try {
    const capability = await client.getProperty(CAMERA_PLAYBACK_PREVIEW_PROPERTY);
    const value = capability.properties[CAMERA_PLAYBACK_PREVIEW_PROPERTY];
    return value === undefined ? {} : { [CAMERA_PLAYBACK_PREVIEW_PROPERTY]: value };
  } catch {
    return {};
  }
}

function fetchTimeoutForBytes(sizeBytes: number): number {
  // Worst-case ~150 KiB/s on camera AP + headroom.
  const estimatedMs = Math.ceil((sizeBytes / (150 * 1024)) * 1000) + 60_000;
  return Math.min(Math.max(estimatedMs, 180_000), 600_000);
}

function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function notifyCameraDisconnected(detail?: string): void {
  const body =
    friendlyConnectionError(detail) ??
    "Rejoin the camera Wi‑Fi, then try again from Library or Queue.";
  Alert.alert("Camera disconnected", body);
}

export function DemoModeProvider({ children }: { readonly children: React.ReactNode }) {
  const isExpoGo = Constants.appOwnership === "expo";
  const nativeTcpReady = isNativeTcpAvailable();

  const [demoMode, setDemoModeState] = useState(false);
  const [cameraHost, setCameraHostState] = useState(DEFAULT_HOST);
  const [files, setFiles] = useState<readonly RemoteFile[]>([]);
  const [queueItems, setQueueItems] = useState<readonly QueueItem[]>([]);
  const [localFiles, setLocalFiles] = useState<readonly LocalMediaFile[]>([]);
  const [lastError, setLastError] = useState<string | undefined>();
  const [connectionNote, setConnectionNote] = useState<string | undefined>();
  const [cameraLinkState, setCameraLinkState] = useState<CameraLinkState>("idle");
  const [isRefreshingCamera, setIsRefreshingCamera] = useState(false);
  const [cameraBootstrapDone, setCameraBootstrapDone] = useState(false);
  const [lastConnectedAt, setLastConnectedAt] = useState<string | undefined>();
  const [cameraModel, setCameraModel] = useState<string | undefined>();
  const [cameraProperties, setCameraProperties] = useState<Readonly<Record<string, string>>>({});
  const [mapPreference, setMapPreferenceState] = useState<MapPreference>("online");
  const [isApplyingCameraSetting, setIsApplyingCameraSetting] = useState(false);
  const [applyingCameraSettingKey, setApplyingCameraSettingKey] = useState<
    CameraSettingKey | undefined
  >(undefined);
  const [isFormattingSdCard, setIsFormattingSdCard] = useState(false);
  const settingApplyInflightRef = useRef(false);
  const formatSdInflightRef = useRef(false);
  const cameraPropertiesRef = useRef(cameraProperties);
  cameraPropertiesRef.current = cameraProperties;
  const queueStatusRef = useRef<Map<string, QueueItem["status"]>>(new Map());
  const disconnectAlertAtRef = useRef(0);
  const refreshInflightRef = useRef(false);
  const bootOnceRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const linkStateRef = useRef<CameraLinkState>(cameraLinkState);
  linkStateRef.current = cameraLinkState;
  const filesLenRef = useRef(0);
  filesLenRef.current = files.length;
  /** Bumped on every remote-library clear so in-flight list responses cannot repopulate. */
  const cameraSessionGenRef = useRef(0);
  const cameraHostRef = useRef(cameraHost);
  cameraHostRef.current = cameraHost;
  const demoModeRef = useRef(demoMode);
  demoModeRef.current = demoMode;
  const cameraPreviewActiveRef = useRef(false);
  const consecutiveVerifyFailuresRef = useRef(0);
  const lastVerifiedAtRef = useRef<number | undefined>(undefined);
  const verifyInflightLocalRef = useRef(false);
  /** Monotonic id so a late health-check result cannot revive a newer state. */
  const healthVerifySeqRef = useRef(0);
  const healthRetryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttemptRef = useRef(0);

  const clearRemoteCameraLibrary = useCallback(
    (nextState: "disconnected" | "connection_lost", error?: string) => {
      cameraSessionGenRef.current = bumpCameraSessionGeneration(cameraSessionGenRef.current);
      healthVerifySeqRef.current += 1;
      setFiles([]);
      setCameraLinkState(nextState);
      if (error !== undefined) setLastError(error);
      appLog.warn(
        "connection",
        error
          ? `library cleared → ${nextState}: ${error}`
          : `library cleared → ${nextState}`,
      );
    },
    [],
  );

  const downloadDir =
    FileSystem.documentDirectory !== null && FileSystem.documentDirectory !== undefined
      ? `${FileSystem.documentDirectory}downloads`
      : "/demo-downloads";

  const thumbDir = `${downloadDir}/.thumbs`;
  const thumbInflightRef = useRef(new Map<string, Promise<string | undefined>>());
  const thumbActiveRef = useRef(0);
  const thumbWaitersRef = useRef<Array<() => void>>([]);
  const THUMB_CONCURRENCY = 2;

  const acquireThumbSlot = useCallback((): Promise<void> => {
    if (thumbActiveRef.current < THUMB_CONCURRENCY) {
      thumbActiveRef.current += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      thumbWaitersRef.current.push(() => {
        thumbActiveRef.current += 1;
        resolve();
      });
    });
  }, []);

  const releaseThumbSlot = useCallback(() => {
    thumbActiveRef.current = Math.max(0, thumbActiveRef.current - 1);
    const next = thumbWaitersRef.current.shift();
    if (next) next();
  }, []);

  const resolveCameraThumbUri = useCallback(
    async (remotePath: string): Promise<string | undefined> => {
      try {
        const requestPath = cameraThumbRequestPath(remotePath);
        const cacheName = cameraThumbCacheFileName(remotePath);
        const cacheUri = `${thumbDir}/${cacheName}`;

        const existing = await FileSystem.getInfoAsync(cacheUri);
        if (existing.exists) return cacheUri;

        const inflight = thumbInflightRef.current.get(remotePath);
        if (inflight) return inflight;

        const task = (async () => {
          await acquireThumbSlot();
          try {
            const again = await FileSystem.getInfoAsync(cacheUri);
            if (again.exists) return cacheUri;

            await FileSystem.makeDirectoryAsync(thumbDir, { intermediates: true }).catch(() => undefined);

            const transport: Transport = demoMode
              ? new DemoTransport()
              : createLiveTransport(cameraHost, 15_000);
            const response = await transport.request({ method: "GET", path: requestPath });
            if (response.statusCode !== 200 || !isJpegMagic(response.body)) return undefined;

            await FileSystem.writeAsStringAsync(cacheUri, uint8ToBase64(response.body), {
              encoding: FileSystem.EncodingType?.Base64 ?? "base64",
            });
            return cacheUri;
          } finally {
            releaseThumbSlot();
            thumbInflightRef.current.delete(remotePath);
          }
        })();

        thumbInflightRef.current.set(remotePath, task);
        return task;
      } catch {
        return undefined;
      }
    },
    [demoMode, cameraHost, thumbDir, acquireThumbSlot, releaseThumbSlot],
  );

  const setCameraPreviewActive = useCallback((active: boolean) => {
    cameraPreviewActiveRef.current = active;
  }, []);

  const refreshLocalFiles = useCallback(async () => {
    try {
      if (FileSystem.documentDirectory === null || FileSystem.documentDirectory === undefined) {
        setLocalFiles([]);
        return;
      }
      const names = await FileSystem.readDirectoryAsync(downloadDir);
      const media: LocalMediaFile[] = [];
      for (const name of names) {
        if (name.endsWith(".part")) continue;
        // Sidecar GPS stays on disk but is not listed — loaded with the sibling MP4 in Player.
        if (/\.nmea$/i.test(name)) continue;
        const kind = kindForName(name);
        if (kind === "other") continue;
        const uri = downloadDir.endsWith("/") ? `${downloadDir}${name}` : `${downloadDir}/${name}`;
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || info.isDirectory) continue;
        media.push({
          name,
          uri,
          sizeBytes: "size" in info && typeof info.size === "number" ? info.size : 0,
          kind,
        });
      }
      media.sort((a, b) => a.name.localeCompare(b.name));
      setLocalFiles(media);
    } catch {
      setLocalFiles([]);
    }
  }, [downloadDir]);

  const queueRef = useRef<DownloadQueue | null>(null);
  const queueLogSnapshotRef = useRef<Map<string, QueueLogSnapshot>>(new Map());
  const onRecoverableDisconnectRef = useRef<(message: string) => void>(() => undefined);
  onRecoverableDisconnectRef.current = (message: string) => {
    setCameraLinkState((prev) =>
      prev === "idle" || prev === "disconnected" ? prev : "connection_lost",
    );
    setLastError(message);
    appLog.error("connection", `recoverable disconnect: ${message}`);
    const now = Date.now();
    if (now - disconnectAlertAtRef.current > 4_000) {
      disconnectAlertAtRef.current = now;
      notifyCameraDisconnected(message);
    }
  };
  if (queueRef.current === null) {
    const store = isExpoGo
      ? new MemoryQueueStore()
      : new AsyncStorageQueueStore(AsyncStorage);
    const sink =
      FileSystem.documentDirectory !== null && FileSystem.documentDirectory !== undefined
        ? new ExpoFileSink(FileSystem)
        : new MemoryFileSink();
    const createdQueue = new DownloadQueue({
      store,
      transport: new DemoTransport(),
      sink,
      downloadDir,
      onRecoverableDisconnect: (message) => onRecoverableDisconnectRef.current(message),
      onChange: (items) => {
        setQueueItems(items);
        queueLogSnapshotRef.current = observeQueueForAppLogs(
          queueLogSnapshotRef.current,
          items,
        );
        const justFinished = items.some((item) => item.status === "completed");
        if (justFinished) void refreshLocalFiles();
      },
    });
    // The connection supervisor is authoritative. Never let restored work start
    // before the current camera session has been confirmed.
    createdQueue.setConnectionAvailable(false);
    queueRef.current = createdQueue;
  }
  const queue = queueRef.current;

  const resolveCameraPreview = useCallback(
    async (file: RemoteFile): Promise<CameraPreviewResult> => {
      const hostAtStart = cameraHostRef.current.trim();
      const requestGen = cameraSessionGenRef.current;
      const availability = cameraPreviewAvailability({
        file,
        linkState: linkStateRef.current,
        cameraHost: hostAtStart,
        cameraProperties: cameraPropertiesRef.current,
        demoMode: demoModeRef.current,
      });
      if (!availability.available) {
        appLog.warn("playback", `preview blocked ${file.name}: ${availability.reason}`);
        return { ok: false, error: availability.reason };
      }

      if (availability.kind === "image") {
        const uri = await resolveCameraThumbUri(file.path);
        if (!uri) {
          appLog.warn("playback", `photo preview failed ${file.name}`);
          return { ok: false, error: "The photo preview could not be loaded from the camera." };
        }
        if (
          !isCameraSessionCurrent(requestGen, cameraSessionGenRef.current) ||
          cameraHostRef.current.trim() !== hostAtStart ||
          !isCameraLibraryInteractive(linkStateRef.current)
        ) {
          return { ok: false, error: "The camera connection changed while loading the preview." };
        }
        appLog.info("playback", `photo preview ready ${file.name}`);
        return { ok: true, uri, kind: "image", source: "cache" };
      }

      if (queue.list().some((item) => item.status === "active")) {
        const error = "Wait for the active download to finish before previewing this video.";
        appLog.warn("playback", `video preview blocked active download ${file.name}`);
        return { ok: false, error };
      }

      try {
        const client = new CameraClient(
          { host: hostAtStart, httpPort: 80, rtspPort: 554 },
          createLiveTransport(hostAtStart, ENQUEUE_PROBE_TIMEOUT_MS),
        );
        const head = await client.headFile(file.path);
        if (head.statusCode < 200 || head.statusCode >= 300) {
          throw new Error(`Camera returned HTTP ${head.statusCode}`);
        }
        if (
          !isCameraSessionCurrent(requestGen, cameraSessionGenRef.current) ||
          cameraHostRef.current.trim() !== hostAtStart ||
          !isCameraLibraryInteractive(linkStateRef.current)
        ) {
          return { ok: false, error: "The camera connection changed while preparing the preview." };
        }
        const uri = buildCameraPreviewUrl(hostAtStart, file.path);
        appLog.info("playback", `video preview ready ${file.name}`);
        return { ok: true, uri, kind: "video", source: "camera" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appLog.warn("playback", `video preview failed ${file.name}: ${message}`);
        return {
          ok: false,
          error: "Video preview could not start. Check the camera connection or download the file.",
        };
      }
    },
    [queue, resolveCameraThumbUri],
  );

  const setCameraHost = useCallback(
    (host: string) => {
      const trimmed = host.trim();
      setCameraHostState(trimmed);
      void AsyncStorage.setItem(HOST_KEY, trimmed);
      // IP / camera change must not reuse another camera’s software properties.
      setCameraProperties({});
      clearRemoteCameraLibrary("disconnected");
      consecutiveVerifyFailuresRef.current = 0;
      reconnectAttemptRef.current = 0;
      lastVerifiedAtRef.current = undefined;
      setLastError(undefined);
      setConnectionNote(undefined);
    },
    [clearRemoteCameraLibrary],
  );
  const setMapPreference = useCallback((value: MapPreference) => {
    setMapPreferenceState(value);
    void AsyncStorage.setItem(MAP_PREF_KEY, value);
  }, []);

  const setDemoMode = useCallback(
    (value: boolean) => {
      setDemoModeState(value);
      setLastError(undefined);
      setConnectionNote(undefined);
      if (value) {
        queue.setTransport(new DemoTransport());
        setFiles(DEMO_FILES);
        setCameraLinkState("connected");
        setCameraModel(COMPAT_MODEL);
        setLastConnectedAt(new Date().toISOString());
      } else {
        cameraSessionGenRef.current = bumpCameraSessionGeneration(cameraSessionGenRef.current);
        setFiles([]);
        setCameraLinkState("idle");
        setCameraModel(undefined);
        setCameraProperties({});
        setConnectionNote(undefined);
      }
    },
    [queue],
  );
  const clearThumbCache = useCallback(async () => {
    appLog.info("storage", "thumbnail cache clear start");
    try {
      await FileSystem.deleteAsync(thumbDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(thumbDir, { intermediates: true });
      appLog.info("storage", "thumbnail cache clear success");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appLog.error("storage", `thumbnail cache clear failed: ${message}`);
    }
  }, [thumbDir]);

  const refreshFiles = useCallback(
    async (opts?: { readonly host?: string }): Promise<{ ok: boolean; error?: string }> => {
      if (!canStartCameraRefresh(refreshInflightRef.current)) {
        return { ok: false, error: CAMERA_REFRESH_IN_PROGRESS };
      }
      const host = (opts?.host ?? cameraHost).trim();
      const requestGen = cameraSessionGenRef.current;
      refreshInflightRef.current = true;
      setIsRefreshingCamera(true);
      const prevLink = linkStateRef.current;
      setCameraLinkState("connecting");
      appLog.info("connection", `refresh start host=${host} from=${prevLink}`);
      // Never show a stale remote list while reconnecting from an unavailable state.
      if (prevLink !== "connected" && prevLink !== "unstable") {
        setFiles([]);
      }
      setLastError(undefined);
      try {
        if (demoMode) {
          const client = new CameraClient(
            { host: "127.0.0.1", httpPort: 80, rtspPort: 554 },
            new DemoTransport(),
          );
          const page = await client.listAllFiles({ pageSize: 32, maxFiles: 200 });
          if (!isCameraSessionCurrent(requestGen, cameraSessionGenRef.current)) {
            appLog.warn("connection", "refresh aborted: camera session changed");
            return { ok: false, error: "Camera session changed." };
          }
          setFiles(page.files);
          setCameraLinkState("connected");
          setCameraModel(COMPAT_MODEL);
          setLastConnectedAt(new Date().toISOString());
          setConnectionNote(undefined);
          consecutiveVerifyFailuresRef.current = 0;
          reconnectAttemptRef.current = 0;
          lastVerifiedAtRef.current = Date.now();
          appLog.info("connection", `refresh ok (demo) files=${page.files.length}`);
          return { ok: true };
        }

        if (!isPrivateIpv4(host)) {
          const error = "Host must be a private IPv4 address (e.g. 192.72.1.1).";
          clearRemoteCameraLibrary("disconnected", error);
          return { ok: false, error };
        }

        const transport = createLiveTransport(host);
        queue.setTransport(transport);
        const client = new CameraClient(
          { host, httpPort: 80, rtspPort: 554 },
          transport,
        );
        const status = await client.getStatus();
        const page = await client.listAllFiles({ pageSize: 32, maxFiles: 500 });
        if (!isCameraSessionCurrent(requestGen, cameraSessionGenRef.current)) {
          appLog.warn("connection", "refresh aborted: camera session changed");
          return { ok: false, error: "Camera session changed." };
        }
        let settingsProps: Readonly<Record<string, string>> = {};
        try {
          settingsProps = await fetchCameraSettingProperties(transport);
        } catch {
          // status properties still usable
        }
        const previewProps = await fetchCameraPreviewCapability(client);
        if (!isCameraSessionCurrent(requestGen, cameraSessionGenRef.current)) {
          appLog.warn("connection", "refresh aborted: camera session changed");
          return { ok: false, error: "Camera session changed." };
        }
        setCameraProperties({ ...status.properties, ...settingsProps, ...previewProps });
        setFiles(page.files);
        setCameraLinkState("connected");
        setCameraModel(COMPAT_MODEL);
        setLastConnectedAt(new Date().toISOString());
        setConnectionNote(undefined);
        consecutiveVerifyFailuresRef.current = 0;
        reconnectAttemptRef.current = 0;
        lastVerifiedAtRef.current = Date.now();
        appLog.info("connection", `refresh ok files=${page.files.length}`);
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Never keep Connected/Unstable or a stale list after timeout or network failure.
        clearRemoteCameraLibrary("disconnected", message);
        appLog.error("connection", `refresh failed: ${message}`);
        return { ok: false, error: message };
      } finally {
        refreshInflightRef.current = false;
        setIsRefreshingCamera(false);
      }
    },
    [demoMode, cameraHost, queue, clearRemoteCameraLibrary],
  );
  const refreshFilesRef = useRef(refreshFiles);
  refreshFilesRef.current = refreshFiles;

  const runSilentHealthCheckRef = useRef<() => Promise<void>>(async () => undefined);

  const clearHealthRetryTimer = useCallback(() => {
    if (healthRetryTimerRef.current !== undefined) {
      clearTimeout(healthRetryTimerRef.current);
      healthRetryTimerRef.current = undefined;
    }
  }, []);

  const runSilentHealthCheck = useCallback(async (): Promise<void> => {
    if (demoModeRef.current) return;
    if (cameraPreviewActiveRef.current) return;
    const host = cameraHostRef.current.trim();
    if (!isPrivateIpv4(host)) return;

    const hasActiveDownload = queue.list().some((item) => item.status === "active");
    if (
      isBusyForHealthCheck({
        verifyInflight: verifyInflightLocalRef.current,
        refreshInflight: refreshInflightRef.current,
        settingApplyInflight: settingApplyInflightRef.current || formatSdInflightRef.current,
        hasActiveDownload,
      })
    ) {
      // An active queue row is not proof of live progress. Queue failures remain
      // the connection-drop signal; verify again after the competing operation ends.
      return;
    }

    if (shouldSkipVerifyBecauseRecent(lastVerifiedAtRef.current, Date.now())) return;

    const requestGen = cameraSessionGenRef.current;
    const hostAtStart = host;
    const verifySeq = ++healthVerifySeqRef.current;
    verifyInflightLocalRef.current = true;
    try {
      const result = await verifyCameraReachability({
        host,
        deps: {
          createTransport: (h, timeoutMs) => createLiveTransport(h, timeoutMs),
          timeoutMs: CAMERA_HEALTH_TIMEOUT_MS,
        },
      });
      if (verifySeq !== healthVerifySeqRef.current) return;
      if (appStateRef.current !== "active" || demoModeRef.current) return;
      if (!isCameraSessionCurrent(requestGen, cameraSessionGenRef.current)) return;
      if (cameraHostRef.current.trim() !== hostAtStart) return;

      if (result.ok) {
        consecutiveVerifyFailuresRef.current = 0;
        reconnectAttemptRef.current = 0;
        lastVerifiedAtRef.current = Date.now();
        clearHealthRetryTimer();
        setLastError(undefined);
        setCameraProperties((prev) => ({ ...prev, ...result.properties }));
        setCameraLinkState("connected");
        setLastConnectedAt(new Date().toISOString());
        return;
      }

      const failures = consecutiveVerifyFailuresRef.current + 1;
      consecutiveVerifyFailuresRef.current = failures;
      const sanitized = sanitizeDiagnosticLine(result.error);
      appLog.warn("connection", `health check fail #${failures}: ${sanitized}`);
      if (shouldClearLibraryAfterFailures(failures)) {
        clearHealthRetryTimer();
        clearRemoteCameraLibrary("connection_lost", sanitized);
        return;
      }
      setCameraLinkState(linkStateAfterVerifyFailure(failures));
    } finally {
      verifyInflightLocalRef.current = false;
    }
  }, [queue, clearHealthRetryTimer, clearRemoteCameraLibrary]);

  runSilentHealthCheckRef.current = runSilentHealthCheck;

  const refreshCameraSettings = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (demoMode) {
      return { ok: false, error: "Camera settings are unavailable in Demo Mode." };
    }
    if (!isCameraLibraryInteractive(cameraLinkState)) {
      return { ok: false, error: "Connect to the camera to view and change its settings." };
    }
    if (!isPrivateIpv4(cameraHost)) {
      return { ok: false, error: "Host must be a private IPv4 address." };
    }
    const requestGen = cameraSessionGenRef.current;
    try {
      const transport = createLiveTransport(cameraHost, 12_000);
      const settingsProps = await fetchCameraSettingProperties(transport);
      if (!isCameraSessionCurrent(requestGen, cameraSessionGenRef.current)) {
        return { ok: false, error: "Camera session changed." };
      }
      setCameraProperties((prev) => ({ ...prev, ...settingsProps }));
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  }, [demoMode, cameraLinkState, cameraHost]);

  const refreshCameraInformation = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    if (demoMode) {
      return { ok: false, error: "Camera settings are unavailable in Demo Mode." };
    }
    if (!isPrivateIpv4(cameraHost)) {
      const error = "Host must be a private IPv4 address.";
      clearRemoteCameraLibrary("disconnected", error);
      return { ok: false, error };
    }
    if (refreshInflightRef.current) {
      return { ok: false, error: CAMERA_REFRESH_IN_PROGRESS };
    }
    refreshInflightRef.current = true;
    setIsRefreshingCamera(true);
    const requestGen = cameraSessionGenRef.current;
    try {
      const transport = createLiveTransport(cameraHost, 12_000);
      // Do not replace Queue transport — settings use a short-lived client.
      const client = new CameraClient({ host: cameraHost, httpPort: 80, rtspPort: 554 }, transport);
      const status = await client.getStatus();
      const settingsProps = await fetchCameraSettingProperties(transport);
      const previewProps = await fetchCameraPreviewCapability(client);
      if (!isCameraSessionCurrent(requestGen, cameraSessionGenRef.current)) {
        return { ok: false, error: "Camera session changed." };
      }
      setCameraProperties({ ...status.properties, ...settingsProps, ...previewProps });
      setCameraLinkState("connected");
      setCameraModel(COMPAT_MODEL);
      setLastConnectedAt(new Date().toISOString());
      setLastError(undefined);
      setConnectionNote(undefined);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      clearRemoteCameraLibrary("disconnected", message);
      return { ok: false, error: message };
    } finally {
      refreshInflightRef.current = false;
      setIsRefreshingCamera(false);
    }
  }, [demoMode, cameraHost, clearRemoteCameraLibrary]);

  const setCameraSetting = useCallback(
    async <K extends CameraSettingKey>(
      key: K,
      value: CameraSettingValueMap[K],
    ): Promise<{ ok: boolean; error?: string }> => {
      if (demoMode) {
        appLog.warn("settings", `camera setting blocked key=${key}: Demo Mode`);
        return { ok: false, error: "Camera settings are unavailable in Demo Mode." };
      }
      if (!isCameraLibraryInteractive(cameraLinkState)) {
        appLog.warn("settings", `camera setting blocked key=${key}: camera disconnected`);
        return { ok: false, error: "Camera disconnected." };
      }
      if (!isPrivateIpv4(cameraHost)) {
        appLog.warn("settings", `camera setting blocked key=${key}: invalid camera host`);
        return { ok: false, error: "Host must be a private IPv4 address." };
      }
      if (!isCameraSettingKey(key) || !isAllowedCameraSettingValue(key, value)) {
        appLog.warn("settings", `camera setting blocked key=${key}: unsupported value`);
        return { ok: false, error: "Unsupported camera setting." };
      }
      const property = CAMERA_SETTING_PROPERTY[key];
      if (!(property in cameraPropertiesRef.current)) {
        appLog.warn("settings", `camera setting blocked key=${key}: capability not reported`);
        return { ok: false, error: "This setting is not reported by the camera." };
      }
      if (settingApplyInflightRef.current || formatSdInflightRef.current) {
        appLog.warn("settings", `camera setting blocked key=${key}: operation already in progress`);
        return { ok: false, error: "Another setting change is already in progress." };
      }

      settingApplyInflightRef.current = true;
      setIsApplyingCameraSetting(true);
      setApplyingCameraSettingKey(key);
      const requestGen = cameraSessionGenRef.current;
      const previousValue = cameraPropertiesRef.current[property] ?? "unknown";
      const firmware =
        cameraPropertiesRef.current["Vendor.DeviceInfo.Version.Firmware"] ?? "unknown";
      appLog.info(
        "settings",
        `camera setting start key=${key} property=${property} from=${previousValue} to=${value} model=${cameraModel ?? "unknown"} firmware=${firmware}`,
      );
      try {
        const transport = createLiveTransport(cameraHost, 15_000);
        const result = await applyCameraSetting(transport, key, value);
        if (
          !isCameraSessionCurrent(requestGen, cameraSessionGenRef.current) ||
          !isCameraLibraryInteractive(linkStateRef.current)
        ) {
          appLog.warn(
            "settings",
            `camera setting result discarded key=${key} requested=${value}: camera session changed`,
          );
          return { ok: false, error: "Camera disconnected." };
        }
        setCameraProperties((prev) => ({
          ...prev,
          ...result.properties,
          [property]: value,
        }));
        setLastError(undefined);
        appLog.info(
          "settings",
          `camera setting success key=${key} from=${previousValue} to=${value} verified=true`,
        );
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!isCameraLibraryInteractive(linkStateRef.current)) {
          appLog.error(
            "settings",
            `camera setting failed_or_unknown key=${key} requested=${value}: camera disconnected`,
          );
          return { ok: false, error: "Camera disconnected." };
        }
        appLog.error(
          "settings",
          `camera setting failed_or_unknown key=${key} requested=${value}: ${message}`,
        );
        return { ok: false, error: message };
      } finally {
        settingApplyInflightRef.current = false;
        setIsApplyingCameraSetting(false);
        setApplyingCameraSettingKey(undefined);
      }
    },
    [demoMode, cameraLinkState, cameraHost, cameraModel],
  );

  const formatCameraSdCard = useCallback(async (): Promise<{
    ok: boolean;
    outcome?: FormatSdCardOutcome;
    error?: string;
    message?: string;
  }> => {
    if (demoMode) {
      appLog.warn("storage", "format SD blocked: Demo Mode");
      return { ok: false, error: "Format SD card is unavailable in Demo Mode." };
    }
    if (!isCameraLibraryInteractive(cameraLinkState)) {
      appLog.warn("storage", "format SD blocked: camera disconnected");
      return { ok: false, error: "Camera disconnected." };
    }
    if (!isPrivateIpv4(cameraHost)) {
      appLog.warn("storage", "format SD blocked: invalid camera host");
      return { ok: false, error: "Host must be a private IPv4 address." };
    }
    if (settingApplyInflightRef.current || formatSdInflightRef.current) {
      appLog.warn("storage", "format SD blocked: camera operation already in progress");
      return { ok: false, error: "Another camera operation is already in progress." };
    }

    formatSdInflightRef.current = true;
    setIsFormattingSdCard(true);
    const requestGen = cameraSessionGenRef.current;
    const firmware =
      cameraPropertiesRef.current["Vendor.DeviceInfo.Version.Firmware"] ?? "unknown";
    appLog.warn(
      "storage",
      `format SD start model=${cameraModel ?? "unknown"} firmware=${firmware}`,
    );
    try {
      const transport = createLiveTransport(cameraHost, 300_000);
      const result = await formatSdCard(transport);
      if (
        !isCameraSessionCurrent(requestGen, cameraSessionGenRef.current) ||
        !isCameraLibraryInteractive(linkStateRef.current)
      ) {
        appLog.error("storage", "format SD failed_or_unknown: camera session changed");
        return { ok: false, error: "Camera disconnected." };
      }
      if (result.outcome === "success" || result.outcome === "unknown") {
        void refreshFilesRef.current();
      }
      if (result.outcome === "success") {
        appLog.info("storage", `format SD success verified=true: ${result.message}`);
      } else if (result.outcome === "unknown") {
        appLog.warn("storage", `format SD outcome=unknown: ${result.message}`);
      } else {
        appLog.error("storage", `format SD failed: ${result.message}`);
      }
      return {
        ok: result.outcome === "success",
        outcome: result.outcome,
        message: result.message,
        ...(result.outcome === "success" ? {} : { error: result.message }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isCameraLibraryInteractive(linkStateRef.current)) {
        appLog.error("storage", "format SD failed_or_unknown: camera disconnected");
        return { ok: false, error: "Camera disconnected." };
      }
      appLog.error("storage", `format SD failed_or_unknown: ${message}`);
      return { ok: false, error: message };
    } finally {
      formatSdInflightRef.current = false;
      setIsFormattingSdCard(false);
    }
  }, [demoMode, cameraLinkState, cameraHost, cameraModel]);

  React.useEffect(() => {
    if (bootOnceRef.current) return;
    bootOnceRef.current = true;
    void (async () => {
      let host = DEFAULT_HOST;
      try {
        const saved = await AsyncStorage.getItem(HOST_KEY);
        if (saved && isPrivateIpv4(saved)) {
          host = saved;
          setCameraHostState(saved);
        }
        const mapPref = await AsyncStorage.getItem(MAP_PREF_KEY);
        if (mapPref === "online" || mapPref === "schematic") setMapPreferenceState(mapPref);
        await queue.init();
        try {
          await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
        } catch {
          // directory may already exist
        }
        await refreshLocalFiles();

        const probe = refreshFilesRef.current({ host });
        await Promise.race([
          probe,
          new Promise<void>((resolve) => {
            setTimeout(resolve, BOOTSTRAP_PROBE_BUDGET_MS);
          }),
        ]);
      } finally {
        setCameraBootstrapDone(true);
      }
    })();
  }, [queue, downloadDir, refreshLocalFiles]);

  useEffect(() => {
    let cancelForegroundVerify: (() => void) | undefined;
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const stopPollingAndReconnect = () => {
      if (pollInterval !== undefined) {
        clearInterval(pollInterval);
        pollInterval = undefined;
      }
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const armDisconnectedReconnect = () => {
      if (
        !shouldRunDisconnectedReconnect({
          appState: appStateRef.current,
          demoMode: demoModeRef.current,
          linkState: linkStateRef.current,
        })
      ) {
        return;
      }
      if (refreshInflightRef.current) return;
      const delay = nextReconnectBackoffMs(reconnectAttemptRef.current);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        reconnectAttemptRef.current += 1;
        void refreshFilesRef.current();
      }, delay);
    };

    const armActivePolling = () => {
      if (
        !shouldRunActiveHealthPoll({
          appState: appStateRef.current,
          demoMode: demoModeRef.current,
          linkState: linkStateRef.current,
        })
      ) {
        return;
      }
      pollInterval = setInterval(() => {
        void runSilentHealthCheckRef.current();
      }, ACTIVE_POLL_INTERVAL_MS);
    };

    const armUnstableRetry = () => {
      clearHealthRetryTimer();
      healthRetryTimerRef.current = setTimeout(() => {
        healthRetryTimerRef.current = undefined;
        void runSilentHealthCheckRef.current();
      }, VERIFY_RETRY_AFTER_FIRST_FAILURE_MS);
    };

    const syncSupervisorTimers = () => {
      stopPollingAndReconnect();
      if (appStateRef.current !== "active" || demoModeRef.current) {
        clearHealthRetryTimer();
        return;
      }
      if (linkStateRef.current === "unstable") {
        armUnstableRetry();
        return;
      }
      if (
        shouldRunActiveHealthPoll({
          appState: appStateRef.current,
          demoMode: false,
          linkState: linkStateRef.current,
        })
      ) {
        armActivePolling();
        return;
      }
      armDisconnectedReconnect();
    };

    const onChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next !== "active") {
        const pendingCount = queue.list().filter(
          (item) =>
            item.status === "active" ||
            item.status === "queued" ||
            item.status === "waiting_for_connection",
        ).length;
        if (pendingCount > 0) {
          appLog.info(
            "download",
            `queue suspended appState=${next} pending=${pendingCount}`,
          );
        }
        queue.setConnectionAvailable(false);
        cancelForegroundVerify?.();
        cancelForegroundVerify = undefined;
        clearHealthRetryTimer();
        stopPollingAndReconnect();
        return;
      }

      syncSupervisorTimers();

      const queueCanResume =
        linkStateRef.current === "connected" && !demoModeRef.current;
      queue.setConnectionAvailable(queueCanResume);
      if (queueCanResume) {
        const pendingCount = queue.list().filter(
          (item) =>
            item.status === "active" ||
            item.status === "queued" ||
            item.status === "waiting_for_connection",
        ).length;
        if (pendingCount > 0) {
          appLog.info("download", `queue resume requested pending=${pendingCount}`);
        }
      }

      if (!isAppForegroundResume(prev, next)) return;
      if (demoModeRef.current) return;
      if (!isPrivateIpv4(cameraHostRef.current)) return;
      if (
        !shouldRunActiveHealthPoll({
          appState: next,
          demoMode: false,
          linkState: linkStateRef.current,
        })
      ) {
        return;
      }
      // Stale-while-revalidate: keep Connected UI + files; silent GET status only.
      cancelForegroundVerify?.();
      cancelForegroundVerify = scheduleOneShotVerify(() => {
        void runSilentHealthCheckRef.current();
      }, FOREGROUND_VERIFY_DEBOUNCE_MS);
    };

    syncSupervisorTimers();
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      cancelForegroundVerify?.();
      clearHealthRetryTimer();
      stopPollingAndReconnect();
      sub.remove();
    };
  }, [demoMode, cameraLinkState, cameraHost, clearHealthRetryTimer, queue]);

  useEffect(() => {
    queue.setConnectionAvailable(
      appStateRef.current === "active" && cameraLinkState === "connected" && !demoMode,
    );
  }, [cameraLinkState, demoMode, queue]);

  useEffect(() => {
    queueStatusRef.current = new Map(queueItems.map((item) => [item.id, item.status]));
  }, [queueItems]);

  const disconnectSession = useCallback(() => {
    clearRemoteCameraLibrary("disconnected");
    consecutiveVerifyFailuresRef.current = 0;
    reconnectAttemptRef.current = 0;
    lastVerifiedAtRef.current = undefined;
    setCameraModel(undefined);
    setCameraProperties({});
    setLastConnectedAt(undefined);
    setLastError(undefined);
    setConnectionNote(undefined);
  }, [clearRemoteCameraLibrary]);
  const enqueueNmeaSidecar = useCallback(
    async (remotePath: string, localName: string) => {
      const nmeaPath = remotePath.replace(/\.[^.]+$/u, ".NMEA");
      const nmeaName = localName.replace(/\.[^.]+$/u, ".NMEA");
      try {
        // Probe with a separate transport so we do not steal the queue mid-download.
        const probe = demoMode ? new DemoTransport() : createLiveTransport(cameraHost, 30_000);
        const head = await probe.request({ method: "HEAD", path: nmeaPath });
        if (head.statusCode !== 200) return;
        const lengthHeader = head.headers["content-length"];
        const expectedBytes =
          lengthHeader !== undefined && /^\d+$/.test(lengthHeader)
            ? Number.parseInt(lengthHeader, 10)
            : 8_192;
        await queue.enqueue({
          remotePath: nmeaPath,
          localName: nmeaName,
          expectedBytes,
        });
      } catch {
        // Video download already queued; missing NMEA is non-fatal.
      }
    },
    [demoMode, cameraHost, queue],
  );

  const enqueueDownload = useCallback(
    async (file: RemoteFile) => {
      try {
        if (!demoMode) {
          if (!isPrivateIpv4(cameraHost)) {
            setLastError("Host must be a private IPv4 address.");
            appLog.error("download", "enqueue blocked: invalid host");
            return;
          }
          if (!nativeTcpReady && file.sizeBytes > FETCH_MAX_DOWNLOAD_BYTES) {
            const msg = `${file.name} is ~${formatMiB(file.sizeBytes)}. Expo Go Fetch cannot download clips over ${formatMiB(FETCH_MAX_DOWNLOAD_BYTES)} (memory/timeout). Pick a smaller file, use Demo Mode, download via PC CLI, or wait for native Http10Tcp (Apple Developer).`;
            setLastError(msg);
            appLog.error("download", `enqueue blocked: ${file.name} too large for Expo Go`);
            return;
          }
          // Fail fast when the link is already dead — avoid "Starting download…" hangs.
          try {
            const probe = createLiveTransport(cameraHost, ENQUEUE_PROBE_TIMEOUT_MS);
            const head = await probe.request({ method: "HEAD", path: file.path });
            if (head.statusCode !== 200) {
              throw new Error(`HEAD HTTP ${head.statusCode}`);
            }
            // Reachable again — update link chrome without starting a full library refresh
            // (that would replace the queue transport mid-enqueue).
            setCameraLinkState("connected");
            setLastError(undefined);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            clearRemoteCameraLibrary("connection_lost", message);
            notifyCameraDisconnected(message);
            return;
          }
          queue.setTransport(createQueueTransport(cameraHost, fetchTimeoutForBytes(file.sizeBytes)));
          if (!nativeTcpReady) {
            setConnectionNote(
              `Expo Go download with live progress (FileSystem). Max ~${formatMiB(FETCH_MAX_DOWNLOAD_BYTES)} per file.`,
            );
          }
        } else {
          queue.setTransport(new DemoTransport());
        }
        await queue.enqueue({
          remotePath: file.path,
          localName: file.name,
          expectedBytes: file.sizeBytes,
        });
        if (/\.mp4$/i.test(file.name)) {
          void enqueueNmeaSidecar(file.path, file.name);
        }
        setLastError(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLastError(message);
        appLog.error("download", `enqueue error: ${message}`);
      }
    },
    [demoMode, cameraHost, queue, nativeTcpReady, enqueueNmeaSidecar, clearRemoteCameraLibrary],
  );

  const cancelDownload = useCallback(
    async (id: string) => {
      try {
        const item = queue.list().find((entry) => entry.id === id);
        await queue.cancel(id);
        // Cancel companion NMEA transfer when the user cancels the video.
        if (item && /\.mp4$/i.test(item.localName)) {
          const nmeaName = item.localName.replace(/\.[^.]+$/u, ".NMEA");
          const sidecar = queue
            .list()
            .find(
              (entry) =>
                entry.localName === nmeaName &&
                (entry.status === "queued" ||
                  entry.status === "active" ||
                  entry.status === "paused"),
            );
          if (sidecar) await queue.cancel(sidecar.id);
        }
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [queue],
  );

  const pauseDownload = useCallback(
    async (id: string) => {
      try {
        await queue.pause(id);
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [queue],
  );

  const resumeDownload = useCallback(
    async (id: string) => {
      try {
        await queue.resume(id);
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [queue],
  );

  const retryDownload = useCallback(
    async (id: string) => {
      try {
        const item = queue.list().find((entry) => entry.id === id);
        if (!item || (item.status !== "failed" && item.status !== "cancelled")) return;
        if (!demoMode) {
          if (!isPrivateIpv4(cameraHost)) {
            setLastError("Host must be a private IPv4 address.");
            return;
          }
          try {
            const probe = createLiveTransport(cameraHost, ENQUEUE_PROBE_TIMEOUT_MS);
            const head = await probe.request({ method: "HEAD", path: item.remotePath });
            if (head.statusCode !== 200) {
              throw new Error(`HEAD HTTP ${head.statusCode}`);
            }
            setCameraLinkState("connected");
            setLastError(undefined);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            clearRemoteCameraLibrary("connection_lost", message);
            notifyCameraDisconnected(message);
            return;
          }
          queue.setTransport(
            createQueueTransport(cameraHost, fetchTimeoutForBytes(item.expectedBytes)),
          );
        } else {
          queue.setTransport(new DemoTransport());
        }
        await queue.retry(id);
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [demoMode, cameraHost, queue, nativeTcpReady, clearRemoteCameraLibrary],
  );

  const removeFromQueue = useCallback(
    async (id: string) => {
      try {
        await queue.remove(id);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [queue],
  );

  const shareUri = useCallback(async (uri: string, name: string): Promise<boolean> => {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      setLastError("Local file missing. Download again.");
      return false;
    }
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      setLastError("Sharing is not available on this device.");
      return false;
    }
    await Sharing.shareAsync(uri, {
      mimeType: mimeForName(name),
      UTI: utiForName(name),
      dialogTitle: `Save ${name}`,
    });
    setLastError(undefined);
    return true;
  }, []);

  const shareCompleted = useCallback(
    async (item: QueueItem) => {
      try {
        if (item.status !== "completed") {
          setLastError("Only completed downloads can be shared.");
          return;
        }
        const uri = downloadDir.endsWith("/")
          ? `${downloadDir}${item.localName}`
          : `${downloadDir}/${item.localName}`;
        await shareUri(uri, item.localName);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [downloadDir, shareUri],
  );

  const shareLocalFile = useCallback(
    async (file: LocalMediaFile): Promise<boolean> => {
      try {
        return await shareUri(file.uri, file.name);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
        return false;
      }
    },
    [shareUri],
  );

  const deleteLocalFile = useCallback(
    async (file: LocalMediaFile) => {
      try {
        await FileSystem.deleteAsync(file.uri, { idempotent: true });
        if (/\.mp4$/i.test(file.name)) {
          const nmeaUri = file.uri.replace(/\.[^.]+$/u, ".NMEA");
          await FileSystem.deleteAsync(nmeaUri, { idempotent: true });
        }
        await refreshLocalFiles();
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [refreshLocalFiles],
  );

  const deleteLocalFilesBatch = useCallback(
    async (files: readonly LocalMediaFile[]) => {
      const requestedBytes = files.reduce((sum, file) => sum + Math.max(0, file.sizeBytes), 0);
      appLog.warn(
        "storage",
        `delete local library start files=${files.length} bytes=${requestedBytes}`,
      );
      let deleted = 0;
      let failed = 0;
      for (const file of files) {
        try {
          assertManagedLocalMediaUri(file.uri, downloadDir);
          await FileSystem.deleteAsync(file.uri, { idempotent: true });
          if (/\.mp4$/i.test(file.name)) {
            const nmeaUri = file.uri.replace(/\.[^.]+$/u, ".NMEA");
            await FileSystem.deleteAsync(nmeaUri, { idempotent: true });
          }
          deleted += 1;
        } catch {
          failed += 1;
        }
      }
      try {
        await refreshLocalFiles();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appLog.error(
          "storage",
          `delete local library refresh failed deleted=${deleted} failed=${failed}: ${message}`,
        );
        throw error;
      }
      if (failed === 0) {
        appLog.info("storage", `delete local library success deleted=${deleted} failed=0`);
      } else if (deleted > 0) {
        appLog.warn(
          "storage",
          `delete local library partial deleted=${deleted} failed=${failed}`,
        );
      } else {
        appLog.error("storage", `delete local library failed deleted=0 failed=${failed}`);
      }
      return { deleted, failed };
    },
    [downloadDir, refreshLocalFiles],
  );

  const value = useMemo<DemoModeContextValue>(
    () => ({
      demoMode,
      setDemoMode,
      cameraHost,
      setCameraHost,
      files,
      queueItems,
      localFiles,
      refreshFiles,
      disconnectSession,
      refreshLocalFiles,
      enqueueDownload,
      cancelDownload,
      pauseDownload,
      resumeDownload,
      retryDownload,
      removeFromQueue,
      shareCompleted,
      shareLocalFile,
      deleteLocalFile,
      deleteLocalFilesBatch,
      queuePosition: (id) => queue.queuePosition(id),
      downloadDir,
      lastError,
      connectionNote,
      nativeTcpReady,
      isExpoGo,
      cameraLinkState,
      cameraBootstrapDone,
      isRefreshingCamera,
      lastConnectedAt,
      cameraModel,
      cameraProperties,
      refreshCameraSettings,
      refreshCameraInformation,
      setCameraSetting,
      isApplyingCameraSetting,
      applyingCameraSettingKey,
      formatCameraSdCard,
      isFormattingSdCard,
      mapPreference,
      setMapPreference,
      clearThumbCache,
      resolveCameraThumbUri,
      resolveCameraPreview,
      setCameraPreviewActive,
    }),
    [
      demoMode,
      setDemoMode,
      cameraHost,
      setCameraHost,
      files,
      queueItems,
      localFiles,
      refreshFiles,
      disconnectSession,
      refreshLocalFiles,
      enqueueDownload,
      cancelDownload,
      pauseDownload,
      resumeDownload,
      retryDownload,
      removeFromQueue,
      shareCompleted,
      shareLocalFile,
      deleteLocalFile,
      deleteLocalFilesBatch,
      queue,
      downloadDir,
      lastError,
      connectionNote,
      nativeTcpReady,
      isExpoGo,
      cameraLinkState,
      cameraBootstrapDone,
      isRefreshingCamera,
      lastConnectedAt,
      cameraModel,
      cameraProperties,
      refreshCameraSettings,
      refreshCameraInformation,
      setCameraSetting,
      isApplyingCameraSetting,
      applyingCameraSettingKey,
      formatCameraSdCard,
      isFormattingSdCard,
      mapPreference,
      setMapPreference,
      clearThumbCache,
      resolveCameraThumbUri,
      resolveCameraPreview,
      setCameraPreviewActive,
    ],
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext);
  if (ctx === undefined) {
    throw new Error("useDemoMode must be used within DemoModeProvider");
  }
  return ctx;
}

function mimeForName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gpx")) return "application/gpx+xml";
  return "application/octet-stream";
}

function utiForName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "public.mpeg-4";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "public.jpeg";
  return "public.data";
}

function kindForName(name: string): LocalMediaFile["kind"] {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) return "image";
  return "other";
}
