import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { APP_USER_AGENT } from "../constants/Brand";
import {
  ExpoFsStreamingTransport,
  NativeTcpTransport,
  isNativeTcpAvailable,
  isPrivateIpv4,
  type Transport,
} from "../packages/camera-transport/src/index";
import { DEMO_FILES, DemoTransport } from "../packages/demo/src/index";
import { DownloadQueue, ExpoFileSink, MemoryFileSink } from "../packages/download-queue/src/index";
import { AsyncStorageQueueStore, MemoryQueueStore, type QueueItem } from "../packages/local-db/src/index";
import type { RemoteFile } from "../packages/parsers/src/index";
import { CameraClient } from "../packages/protocol/src/index";

const DEFAULT_HOST = "192.72.1.1";
const HOST_KEY = "@laneory/camera_host_v1";
/**
 * Soft cap for Expo Go live downloads (FileSystem streaming to disk).
 * Very large clips can still fail on slow camera Wi‑Fi; progress is visible in Queue.
 */
const FETCH_MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;

export interface LocalMediaFile {
  readonly name: string;
  readonly uri: string;
  readonly sizeBytes: number;
  readonly kind: "video" | "image" | "other";
}

interface DemoModeContextValue {
  readonly demoMode: boolean;
  readonly setDemoMode: (value: boolean) => void;
  readonly cameraHost: string;
  readonly setCameraHost: (host: string) => void;
  readonly files: readonly RemoteFile[];
  readonly queueItems: readonly QueueItem[];
  readonly localFiles: readonly LocalMediaFile[];
  readonly refreshFiles: () => Promise<void>;
  readonly refreshLocalFiles: () => Promise<void>;
  readonly enqueueDownload: (file: RemoteFile) => Promise<void>;
  readonly cancelDownload: (id: string) => Promise<void>;
  readonly removeFromQueue: (id: string) => Promise<void>;
  readonly shareCompleted: (item: QueueItem) => Promise<void>;
  readonly shareLocalFile: (file: LocalMediaFile) => Promise<void>;
  readonly deleteLocalFile: (file: LocalMediaFile) => Promise<void>;
  readonly queuePosition: (id: string) => number | undefined;
  readonly downloadDir: string;
  readonly lastError: string | undefined;
  readonly connectionNote: string | undefined;
  readonly nativeTcpReady: boolean;
  readonly isExpoGo: boolean;
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

export function DemoModeProvider({ children }: { readonly children: React.ReactNode }) {
  const isExpoGo = Constants.appOwnership === "expo";
  const nativeTcpReady = isNativeTcpAvailable();

  const [demoMode, setDemoModeState] = useState(true);
  const [cameraHost, setCameraHostState] = useState(DEFAULT_HOST);
  const [files, setFiles] = useState<readonly RemoteFile[]>(DEMO_FILES);
  const [queueItems, setQueueItems] = useState<readonly QueueItem[]>([]);
  const [localFiles, setLocalFiles] = useState<readonly LocalMediaFile[]>([]);
  const [lastError, setLastError] = useState<string | undefined>();
  const [connectionNote, setConnectionNote] = useState<string | undefined>();

  const downloadDir =
    FileSystem.documentDirectory !== null && FileSystem.documentDirectory !== undefined
      ? `${FileSystem.documentDirectory}downloads`
      : "/demo-downloads";

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
        const uri = downloadDir.endsWith("/") ? `${downloadDir}${name}` : `${downloadDir}/${name}`;
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || info.isDirectory) continue;
        media.push({
          name,
          uri,
          sizeBytes: "size" in info && typeof info.size === "number" ? info.size : 0,
          kind: kindForName(name),
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

  React.useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(HOST_KEY);
      if (saved && isPrivateIpv4(saved)) setCameraHostState(saved);
      await queue.init();
      try {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      } catch {
        // directory may already exist
      }
      await refreshLocalFiles();
    })();
  }, [queue, downloadDir, refreshLocalFiles]);

  const setCameraHost = useCallback((host: string) => {
    const trimmed = host.trim();
    setCameraHostState(trimmed);
    void AsyncStorage.setItem(HOST_KEY, trimmed);
  }, []);

  const setDemoMode = useCallback((value: boolean) => {
    setDemoModeState(value);
    setLastError(undefined);
    setConnectionNote(undefined);
    if (value) {
      queue.setTransport(new DemoTransport());
      setFiles(DEMO_FILES);
    } else {
      setFiles([]);
      if (isExpoGo) {
        setConnectionNote(
          "Expo Go: Demo Mode works fully. Live uses Fetch probe only (HTTP/1.0 cameras may fail).",
        );
      } else if (!nativeTcpReady) {
        setConnectionNote("Native Http10Tcp module missing. Rebuild the development client.");
      } else {
        setConnectionNote("Live mode: HTTP/1.0 TCP via native module.");
      }
    }
  }, [queue, isExpoGo, nativeTcpReady]);

  const refreshFiles = useCallback(async () => {
    try {
      if (demoMode) {
        const client = new CameraClient(
          { host: "127.0.0.1", httpPort: 80, rtspPort: 554 },
          new DemoTransport(),
        );
        const page = await client.listAllFiles({ pageSize: 32, maxFiles: 200 });
        setFiles(page.files);
        setLastError(undefined);
        return;
      }

      if (!isPrivateIpv4(cameraHost)) {
        setLastError("Host must be a private IPv4 address (e.g. 192.72.1.1).");
        setFiles([]);
        return;
      }

      const transport = createLiveTransport(cameraHost);
      queue.setTransport(transport);
      const client = new CameraClient(
        { host: cameraHost, httpPort: 80, rtspPort: 554 },
        transport,
      );
      await client.getStatus();
      const page = await client.listAllFiles({ pageSize: 32, maxFiles: 500 });
      setFiles(page.files);
      setLastError(undefined);
      setConnectionNote(
        nativeTcpReady
          ? `Connected via native HTTP/1.0 to ${cameraHost}`
          : `Fetch probe OK on ${cameraHost} (not native HTTP/1.0)`,
      );
    } catch (error) {
      setFiles([]);
      setLastError(error instanceof Error ? error.message : String(error));
    }
  }, [demoMode, cameraHost, queue, nativeTcpReady]);

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
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [demoMode, cameraHost, queue, nativeTcpReady],
  );

  const cancelDownload = useCallback(
    async (id: string) => {
      try {
        await queue.cancel(id);
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [queue],
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
        await refreshLocalFiles();
        setLastError(undefined);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [refreshLocalFiles],
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
      refreshLocalFiles,
      enqueueDownload,
      cancelDownload,
      removeFromQueue,
      shareCompleted,
      shareLocalFile,
      deleteLocalFile,
      queuePosition: (id) => queue.queuePosition(id),
      downloadDir,
      lastError,
      connectionNote,
      nativeTcpReady,
      isExpoGo,
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
      refreshLocalFiles,
      enqueueDownload,
      cancelDownload,
      removeFromQueue,
      shareCompleted,
      shareLocalFile,
      deleteLocalFile,
      queue,
      downloadDir,
      lastError,
      connectionNote,
      nativeTcpReady,
      isExpoGo,
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
