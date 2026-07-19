import net from "node:net";
import type { Logger } from "../utils/logger.js";
import { retry } from "../utils/retry.js";
import {
  MUTATION_HTTP_ATTEMPTS,
  READONLY_HTTP_ATTEMPTS,
  TransportError,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from "./types.js";

export interface HttpTransportOptions {
  readonly host: string;
  readonly port?: number;
  readonly timeoutMs?: number;
  readonly maxBodyBytes?: number;
  /** Read-only retry count. Mutations always use MUTATION_HTTP_ATTEMPTS via request.retryPolicy. */
  readonly attempts?: number;
  readonly logger?: Logger;
}

interface ParsedHead {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly bodyOffset: number;
  readonly contentLength?: number;
}

export class HttpTransport implements Transport {
  private readonly port: number;
  private readonly timeoutMs: number;
  private readonly maxBodyBytes: number;
  private readonly attempts: number;

  constructor(private readonly options: HttpTransportOptions) {
    this.port = options.port ?? 80;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.maxBodyBytes = options.maxBodyBytes ?? 2 * 1024 * 1024;
    this.attempts = options.attempts ?? READONLY_HTTP_ATTEMPTS;
  }

  async request(request: TransportRequest): Promise<TransportResponse> {
    const attempts = request.retryPolicy === "mutation" ? MUTATION_HTTP_ATTEMPTS : this.attempts;
    return retry(
      async (attempt) => {
        this.options.logger?.debug(
          `${request.method} http://${this.options.host}:${this.port}${request.path} HTTP/1.0 (attempt ${attempt}/${attempts} policy=${request.retryPolicy ?? "readonly"})`,
        );
        return this.requestOnce(request);
      },
      {
        attempts,
        initialDelayMs: 150,
        maxDelayMs: 750,
        ...(request.signal === undefined ? {} : { signal: request.signal }),
        shouldRetry: (error) =>
          attempts > 1
          && error instanceof TransportError
          && error.causeCode !== "ABORT_ERR"
          && error.causeCode !== "MAX_BODY",
      },
    );
  }

  private async requestOnce(request: TransportRequest): Promise<TransportResponse> {
    validateRequest(request);
    request.signal?.throwIfAborted();

    return new Promise<TransportResponse>((resolve, reject) => {
      const socket = net.createConnection({ host: this.options.host, port: this.port });
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      let settled = false;
      let parsedHead: ParsedHead | undefined;

      const finish = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        request.signal?.removeEventListener("abort", abort);
        socket.removeAllListeners();
        socket.destroy();
        callback();
      };

      const fail = (error: unknown): void => {
        finish(() => reject(asTransportError(error)));
      };

      const complete = (): void => {
        try {
          const completeBuffer = Buffer.concat(chunks);
          parsedHead ??= parseHead(completeBuffer);
          const body = completeBuffer.subarray(parsedHead.bodyOffset);
          if (
            request.method !== "HEAD" &&
            parsedHead.contentLength !== undefined &&
            body.byteLength < parsedHead.contentLength
          ) {
            throw new TransportError(
              `Response ended early: expected ${parsedHead.contentLength} body bytes, received ${body.byteLength}`,
              "INCOMPLETE_RESPONSE",
            );
          }
          finish(() =>
            resolve({
              statusCode: parsedHead?.statusCode ?? 0,
              headers: parsedHead?.headers ?? {},
              body: request.method === "HEAD"
                ? new Uint8Array()
                : body.subarray(0, parsedHead?.contentLength ?? body.byteLength),
            }),
          );
        } catch (error) {
          fail(error);
        }
      };

      const maybeComplete = (): void => {
        const completeBuffer = Buffer.concat(chunks);
        parsedHead ??= tryParseHead(completeBuffer);
        if (parsedHead === undefined) return;
        const receivedBodyBytes = completeBuffer.byteLength - parsedHead.bodyOffset;
        if (request.method === "HEAD" || parsedHead.contentLength === 0) {
          complete();
        } else if (parsedHead.contentLength !== undefined && receivedBodyBytes >= parsedHead.contentLength) {
          complete();
        }
      };

      socket.setTimeout(this.timeoutMs, () => {
        fail(new TransportError(`Request timed out after ${this.timeoutMs} ms`, "ETIMEDOUT"));
      });

      socket.once("connect", () => {
        socket.write(buildRequest(request, this.options.host));
      });
      socket.on("data", (chunk: Buffer) => {
        totalBytes += chunk.byteLength;
        if (totalBytes > this.maxBodyBytes + 32 * 1024) {
          fail(new TransportError(`Response exceeded ${this.maxBodyBytes} bytes`, "MAX_BODY"));
          return;
        }
        chunks.push(chunk);
        maybeComplete();
      });
      socket.once("end", complete);
      socket.once("error", fail);

      const abort = (): void => fail(new TransportError("Request aborted", "ABORT_ERR"));
      request.signal?.addEventListener("abort", abort, { once: true });
    });
  }
}

function buildRequest(request: TransportRequest, host: string): string {
  const lines = [
    `${request.method} ${request.path} HTTP/1.0`,
    `Host: ${host}`,
    "User-Agent: MiVuePro-Research/1.0",
    "Connection: close",
  ];
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    lines.push(`${name}: ${value}`);
  }
  return `${lines.join("\r\n")}\r\n\r\n`;
}

function validateRequest(request: TransportRequest): void {
  if (!request.path.startsWith("/") || /[\r\n]/.test(request.path)) {
    throw new TransportError("Invalid HTTP path", "INVALID_REQUEST");
  }
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(value)) {
      throw new TransportError("Invalid HTTP header", "INVALID_REQUEST");
    }
  }
}

function tryParseHead(buffer: Buffer): ParsedHead | undefined {
  const bodyOffset = buffer.indexOf("\r\n\r\n");
  return bodyOffset < 0 ? undefined : parseHead(buffer);
}

function parseHead(buffer: Buffer): ParsedHead {
  const delimiter = buffer.indexOf("\r\n\r\n");
  if (delimiter < 0) {
    throw new TransportError("Invalid HTTP response: missing header terminator", "INVALID_RESPONSE");
  }
  const lines = buffer.subarray(0, delimiter).toString("latin1").split("\r\n");
  const statusMatch = lines[0]?.match(/^HTTP\/\d\.\d\s+(\d{3})\b/);
  if (statusMatch?.[1] === undefined) {
    throw new TransportError("Invalid HTTP status line", "INVALID_RESPONSE");
  }
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
    }
  }
  const contentLengthText = headers["content-length"];
  const contentLength = contentLengthText !== undefined && /^\d+$/.test(contentLengthText)
    ? Number.parseInt(contentLengthText, 10)
    : undefined;
  return {
    statusCode: Number.parseInt(statusMatch[1], 10),
    headers,
    bodyOffset: delimiter + 4,
    ...(contentLength === undefined ? {} : { contentLength }),
  };
}

function asTransportError(error: unknown): TransportError {
  if (error instanceof TransportError) return error;
  if (error instanceof Error) {
    const causeCode = "code" in error && typeof error.code === "string" ? error.code : undefined;
    return new TransportError(error.message, causeCode, { cause: error });
  }
  return new TransportError(String(error));
}
