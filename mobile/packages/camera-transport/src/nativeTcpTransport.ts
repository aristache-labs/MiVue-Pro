import { isPrivateIpv4 } from "./pathSafety";
import type { StreamingTransport, StreamDownloadOptions, StreamDownloadResult } from "./streaming";
import { TransportError, type NativeTcpTransportOptions, type TransportRequest, type TransportResponse } from "./types";

type NativeHttp10 = {
  request(options: {
    host: string;
    port: number;
    method: string;
    path: string;
    timeoutMs: number;
    maxBodyBytes: number;
    userAgent: string;
  }): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    bodyBase64: string;
  }>;
  downloadToFile(options: {
    host: string;
    port: number;
    path: string;
    destinationPath: string;
    expectedBytes?: number;
    timeoutMs: number;
    userAgent: string;
  }): Promise<{ bytesWritten: number }>;
};

function getAppOwnership(): string | null {
  try {
    // Lazy: must not load react-native during Node unit tests
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants").default as { appOwnership?: string | null };
    return Constants.appOwnership ?? null;
  } catch {
    return null;
  }
}

function loadNativeModule(): NativeHttp10 | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo-modules-core") as {
      requireNativeModule: (name: string) => NativeHttp10;
    };
    return requireNativeModule("Http10Tcp");
  } catch {
    return null;
  }
}

export function isNativeTcpAvailable(): boolean {
  if (getAppOwnership() === "expo") return false;
  return loadNativeModule() !== null;
}

export class NativeTcpTransport implements StreamingTransport {
  private readonly native: NativeHttp10;
  private readonly port: number;
  private readonly timeoutMs: number;
  private readonly maxBodyBytes: number;
  private readonly userAgent: string;

  constructor(private readonly options: NativeTcpTransportOptions) {
    if (!isPrivateIpv4(options.host)) {
      throw new TransportError("Host is not an allowed private IPv4 address", "SSRF");
    }
    const native = loadNativeModule();
    if (native === null) {
      throw new TransportError(
        "Http10Tcp native module unavailable. Use a development build (not Expo Go).",
        "NOT_AVAILABLE",
      );
    }
    this.native = native;
    this.port = options.port ?? 80;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.maxBodyBytes = options.maxBodyBytes ?? 2 * 1024 * 1024;
    this.userAgent = options.userAgent ?? "Laneory/0.1";
  }

  async request(request: TransportRequest): Promise<TransportResponse> {
    if (!request.path.startsWith("/") || request.path.includes("..") || /[\r\n]/.test(request.path)) {
      throw new TransportError("Unsafe request path", "PATH");
    }
    try {
      const result = await this.native.request({
        host: this.options.host,
        port: this.port,
        method: request.method,
        path: request.path,
        timeoutMs: this.timeoutMs,
        maxBodyBytes: this.maxBodyBytes,
        userAgent: this.userAgent,
      });
      return {
        statusCode: result.statusCode,
        headers: normalizeHeaders(result.headers),
        body: base64ToUint8Array(result.bodyBase64),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TransportError(`NativeTcpTransport failed: ${message}`, "NATIVE", { cause: error });
    }
  }

  async downloadToFile(options: StreamDownloadOptions): Promise<StreamDownloadResult> {
    if (!options.remotePath.startsWith("/SD/") || options.remotePath.includes("..")) {
      throw new TransportError("Unsafe remote path", "PATH");
    }
    try {
      const result = await this.native.downloadToFile({
        host: this.options.host,
        port: this.port,
        path: options.remotePath,
        destinationPath: options.destinationPath,
        ...(options.expectedBytes === undefined ? {} : { expectedBytes: options.expectedBytes }),
        timeoutMs: Math.max(this.timeoutMs, 60_000),
        userAgent: this.userAgent,
      });
      options.onProgress?.({
        bytesReceived: result.bytesWritten,
        ...(options.expectedBytes === undefined ? {} : { totalBytes: options.expectedBytes }),
      });
      return { bytesWritten: result.bytesWritten, destinationPath: options.destinationPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TransportError(`Native download failed: ${message}`, "NATIVE_DOWNLOAD", { cause: error });
    }
  }
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function base64ToUint8Array(value: string): Uint8Array {
  if (value === "") return new Uint8Array();
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const BufferCtor = (globalThis as { Buffer?: { from(data: string, enc: string): Uint8Array } }).Buffer;
  if (BufferCtor) return Uint8Array.from(BufferCtor.from(value, "base64"));
  throw new Error("No base64 decoder available");
}
