import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { APP_USER_AGENT } from "../constants/Brand";
import {
  FetchTransport,
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

interface DemoModeContextValue {
  readonly demoMode: boolean;
  readonly setDemoMode: (value: boolean) => void;
  readonly cameraHost: string;
  readonly setCameraHost: (host: string) => void;
  readonly files: readonly RemoteFile[];
  readonly queueItems: readonly QueueItem[];
  readonly refreshFiles: () => Promise<void>;
  readonly enqueueDownload: (file: RemoteFile) => Promise<void>;
  readonly queuePosition: (id: string) => number | undefined;
  readonly lastError: string | undefined;
  readonly connectionNote: string | undefined;
  readonly nativeTcpReady: boolean;
  readonly isExpoGo: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

function createLiveTransport(host: string): Transport {
  if (isNativeTcpAvailable()) {
    return new NativeTcpTransport({ host, port: 80, timeoutMs: 5_000, userAgent: APP_USER_AGENT });
  }
  // Expo Go: buffer whole file in JS — OK for short clips; prefer native streaming later.
  return new FetchTransport({ host, port: 80, timeoutMs: 120_000, userAgent: APP_USER_AGENT });
}

export function DemoModeProvider({ children }: { readonly children: React.ReactNode }) {
  const isExpoGo = Constants.appOwnership === "expo";
  const nativeTcpReady = isNativeTcpAvailable();

  const [demoMode, setDemoModeState] = useState(true);
  const [cameraHost, setCameraHostState] = useState(DEFAULT_HOST);
  const [files, setFiles] = useState<readonly RemoteFile[]>(DEMO_FILES);
  const [queueItems, setQueueItems] = useState<readonly QueueItem[]>([]);
  const [lastError, setLastError] = useState<string | undefined>();
  const [connectionNote, setConnectionNote] = useState<string | undefined>();

  const downloadDir =
    FileSystem.documentDirectory !== null && FileSystem.documentDirectory !== undefined
      ? `${FileSystem.documentDirectory}downloads`
      : "/demo-downloads";

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
      onChange: setQueueItems,
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
    })();
  }, [queue, downloadDir]);

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
        const page = await client.listFiles({ count: 32 });
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
      const page = await client.listFiles({ count: 32 });
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
          queue.setTransport(createLiveTransport(cameraHost));
          if (!nativeTcpReady) {
            setConnectionNote(
              "Expo Go Fetch download (buffered). Large clips may be slow or fail; native streaming is more reliable.",
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

  const value = useMemo<DemoModeContextValue>(
    () => ({
      demoMode,
      setDemoMode,
      cameraHost,
      setCameraHost,
      files,
      queueItems,
      refreshFiles,
      enqueueDownload,
      queuePosition: (id) => queue.queuePosition(id),
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
      refreshFiles,
      enqueueDownload,
      queue,
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
