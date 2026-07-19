import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { DEMO_FILES, DemoTransport } from "../packages/demo/src/index";
import { DownloadQueue, MemoryFileSink } from "../packages/download-queue/src/index";
import { MemoryQueueStore, type QueueItem } from "../packages/local-db/src/index";
import { CameraClient } from "../packages/protocol/src/index";
import type { RemoteFile } from "../packages/parsers/src/index";

interface DemoModeContextValue {
  readonly demoMode: boolean;
  readonly setDemoMode: (value: boolean) => void;
  readonly files: readonly RemoteFile[];
  readonly queueItems: readonly QueueItem[];
  readonly refreshFiles: () => Promise<void>;
  readonly enqueueDownload: (file: RemoteFile) => Promise<void>;
  readonly queuePosition: (id: string) => number | undefined;
  readonly lastError: string | undefined;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

export function DemoModeProvider({ children }: { readonly children: React.ReactNode }) {
  const [demoMode, setDemoModeState] = useState(true);
  const [files, setFiles] = useState<readonly RemoteFile[]>(DEMO_FILES);
  const [queueItems, setQueueItems] = useState<readonly QueueItem[]>([]);
  const [lastError, setLastError] = useState<string | undefined>();
  const [queue] = useState(() => {
    const store = new MemoryQueueStore();
    const sink = new MemoryFileSink();
    const transport = new DemoTransport();
    return new DownloadQueue({
      store,
      transport,
      sink,
      downloadDir: "/demo-downloads",
      onChange: setQueueItems,
    });
  });

  React.useEffect(() => {
    void queue.init();
  }, [queue]);

  const setDemoMode = useCallback((value: boolean) => {
    setDemoModeState(value);
    setLastError(undefined);
    if (value) {
      setFiles(DEMO_FILES);
    } else {
      setFiles([]);
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!demoMode) {
      setLastError("Live camera requires a development build + NativeTcpTransport (not in this foundation).");
      setFiles([]);
      return;
    }
    try {
      const client = new CameraClient(
        { host: "127.0.0.1", httpPort: 80, rtspPort: 554 },
        new DemoTransport(),
      );
      const page = await client.listFiles({ count: 32 });
      setFiles(page.files);
      setLastError(undefined);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  }, [demoMode]);

  const enqueueDownload = useCallback(
    async (file: RemoteFile) => {
      if (!demoMode) {
        setLastError("Downloads to a real camera need NativeTcpTransport after prebuild.");
        return;
      }
      try {
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
    [demoMode, queue],
  );

  const value = useMemo<DemoModeContextValue>(
    () => ({
      demoMode,
      setDemoMode,
      files,
      queueItems,
      refreshFiles,
      enqueueDownload,
      queuePosition: (id) => queue.queuePosition(id),
      lastError,
    }),
    [demoMode, setDemoMode, files, queueItems, refreshFiles, enqueueDownload, queue, lastError],
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
