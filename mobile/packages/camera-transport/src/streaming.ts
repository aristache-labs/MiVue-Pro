import type { Transport } from "./types";

export interface DownloadProgress {
  readonly bytesReceived: number;
  readonly totalBytes?: number;
}

export interface StreamDownloadOptions {
  readonly remotePath: string;
  readonly destinationPath: string;
  readonly expectedBytes?: number;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: DownloadProgress) => void;
}

export interface StreamDownloadResult {
  readonly bytesWritten: number;
  readonly destinationPath: string;
}

/** Optional capability: stream GET to a file without buffering the whole body in JS. */
export interface StreamingTransport extends Transport {
  downloadToFile(options: StreamDownloadOptions): Promise<StreamDownloadResult>;
}

export function isStreamingTransport(transport: Transport): transport is StreamingTransport {
  return typeof (transport as StreamingTransport).downloadToFile === "function";
}
