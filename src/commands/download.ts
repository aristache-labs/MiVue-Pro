import { mkdir } from "node:fs/promises";
import { join, posix, resolve } from "node:path";
import { discoverCamera } from "../discovery/discoverCamera.js";
import { DownloadError, downloadToFile } from "../transport/downloadTransport.js";
import { formatBytes, ProgressReporter } from "../utils/progress.js";
import type { CommandContext } from "./context.js";
import { createClient, endpointForHost } from "./shared.js";

export interface DownloadCommandOptions {
  readonly remotePath: string;
  readonly outputDirectory: string;
}

export async function runDownload(context: CommandContext, options: DownloadCommandOptions): Promise<void> {
  const endpoint = context.host === undefined
    ? (await discoverCamera({ timeoutMs: context.timeoutMs, logger: context.logger }))?.endpoint
    : endpointForHost(context.host);
  if (endpoint === undefined) throw new Error("Camera MiVue nu a fost găsită.");

  const client = createClient(endpoint, context);
  const head = await client.headFile(options.remotePath);
  if (head.statusCode !== 200) throw new Error(`Fișierul remote a răspuns HTTP ${head.statusCode}`);
  const expectedBytes = parseContentLength(head.headers["content-length"]);

  const filename = safeFilename(options.remotePath);
  const outputDirectory = resolve(options.outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  const destinationPath = join(outputDirectory, filename);
  const controller = new AbortController();
  const progress = new ProgressReporter();
  const abort = (): void => controller.abort(new Error("Transfer anulat de utilizator"));
  process.once("SIGINT", abort);

  context.logger.info(`Descarc ${options.remotePath}`);
  context.logger.info(`Destinație: ${destinationPath}`);
  if (expectedBytes !== undefined) context.logger.info(`Dimensiune: ${formatBytes(expectedBytes)}`);

  try {
    const result = await downloadToFile({
      host: endpoint.host,
      port: endpoint.httpPort,
      remotePath: options.remotePath,
      destinationPath,
      ...(expectedBytes === undefined ? {} : { expectedBytes }),
      inactivityTimeoutMs: Math.max(context.timeoutMs, 15_000),
      signal: controller.signal,
      onProgress: (update) => progress.update(update),
    });
    progress.finish();
    context.logger.info(`Download finalizat: ${result.destinationPath}`);
    context.logger.info(
      `Transferat ${formatBytes(result.bytesWritten)} în ${(result.elapsedMs / 1_000).toFixed(1)}s (${formatBytes(result.bytesPerSecond)}/s)`,
    );
  } catch (error) {
    progress.finish();
    if (error instanceof DownloadError) {
      throw new Error(`${error.message}. Transferul parțial, dacă există, este la: ${error.partialPath}`, { cause: error });
    }
    throw error;
  } finally {
    process.removeListener("SIGINT", abort);
  }
}

function parseContentLength(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new Error(`Content-Length invalid: ${value}`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed)) throw new Error("Content-Length depășește limita numerică sigură");
  return parsed;
}

function safeFilename(remotePath: string): string {
  if (!remotePath.startsWith("/SD/") || remotePath.includes("..") || /[\r\n]/.test(remotePath)) {
    throw new Error("Cale remote invalidă");
  }
  const filename = posix.basename(remotePath);
  if (filename === "" || filename === "." || filename === ".." || /[<>:"/\\|?*\u0000-\u001F]/.test(filename)) {
    throw new Error("Nume de fișier remote nesigur");
  }
  return filename;
}
