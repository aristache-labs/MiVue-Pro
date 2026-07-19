import { constants as fsConstants, createWriteStream } from "node:fs";
import { access, rename } from "node:fs/promises";
import net from "node:net";
import { performance } from "node:perf_hooks";
import { TransportError } from "./types.js";

export interface DownloadProgress {
  readonly bytesReceived: number;
  readonly totalBytes?: number;
  readonly elapsedMs: number;
  readonly bytesPerSecond: number;
}

export interface DownloadOptions {
  readonly host: string;
  readonly port?: number;
  readonly remotePath: string;
  readonly destinationPath: string;
  readonly expectedBytes?: number;
  readonly inactivityTimeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadResult {
  readonly destinationPath: string;
  readonly bytesWritten: number;
  readonly elapsedMs: number;
  readonly bytesPerSecond: number;
  readonly headers: Readonly<Record<string, string>>;
}

export class DownloadError extends Error {
  constructor(
    message: string,
    readonly partialPath: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DownloadError";
  }
}

interface ResponseHead {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly bodyOffset: number;
  readonly contentLength?: number;
}

export async function downloadToFile(options: DownloadOptions): Promise<DownloadResult> {
  validateOptions(options);
  const partialPath = `${options.destinationPath}.part`;
  await assertMissing(options.destinationPath, "Fișierul destinație există deja");
  await assertMissing(partialPath, "Există deja un transfer parțial");

  const started = performance.now();
  const transfer = await new Promise<Omit<DownloadResult, "destinationPath">>((resolve, reject) => {
    const writer = createWriteStream(partialPath, { flags: "wx" });
    const socket = net.createConnection({ host: options.host, port: options.port ?? 80 });
    let headerBuffer = Buffer.alloc(0);
    let responseHead: ResponseHead | undefined;
    let bytesWritten = 0;
    let settled = false;
    let responseEnded = false;

    const cleanup = (): void => {
      options.signal?.removeEventListener("abort", abort);
      socket.removeAllListeners();
      writer.removeAllListeners();
      socket.destroy();
    };

    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      writer.destroy();
      const cause = error instanceof Error ? error : new Error(String(error));
      reject(new DownloadError(cause.message, partialPath, { cause }));
    };

    const finish = (): void => {
      if (settled || responseHead === undefined) return;
      const expected = options.expectedBytes ?? responseHead.contentLength;
      if (expected !== undefined && bytesWritten !== expected) {
        fail(new Error(`Dimensiune invalidă: așteptat ${expected}, primit ${bytesWritten}`));
        return;
      }
      settled = true;
      const elapsedMs = performance.now() - started;
      cleanup();
      resolve({
        bytesWritten,
        elapsedMs,
        bytesPerSecond: elapsedMs <= 0 ? 0 : bytesWritten / (elapsedMs / 1_000),
        headers: responseHead.headers,
      });
    };

    const writeBody = (chunk: Buffer): void => {
      if (chunk.byteLength === 0 || settled) return;
      const expected = options.expectedBytes ?? responseHead?.contentLength;
      if (expected !== undefined && bytesWritten + chunk.byteLength > expected) {
        fail(new Error(`Serverul a trimis mai multe date decât dimensiunea declarată (${expected})`));
        return;
      }
      bytesWritten += chunk.byteLength;
      const elapsedMs = performance.now() - started;
      options.onProgress?.({
        bytesReceived: bytesWritten,
        ...(expected === undefined ? {} : { totalBytes: expected }),
        elapsedMs,
        bytesPerSecond: elapsedMs <= 0 ? 0 : bytesWritten / (elapsedMs / 1_000),
      });
      if (!writer.write(chunk)) {
        socket.pause();
        writer.once("drain", () => socket.resume());
      }
    };

    const handleData = (chunk: Buffer): void => {
      if (responseHead !== undefined) {
        writeBody(chunk);
        return;
      }

      headerBuffer = Buffer.concat([headerBuffer, chunk]);
      const delimiter = headerBuffer.indexOf("\r\n\r\n");
      if (delimiter < 0) {
        if (headerBuffer.byteLength > 32 * 1024) fail(new Error("Headerul HTTP depășește 32 KiB"));
        return;
      }

      try {
        responseHead = parseResponseHead(headerBuffer, delimiter);
        if (responseHead.statusCode !== 200) {
          throw new Error(`Camera a răspuns HTTP ${responseHead.statusCode}`);
        }
        if (
          options.expectedBytes !== undefined &&
          responseHead.contentLength !== undefined &&
          options.expectedBytes !== responseHead.contentLength
        ) {
          throw new Error(
            `Content-Length s-a schimbat: HEAD=${options.expectedBytes}, GET=${responseHead.contentLength}`,
          );
        }
        const body = headerBuffer.subarray(responseHead.bodyOffset);
        headerBuffer = Buffer.alloc(0);
        writeBody(body);
      } catch (error) {
        fail(error);
      }
    };

    socket.setTimeout(options.inactivityTimeoutMs ?? 15_000, () => {
      fail(new TransportError("Transferul nu a primit date în intervalul configurat", "ETIMEDOUT"));
    });
    socket.once("connect", () => {
      socket.write(buildGetRequest(options.remotePath, options.host));
    });
    socket.on("data", handleData);
    socket.once("end", () => {
      responseEnded = true;
      if (responseHead === undefined) {
        fail(new Error("Camera a închis conexiunea înainte de răspunsul HTTP"));
        return;
      }
      writer.end();
    });
    socket.once("error", fail);
    writer.once("error", fail);
    writer.once("finish", () => {
      if (responseEnded) finish();
    });

    const abort = (): void => {
      const reason = options.signal?.reason;
      fail(reason instanceof Error ? reason : new Error("Transfer anulat"));
    };
    options.signal?.addEventListener("abort", abort, { once: true });
  });

  try {
    await rename(partialPath, options.destinationPath);
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new DownloadError(`Transfer complet, dar redenumirea a eșuat: ${cause.message}`, partialPath, { cause });
  }
  return { destinationPath: options.destinationPath, ...transfer };
}

function parseResponseHead(buffer: Buffer, delimiter: number): ResponseHead {
  const lines = buffer.subarray(0, delimiter).toString("latin1").split("\r\n");
  const match = lines[0]?.match(/^HTTP\/\d\.\d\s+(\d{3})\b/);
  if (match?.[1] === undefined) throw new Error("Linie de status HTTP invalidă");
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator > 0) headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  const lengthText = headers["content-length"];
  const contentLength = lengthText !== undefined && /^\d+$/.test(lengthText)
    ? Number.parseInt(lengthText, 10)
    : undefined;
  return {
    statusCode: Number.parseInt(match[1], 10),
    headers,
    bodyOffset: delimiter + 4,
    ...(contentLength === undefined ? {} : { contentLength }),
  };
}

function buildGetRequest(remotePath: string, host: string): string {
  return [
    `GET ${remotePath} HTTP/1.0`,
    `Host: ${host}`,
    "User-Agent: MiVuePro-Research/1.0",
    "Connection: close",
    "",
    "",
  ].join("\r\n");
}

function validateOptions(options: DownloadOptions): void {
  if (!options.remotePath.startsWith("/SD/") || options.remotePath.includes("..") || /[\r\n]/.test(options.remotePath)) {
    throw new DownloadError("Cale remote invalidă", `${options.destinationPath}.part`);
  }
  if (options.expectedBytes !== undefined && (!Number.isSafeInteger(options.expectedBytes) || options.expectedBytes < 0)) {
    throw new DownloadError("Dimensiune așteptată invalidă", `${options.destinationPath}.part`);
  }
}

async function assertMissing(path: string, message: string): Promise<void> {
  try {
    await access(path, fsConstants.F_OK);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return;
    throw error;
  }
  throw new DownloadError(message, path);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
