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

import {
  APP_STATE_VERIFY_DEBOUNCE_MS,
  scheduleOneShotVerify,
} from "@/components/onboarding/appStateVerify";
import {
  bumpCameraSessionGeneration,
  isCameraSessionCurrent,
} from "@/components/camera/cameraLibraryModel";

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
  type Transport,
} from "../packages/camera-transport/src/index";
import { DEMO_FILES, DemoTransport } from "../packages/demo/src/index";
import {
  CAMERA_CONNECTION_LOST_MESSAGE,
  DownloadQueue,
  ExpoFileSink,
  MemoryFileSink,
} from "../packages/download-queue/src/index";
import { AsyncStorageQueueStore, MemoryQueueStore, type QueueItem } from "../packages/local-db/src/index";
import type { CameraLinkState } from "../components/camera/cameraLibraryModel";
import {
  CAMERA_REFRESH_IN_PROGRESS,
  canStartCameraRefresh,
  friendlyConnectionError,
} from "../components/camera/cameraLibraryModel";
import type { RemoteFile } from "../packages/parsers/src/index";
import { CameraClient } from "../packages/protocol/src/index";

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
  readonly shareLocalFile: (file: LocalMediaFile) => Promise<void>;
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
  readonly mapPreference: MapPreference;
  readonly setMapPreference: (value: MapPreference) => void;
  readonly clearThumbCache: () => Promise<void>;
  /** Fetch camera SD thumbnail (GET /thumb…); cached on disk. Failures return undefined. */
  readonly resolveCameraThumbUri: (remotePath: string) => Promise<string | undefined>;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

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
  return new ExpoFsStreamingTransport({
    host,
    port: 80,
    timeoutMs,
    userAgent: APP_USER_AGENT,
    fs: FileSystem,
  });
}

function fetchTimeoutForBytes(sizeBytes: number): number {
  // Worst-case ~150 KiB/s on camera AP + headroom.
  const estimatedMs = Math.ceil((sizeBytes / (150 * 1024)) * 1000) + 60_000;
  return Math.min(Math.max(estimatedMs, 180_000), 600_000);
}

function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function isConnectionDropError(message: string | undefined): boolean {
  if (!message) return false;
  if (message === CAMERA_CONNECTION_LOST_MESSAGE) return true;
  const s = message.toLowerCase();
  return (
    s.includes("timeout") ||
    s.includes("timed out") ||
    s.includes("network") ||
    s.includes("econnrefused") ||
    s.includes("econnreset") ||
    s.includes("failed to fetch") ||
    s.includes("unreachable") ||
    s.includes("connection lost") ||
    s.includes("network request failed")
  );
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

  const clearRemoteCameraLibrary = useCallback(
    (nextState: "disconnected" | "connection_lost", error?: string) => {
      cameraSessionGenRef.current = bumpCameraSessionGeneration(cameraSessionGenRef.current);
      setFiles([]);
      setCameraLinkState(nextState);
      if (error !== undefined) setLastError(error);
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
  if (queueRef.current === null) {
    const store = isExpoGo
      ? new MemoryQueueStore()
      : new AsyncStorageQueueStore(AsyncStorage);
    const sink =
      FileSystem.documentDirectory !== null && FileSystem.documentDirectory !== undefined
        ? new ExpoFileSink(FileSystem)
        : new MemoryFileSink();
    queueRef.current = new DownloadQueue({
      store,
      transport: new DemoTransport(),
      sink,
      downloadDir,
      onChange: (items) => {
        setQueueItems(items);
        const justFinished = items.some(
          (item) => item.status === "completed" || item.status === "failed",
        );
        if (justFinished) void refreshLocalFiles();
      },
    });
  }
  const queue = queueRef.current;

  const setCameraHost = useCallback(
    (host: string) => {
      const trimmed = host.trim();
      setCameraHostState(trimmed);
      void AsyncStorage.setItem(HOST_KEY, trimmed);
      // IP change is local only — clear stale remote list; require explicit Reconnect/Refresh.
      clearRemoteCameraLibrary("disconnected");
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
    try {
      await FileSystem.deleteAsync(thumbDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(thumbDir, { intermediates: true });
    } catch {
      // ignore
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
            return { ok: false, error: "Camera session changed." };
          }
          setFiles(page.files);
          setCameraLinkState("connected");
          setCameraModel(COMPAT_MODEL);
          setLastConnectedAt(new Date().toISOString());
          setConnectionNote(undefined);
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
          return { ok: false, error: "Camera session changed." };
        }
        setCameraProperties(status.properties);
        setFiles(page.files);
        setCameraLinkState("connected");
        setCameraModel(COMPAT_MODEL);
        setLastConnectedAt(new Date().toISOString());
        setConnectionNote(undefined);
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Never keep Connected/Unstable or a stale list after timeout or network failure.
        clearRemoteCameraLibrary("disconnected", message);
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
    let cancelVerify: (() => void) | undefined;
    const onChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev === "active" || next !== "active") return;
      if (demoMode) return;
      if (!isPrivateIpv4(cameraHost)) return;
      // Do not assume Connected after background — clear stale list until a live probe succeeds.
      if (linkStateRef.current === "connected" || linkStateRef.current === "unstable") {
        clearRemoteCameraLibrary("disconnected");
      }
      if (refreshInflightRef.current) return;
      cancelVerify?.();
      cancelVerify = scheduleOneShotVerify(() => {
        void refreshFilesRef.current();
      }, APP_STATE_VERIFY_DEBOUNCE_MS);
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      cancelVerify?.();
      sub.remove();
    };
  }, [demoMode, cameraHost, clearRemoteCameraLibrary]);

  useEffect(() => {
    let sawDrop = false;
    let dropDetail: string | undefined;
    for (const item of queueItems) {
      const prev = queueStatusRef.current.get(item.id);
      // Only live transitions (queued/active/… → failed). Skip hydration of
      // already-failed rows so reconnect is not overwritten by stale queue state.
      if (
        item.status === "failed" &&
        prev !== undefined &&
        prev !== "failed" &&
        isConnectionDropError(item.errorMessage)
      ) {
        sawDrop = true;
        dropDetail = item.errorMessage;
      }
    }
    queueStatusRef.current = new Map(queueItems.map((item) => [item.id, item.status]));
    if (!sawDrop) return;

    cameraSessionGenRef.current = bumpCameraSessionGeneration(cameraSessionGenRef.current);
    setFiles([]);
    setCameraLinkState((prev) =>
      prev === "idle" || prev === "disconnected" ? prev : "connection_lost",
    );
    setLastError(dropDetail ?? CAMERA_CONNECTION_LOST_MESSAGE);
    const now = Date.now();
    if (now - disconnectAlertAtRef.current > 4_000) {
      disconnectAlertAtRef.current = now;
      notifyCameraDisconnected(dropDetail);
    }
    for (const item of queue.list()) {
      if (item.status === "queued") {
        void queue.pause(item.id);
      }
    }
  }, [queueItems, queue]);

  const disconnectSession = useCallback(() => {
    clearRemoteCameraLibrary("disconnected");
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
            return;
          }
          if (!nativeTcpReady && file.sizeBytes > FETCH_MAX_DOWNLOAD_BYTES) {
            setLastError(
              `${file.name} is ~${formatMiB(file.sizeBytes)}. Expo Go Fetch cannot download clips over ${formatMiB(FETCH_MAX_DOWNLOAD_BYTES)} (memory/timeout). Pick a smaller file, use Demo Mode, download via PC CLI, or wait for native Http10Tcp (Apple Developer).`,
            );
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
          const timeoutMs = nativeTcpReady ? 5_000 : fetchTimeoutForBytes(file.sizeBytes);
          queue.setTransport(createLiveTransport(cameraHost, timeoutMs));
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
        setLastError(error instanceof Error ? error.message : String(error));
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
          const timeoutMs = nativeTcpReady ? 5_000 : fetchTimeoutForBytes(item.expectedBytes);
          queue.setTransport(createLiveTransport(cameraHost, timeoutMs));
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

  const shareUri = useCallback(async (uri: string, name: string) => {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      setLastError("Local file missing. Download again.");
      return;
    }
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      setLastError("Sharing is not available on this device.");
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: mimeForName(name),
      UTI: utiForName(name),
      dialogTitle: `Save ${name}`,
    });
    setLastError(undefined);
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
    async (file: LocalMediaFile) => {
      try {
        await shareUri(file.uri, file.name);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
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
      await refreshLocalFiles();
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
      mapPreference,
      setMapPreference,
      clearThumbCache,
      resolveCameraThumbUri,
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
      mapPreference,
      setMapPreference,
      clearThumbCache,
      resolveCameraThumbUri,
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
