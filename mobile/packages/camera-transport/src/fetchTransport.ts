import { isPrivateIpv4 } from "./pathSafety";
import { TransportError, type Transport, type TransportRequest, type TransportResponse } from "./types";

/**
 * HTTP via fetch — convenient for demos/unit tests.
 * Documented as insufficient for production camera HTTP/1.0 on the tested firmware;
 * use NativeTcpTransport after prebuild/dev build.
 */
export class FetchTransport implements Transport {
  constructor(
    private readonly options: {
      readonly host: string;
      readonly port?: number;
      readonly timeoutMs?: number;
      readonly userAgent?: string;
    },
  ) {
    if (!isPrivateIpv4(options.host)) {
      throw new TransportError("Host is not an allowed private IPv4 address", "SSRF");
    }
  }

  async request(request: TransportRequest): Promise<TransportResponse> {
    if (!request.path.startsWith("/") || request.path.includes("://") || request.path.includes("..")) {
      throw new TransportError("Unsafe request path", "PATH");
    }

    const port = this.options.port ?? 80;
    const url = `http://${this.options.host}:${port}${request.path}`;
    const timeoutMs = this.options.timeoutMs ?? 5_000;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await fetch(url, {
        method: request.method,
        headers: {
          "User-Agent": this.options.userAgent ?? "Laneory/0.1",
          Connection: "close",
          ...request.headers,
        },
        signal: controller.signal,
      });
      const body = new Uint8Array(await response.arrayBuffer());
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      return { statusCode: response.status, headers, body };
    } catch (error) {
      if (timedOut || isAbortError(error)) {
        throw new TransportError(
          timedOut
            ? `FetchTransport timed out after ${timeoutMs}ms — slow camera Wi‑Fi, HTTP/1.0 mismatch, or file too large for Expo Go Fetch. Use a smaller clip, Demo Mode, PC CLI, or native Http10Tcp.`
            : "FetchTransport aborted before completion.",
          timedOut ? "ETIMEDOUT" : "FETCH",
          { cause: error },
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new TransportError(`FetchTransport failed: ${message}`, "FETCH", { cause: error });
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
    }
  }
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();
  return name === "aborterror" || message.includes("aborted") || message.includes("abort");
}
