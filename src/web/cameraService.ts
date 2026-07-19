import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join, posix } from "node:path";
import { spawn } from "node:child_process";
import { MiVueClient } from "../protocol/mivueClient.js";
import { parseNmeaTelemetry, telemetryToGpx, type GpsSample } from "../protocol/nmea.js";
import type { CameraEndpoint, FileCategory, RemoteFile } from "../protocol/types.js";
import { downloadToFile } from "../transport/downloadTransport.js";
import { HttpTransport } from "../transport/httpTransport.js";
import type { Logger } from "../utils/logger.js";
import { assertRemoteMediaPath, assertRemoteThumbnailPath, safeLocalFile } from "./pathSafety.js";

type ConcreteCategory = Exclude<FileCategory, "unknown">;

export interface DashboardFile extends RemoteFile {
  readonly locallyAvailable: boolean;
  readonly localName?: string;
  readonly localTelemetryName?: string;
}

export interface PreparedMedia {
  readonly originalName: string;
  readonly playableName: string;
  readonly nmeaName?: string;
  readonly gpxName?: string;
  readonly warning?: string;
}

export interface PrepareProgress {
  readonly stage: "starting" | "video" | "telemetry" | "audio" | "gpx" | "complete";
  readonly percent: number;
  readonly message: string;
  readonly bytesReceived?: number;
  readonly totalBytes?: number;
}

export type PrepareProgressCallback = (progress: PrepareProgress) => void;

export class CameraService {
  private readonly client: MiVueClient;
  private readonly thumbnailTransport: HttpTransport;
  private thumbnailQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly endpoint: CameraEndpoint,
    readonly downloadsDirectory: string,
    private readonly logger: Logger,
    timeoutMs = 5_000,
  ) {
    this.client = new MiVueClient(endpoint, new HttpTransport({
      host: endpoint.host,
      port: endpoint.httpPort,
      timeoutMs,
      attempts: 2,
      logger,
    }));
    this.thumbnailTransport = new HttpTransport({
      host: endpoint.host,
      port: endpoint.httpPort,
      timeoutMs,
      attempts: 2,
      maxBodyBytes: 512 * 1024,
      logger,
    });
  }

  async info(): Promise<unknown> {
    return this.client.getInfo();
  }

  async list(category?: ConcreteCategory): Promise<readonly DashboardFile[]> {
    const result = await this.client.listAllFiles({
      pageSize: 64,
      ...(category === undefined ? {} : { categories: [category] }),
    });
    const localNames = new Map<string, string>();
    try {
      for (const entry of await readdir(this.downloadsDirectory, { withFileTypes: true })) {
        if (entry.isFile()) localNames.set(entry.name.toLowerCase(), entry.name);
      }
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") throw error;
    }
    return result.files.map((file) => {
      const originalName = posix.basename(file.path);
      const aacName = originalName.replace(/\.[^.]+$/u, "-AAC.MP4");
      const localName = localNames.get(aacName.toLowerCase()) ?? localNames.get(originalName.toLowerCase());
      const telemetryName = originalName.replace(/\.[^.]+$/u, ".NMEA");
      const localTelemetryName = localNames.get(telemetryName.toLowerCase());
      return {
        ...file,
        locallyAvailable: localName !== undefined,
        ...(localName === undefined ? {} : { localName }),
        ...(localTelemetryName === undefined ? {} : { localTelemetryName }),
      };
    });
  }

  async thumbnail(remotePath: string): Promise<Uint8Array> {
    assertRemoteThumbnailPath(remotePath);
    await mkdir(this.downloadsDirectory, { recursive: true });
    const cacheName = `thumb-${createHash("sha256").update(remotePath).digest("hex").slice(0, 20)}.jpg`;
    const cachePath = safeLocalFile(this.downloadsDirectory, cacheName);
    if (await exists(cachePath)) return readFile(cachePath);

    const task = this.thumbnailQueue.then(async () => {
      if (await exists(cachePath)) return readFile(cachePath);
      const thumbnailPath = `/thumb${remotePath.replace(/^\/SD/u, "")}`;
      const response = await this.thumbnailTransport.request({ method: "GET", path: thumbnailPath });
      if (response.statusCode !== 200) throw new Error(`Miniatura nu este disponibilă (HTTP ${response.statusCode})`);
      if (response.body.byteLength < 4 || response.body[0] !== 0xff || response.body[1] !== 0xd8) {
        throw new Error("Camera nu a returnat o imagine JPEG validă");
      }
      try {
        await writeFile(cachePath, response.body, { flag: "wx" });
      } catch (error) {
        if (!isNodeError(error) || error.code !== "EEXIST") throw error;
      }
      return response.body;
    });
    this.thumbnailQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  async prepare(remotePath: string, onProgress?: PrepareProgressCallback): Promise<PreparedMedia> {
    assertRemoteMediaPath(remotePath);
    report(onProgress, { stage: "starting", percent: 1, message: "Se verifică fișierul…" });
    await mkdir(this.downloadsDirectory, { recursive: true });
    const originalName = posix.basename(remotePath);
    const originalPath = safeLocalFile(this.downloadsDirectory, originalName);
    await this.ensureDownloaded(remotePath, originalPath, (received, total) => {
      const ratio = total === undefined || total === 0 ? 0 : received / total;
      report(onProgress, {
        stage: "video", percent: Math.min(65, 3 + Math.round(ratio * 62)),
        message: "Se descarcă videoclipul…", bytesReceived: received,
        ...(total === undefined ? {} : { totalBytes: total }),
      });
    });
    report(onProgress, { stage: "video", percent: 65, message: "Videoclip descărcat" });

    const nmeaRemote = remotePath.replace(/\.[^.]+$/u, ".NMEA");
    const nmeaName = posix.basename(nmeaRemote);
    const nmeaPath = safeLocalFile(this.downloadsDirectory, nmeaName);
    report(onProgress, { stage: "telemetry", percent: 67, message: "Se verifică traseul GPS…" });
    const hasNmea = await this.tryDownload(nmeaRemote, nmeaPath);
    report(onProgress, { stage: "telemetry", percent: 72, message: hasNmea ? "Date GPS pregătite" : "Fără date GPS" });

    const aacName = originalName.replace(/\.[^.]+$/u, "-AAC.MP4");
    const aacPath = safeLocalFile(this.downloadsDirectory, aacName);
    let playableName = originalName;
    let warning: string | undefined;
    try {
      report(onProgress, { stage: "audio", percent: 74, message: "Se pregătește sunetul AAC…" });
      await this.ensureAacCopy(originalPath, aacPath);
      playableName = aacName;
    } catch (error) {
      warning = `Conversia AAC nu a fost disponibilă: ${errorMessage(error)}`;
      this.logger.debug(warning);
    }

    let gpxName: string | undefined;
    report(onProgress, { stage: "gpx", percent: 94, message: "Se finalizează traseul…" });
    if (hasNmea) {
      gpxName = nmeaName.replace(/\.NMEA$/i, ".gpx");
      const gpxPath = safeLocalFile(this.downloadsDirectory, gpxName);
      if (!(await exists(gpxPath))) {
        const samples = parseNmeaTelemetry(await readFile(nmeaPath, "utf8"));
        await writeFile(gpxPath, telemetryToGpx(samples, nmeaName), { encoding: "utf8", flag: "wx" });
      }
    }

    const result = {
      originalName,
      playableName,
      ...(hasNmea ? { nmeaName } : {}),
      ...(gpxName === undefined ? {} : { gpxName }),
      ...(warning === undefined ? {} : { warning }),
    };
    report(onProgress, { stage: "complete", percent: 100, message: "Pregătire finalizată" });
    return result;
  }

  async telemetry(name: string): Promise<readonly GpsSample[]> {
    if (!/\.NMEA$/i.test(name)) throw new Error("Este necesar un fișier .NMEA");
    const path = safeLocalFile(this.downloadsDirectory, name);
    return parseNmeaTelemetry(await readFile(path, "utf8"));
  }

  private async ensureDownloaded(
    remotePath: string,
    destinationPath: string,
    onProgress?: (received: number, total?: number) => void,
  ): Promise<void> {
    if (await exists(destinationPath)) return;
    const head = await this.client.headFile(remotePath);
    const lengthText = head.headers["content-length"];
    const expectedBytes = lengthText !== undefined && /^\d+$/.test(lengthText)
      ? Number.parseInt(lengthText, 10)
      : undefined;
    await downloadToFile({
      host: this.endpoint.host,
      port: this.endpoint.httpPort,
      remotePath,
      destinationPath,
      ...(expectedBytes === undefined ? {} : { expectedBytes }),
      onProgress: (progress) => onProgress?.(progress.bytesReceived, progress.totalBytes),
    });
  }

  private async tryDownload(remotePath: string, destinationPath: string): Promise<boolean> {
    if (await exists(destinationPath)) return true;
    try {
      await this.ensureDownloaded(remotePath, destinationPath);
      return true;
    } catch (error) {
      this.logger.debug(`Sidecar indisponibil pentru ${basename(remotePath)}: ${errorMessage(error)}`);
      return false;
    }
  }

  private async ensureAacCopy(inputPath: string, outputPath: string): Promise<void> {
    if (await exists(outputPath)) return;
    const ffmpeg = await findFfmpeg();
    await runProcess(ffmpeg, [
      "-hide_banner", "-nostdin", "-loglevel", "error", "-i", inputPath,
      "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy", "-c:a", "aac",
      "-b:a", "128k", "-movflags", "+faststart", outputPath,
    ]);
  }
}

async function findFfmpeg(): Promise<string> {
  const configured = process.env["FFMPEG_PATH"];
  if (configured !== undefined && await exists(configured)) return configured;
  const root = join(process.cwd(), ".analysis", "ffmpeg");
  const found = await findByName(root, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  if (found !== undefined) return found;
  throw new Error("FFmpeg nu a fost găsit; setează FFMPEG_PATH");
}

async function findByName(directory: string, name: string): Promise<string | undefined> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return path;
    if (entry.isDirectory()) {
      const nested = await findByName(path, name);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

async function runProcess(command: string, args: readonly string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    const errors: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => {
      if (Buffer.concat(errors).byteLength < 64 * 1024) errors.push(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(Buffer.concat(errors).toString("utf8").trim() || `FFmpeg a ieșit cu codul ${code}`));
    });
  });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function report(callback: PrepareProgressCallback | undefined, progress: PrepareProgress): void {
  callback?.(progress);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
