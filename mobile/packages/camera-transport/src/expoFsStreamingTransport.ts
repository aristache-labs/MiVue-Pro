import { isPrivateIpv4 } from "./pathSafety";
import type { StreamingTransport, StreamDownloadOptions, StreamDownloadResult } from "./streaming";
import { FetchTransport } from "./fetchTransport";
import { TransportError, type TransportRequest, type TransportResponse } from "./types";

type DownloadProgressData = {
  readonly totalBytesWritten: number;
  readonly totalBytesExpectedToWrite: number;
};

type DownloadPauseState = {
  readonly url: string;
  readonly fileUri: string;
  readonly options: { headers?: Record<string, string> };
  readonly resumeData?: string;
};

type DownloadResumable = {
  downloadAsync(): Promise<{ uri: string; status?: number } | undefined>;
  pauseAsync(): Promise<DownloadPauseState>;
  savable?(): DownloadPauseState;
};

type ExpoFsLike = {
  createDownloadResumable(
    uri: string,
    fileUri: string,
    options?: { headers?: Record<string, string> },
    callback?: (data: DownloadProgressData) => void,
    resumeData?: string,
  ): DownloadResumable;
  getInfoAsync(path: string): Promise<{ exists: boolean; size?: number }>;
  moveAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(path: string, options?: { idempotent?: boolean }): Promise<void>;
  writeAsStringAsync(path: string, contents: string): Promise<void>;
  readAsStringAsync(path: string): Promise<string>;
};

/**
 * CGI via Fetch; file GET via expo-file-system resumable download (progress callbacks).
 * Used in Expo Go instead of buffering the whole body in JS.
 */
export class ExpoFsStreamingTransport implements StreamingTransport {
  private readonly fetch: FetchTransport;
  private readonly port: number;
  private readonly userAgent: string;

  constructor(
    private readonly options: {
      readonly host: string;
      readonly port?: number;
      readonly timeoutMs?: number;
      readonly userAgent?: string;
      readonly fs: ExpoFsLike;
    },
  ) {
    if (!isPrivateIpv4(options.host)) {
      throw new TransportError("Host is not an allowed private IPv4 address", "SSRF");
    }
    this.port = options.port ?? 80;
    this.userAgent = options.userAgent ?? "Laneory/0.1";
    this.fetch = new FetchTransport({
      host: options.host,
      port: this.port,
      timeoutMs: options.timeoutMs ?? 30_000,
      userAgent: this.userAgent,
    });
  }

  request(request: TransportRequest): Promise<TransportResponse> {
    return this.fetch.request(request);
  }

  async downloadToFile(options: StreamDownloadOptions): Promise<StreamDownloadResult> {
    if (!options.remotePath.startsWith("/") || options.remotePath.includes("..") || /[\r\n]/.test(options.remotePath)) {
      throw new TransportError("Unsafe request path", "PATH");
    }

    const partPath = `${options.destinationPath}.part`;
    const resumePath = `${partPath}.resume`;
    const url = `http://${this.options.host}:${this.port}${options.remotePath}`;
    const fs = this.options.fs;

    if (options.signal?.aborted) {
      throw new TransportError("Cancelled by user", "ABORTED");
    }

    let abortedByUser = false;
    let pausePersist: Promise<void> | undefined;

    try {
      if ((await fs.getInfoAsync(options.destinationPath)).exists) {
        throw new TransportError("Destination already exists", "EXISTS");
      }

      let resumeData: string | undefined;
      const resumeInfo = await fs.getInfoAsync(resumePath);
      if (resumeInfo.exists) {
        try {
          const raw = await fs.readAsStringAsync(resumePath);
          const state = JSON.parse(raw) as DownloadPauseState;
          if (typeof state.resumeData === "string" && state.resumeData.length > 0) {
            resumeData = state.resumeData;
          }
        } catch {
          resumeData = undefined;
        }
      }

      const partInfo = await fs.getInfoAsync(partPath);
      if (!resumeData && partInfo.exists) {
        // Orphan partial without resume metadata — restart cleanly.
        await fs.deleteAsync(partPath, { idempotent: true });
        await fs.deleteAsync(resumePath, { idempotent: true });
      }

      if (resumeData && partInfo.exists && typeof partInfo.size === "number" && partInfo.size > 0) {
        options.onProgress?.({
          bytesReceived: partInfo.size,
          totalBytes: options.expectedBytes,
        });
      }

      let lastEmit = 0;
      const download = fs.createDownloadResumable(
        url,
        partPath,
        { headers: { "User-Agent": this.userAgent, Connection: "close" } },
        (progress) => {
          const now = Date.now();
          if (now - lastEmit < 200 && progress.totalBytesWritten > 0) return;
          lastEmit = now;
          options.onProgress?.({
            bytesReceived: progress.totalBytesWritten,
            totalBytes:
              progress.totalBytesExpectedToWrite > 0
                ? progress.totalBytesExpectedToWrite
                : options.expectedBytes,
          });
        },
        resumeData,
      );

      const onAbort = () => {
        abortedByUser = true;
        pausePersist = (async () => {
          try {
            const state = await download.pauseAsync();
            if (options.keepPartialOnAbort) {
              await fs.writeAsStringAsync(resumePath, JSON.stringify(state));
            } else {
              await fs.deleteAsync(partPath, { idempotent: true });
              await fs.deleteAsync(resumePath, { idempotent: true });
            }
          } catch {
            if (!options.keepPartialOnAbort) {
              try {
                await fs.deleteAsync(partPath, { idempotent: true });
                await fs.deleteAsync(resumePath, { idempotent: true });
              } catch {
                // ignore
              }
            }
          }
        })();
      };
      options.signal?.addEventListener("abort", onAbort);

      let result: { uri: string; status?: number } | undefined;
      try {
        result = await download.downloadAsync();
      } finally {
        options.signal?.removeEventListener("abort", onAbort);
        if (pausePersist) await pausePersist;
      }

      if (result === undefined) {
        throw new TransportError(
          abortedByUser ? "Cancelled by user" : "Download cancelled or failed",
          abortedByUser ? "ABORTED" : "DOWNLOAD",
        );
      }

      const info = await fs.getInfoAsync(partPath);
      if (!info.exists) {
        throw new TransportError("Partial file missing after download", "DOWNLOAD");
      }
      const written = typeof info.size === "number" ? info.size : 0;
      if (options.expectedBytes !== undefined && written !== options.expectedBytes) {
        await fs.deleteAsync(partPath, { idempotent: true });
        await fs.deleteAsync(resumePath, { idempotent: true });
        throw new TransportError(
          `Size invalid: expected ${options.expectedBytes}, got ${written}`,
          "SIZE",
        );
      }

      await fs.moveAsync({ from: partPath, to: options.destinationPath });
      await fs.deleteAsync(resumePath, { idempotent: true });
      options.onProgress?.({ bytesReceived: written, totalBytes: written });
      return { bytesWritten: written, destinationPath: options.destinationPath };
    } catch (error) {
      const isAbort =
        abortedByUser ||
        (error instanceof TransportError && error.causeCode === "ABORTED");

      if (!(isAbort && options.keepPartialOnAbort)) {
        try {
          await fs.deleteAsync(partPath, { idempotent: true });
          await fs.deleteAsync(resumePath, { idempotent: true });
        } catch {
          // ignore cleanup errors
        }
      }

      if (isAbort) {
        throw new TransportError("Cancelled by user", "ABORTED", { cause: error });
      }
      if (error instanceof TransportError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new TransportError(`Expo download failed: ${message}`, "DOWNLOAD", { cause: error });
    }
  }
}
