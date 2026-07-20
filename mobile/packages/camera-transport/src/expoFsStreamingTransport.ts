import { isPrivateIpv4 } from "./pathSafety";
import type { StreamingTransport, StreamDownloadOptions, StreamDownloadResult } from "./streaming";
import { FetchTransport } from "./fetchTransport";
import { TransportError, type TransportRequest, type TransportResponse } from "./types";

type DownloadProgressData = {
  readonly totalBytesWritten: number;
  readonly totalBytesExpectedToWrite: number;
};

type DownloadResumable = {
  downloadAsync(): Promise<{ uri: string; status?: number } | undefined>;
};

type ExpoFsLike = {
  createDownloadResumable(
    uri: string,
    fileUri: string,
    options?: { headers?: Record<string, string> },
    callback?: (data: DownloadProgressData) => void,
  ): DownloadResumable;
  getInfoAsync(path: string): Promise<{ exists: boolean; size?: number }>;
  moveAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(path: string, options?: { idempotent?: boolean }): Promise<void>;
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
    const url = `http://${this.options.host}:${this.port}${options.remotePath}`;

    try {
      if ((await this.options.fs.getInfoAsync(options.destinationPath)).exists) {
        throw new TransportError("Destination already exists", "EXISTS");
      }
      if ((await this.options.fs.getInfoAsync(partPath)).exists) {
        await this.options.fs.deleteAsync(partPath, { idempotent: true });
      }

      let lastEmit = 0;
      const download = this.options.fs.createDownloadResumable(
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
      );

      const result = await download.downloadAsync();
      if (result === undefined) {
        throw new TransportError("Download cancelled or failed", "DOWNLOAD");
      }

      const info = await this.options.fs.getInfoAsync(partPath);
      if (!info.exists) {
        throw new TransportError("Partial file missing after download", "DOWNLOAD");
      }
      const written = typeof info.size === "number" ? info.size : 0;
      if (options.expectedBytes !== undefined && written !== options.expectedBytes) {
        await this.options.fs.deleteAsync(partPath, { idempotent: true });
        throw new TransportError(
          `Size invalid: expected ${options.expectedBytes}, got ${written}`,
          "SIZE",
        );
      }

      await this.options.fs.moveAsync({ from: partPath, to: options.destinationPath });
      options.onProgress?.({ bytesReceived: written, totalBytes: written });
      return { bytesWritten: written, destinationPath: options.destinationPath };
    } catch (error) {
      try {
        await this.options.fs.deleteAsync(partPath, { idempotent: true });
      } catch {
        // ignore cleanup errors
      }
      if (error instanceof TransportError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new TransportError(`Expo download failed: ${message}`, "DOWNLOAD", { cause: error });
    }
  }
}
