import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join, posix } from "node:path";
import { spawn } from "node:child_process";
import { MiVueClient } from "../protocol/mivueClient.js";
import { parseNmeaTelemetry, telemetryToGpx, type GpsSample } from "../protocol/nmea.js";
import type { CameraEndpoint, CameraPosition, FileCategory, RemoteFile } from "../protocol/types.js";
import { DownloadError, downloadToFile, type DownloadProgress } from "../transport/downloadTransport.js";
import { HttpTransport } from "../transport/httpTransport.js";
import { calculateProgress } from "../utils/progress.js";
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
  readonly bytesPerSecond?: number;
  readonly etaSeconds?: number;
}

export type PrepareProgressCallback = (progress: PrepareProgress) => void;

export class CameraService {
  private readonly client: MiVueClient;
  private readonly thumbnailTransport: HttpTransport;
  private thumbnailActive = 0;
  private readonly thumbnailWaiters: Array<() => void> = [];
  private listCache: { key: string; files: DashboardFile[]; fetchedAt: number } | null = null;
  private readonly thumbMemory = new Map<string, Uint8Array>();
  private readonly thumbMemoryOrder: string[] = [];
  private static readonly LIST_TTL_MS = 25_000;
  private static readonly THUMB_MEM_MAX = 64;
  private static readonly THUMB_CONCURRENCY = 2;

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

  invalidateListCache(): void {
    this.listCache = null;
  }

  async list(category?: ConcreteCategory, options?: { fresh?: boolean }): Promise<readonly DashboardFile[]> {
    const key = category ?? "all";
    if (
      !options?.fresh
      && this.listCache
      && this.listCache.key === key
      && Date.now() - this.listCache.fetchedAt < CameraService.LIST_TTL_MS
    ) {
      return this.listCache.files;
    }

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

    const coveredStems = new Set<string>();
    const mapped = result.files.map((file) => {
      const originalName = posix.basename(file.path);
      const aacName = originalName.replace(/\.[^.]+$/u, "-AAC.MP4");
      const localName = localNames.get(aacName.toLowerCase()) ?? localNames.get(originalName.toLowerCase());
      const telemetryName = originalName.replace(/\.[^.]+$/u, ".NMEA");
      const localTelemetryName = localNames.get(telemetryName.toLowerCase());
      coveredStems.add(mediaStem(originalName));
      if (localName !== undefined) coveredStems.add(mediaStem(localName));
      return {
        ...file,
        locallyAvailable: localName !== undefined,
        ...(localName === undefined ? {} : { localName }),
        ...(localTelemetryName === undefined ? {} : { localTelemetryName }),
      };
    });

    const orphans = await this.listLocalOnlyFiles(localNames, coveredStems, category);
    const files = orphans.length === 0 ? mapped : [...mapped, ...orphans];
    this.listCache = { key, files: files as DashboardFile[], fetchedAt: Date.now() };
    return files;
  }

  private async listLocalOnlyFiles(
    localNames: ReadonlyMap<string, string>,
    coveredStems: ReadonlySet<string>,
    category?: ConcreteCategory,
  ): Promise<DashboardFile[]> {
    const preferred = new Map<string, string>();
    for (const name of localNames.values()) {
      if (!isLocalMediaName(name)) continue;
      const stem = mediaStem(name);
      const current = preferred.get(stem);
      const isAac = /-AAC\./i.test(name);
      if (current === undefined) preferred.set(stem, name);
      else if (!isAac && /-AAC\./i.test(current)) preferred.set(stem, name);
    }

    const orphans: DashboardFile[] = [];
    for (const [stem, localName] of preferred) {
      if (coveredStems.has(stem)) continue;
      const inferred = inferLocalMedia(localName);
      if (category !== undefined && inferred.category !== category) continue;
      let sizeBytes = 0;
      try {
        sizeBytes = (await stat(safeLocalFile(this.downloadsDirectory, localName))).size;
      } catch {
        continue;
      }
      const telemetryName = localName.replace(/-AAC(?=\.[^.]+$)/i, "").replace(/\.[^.]+$/u, ".NMEA");
      const localTelemetryName = localNames.get(telemetryName.toLowerCase());
      orphans.push({
        path: `/local/${localName}`,
        name: localName.replace(/-AAC(?=\.[^.]+$)/i, ""),
        category: inferred.category,
        camera: inferred.camera,
        mediaFormat: inferred.mediaFormat,
        sizeBytes,
        writable: false,
        recordedAt: inferred.recordedAt,
        locallyAvailable: true,
        localName,
        ...(localTelemetryName === undefined ? {} : { localTelemetryName }),
      });
    }
    return orphans;
  }

  async thumbnail(remotePath: string): Promise<Uint8Array> {
    assertRemoteThumbnailPath(remotePath);
    await mkdir(this.downloadsDirectory, { recursive: true });
    const cacheName = `thumb-${createHash("sha256").update(remotePath).digest("hex").slice(0, 20)}.jpg`;
    const cachedMemory = this.thumbMemory.get(cacheName);
    if (cachedMemory) return cachedMemory;

    const cachePath = safeLocalFile(this.downloadsDirectory, cacheName);
    if (await exists(cachePath)) {
      const fromDisk = await readFile(cachePath);
      this.rememberThumb(cacheName, fromDisk);
      return fromDisk;
    }

    await this.acquireThumbnailSlot();
    try {
      const again = this.thumbMemory.get(cacheName);
      if (again) return again;
      if (await exists(cachePath)) {
        const fromDisk = await readFile(cachePath);
        this.rememberThumb(cacheName, fromDisk);
        return fromDisk;
      }
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
      this.rememberThumb(cacheName, response.body);
      return response.body;
    } finally {
      this.releaseThumbnailSlot();
    }
  }

  private acquireThumbnailSlot(): Promise<void> {
    if (this.thumbnailActive < CameraService.THUMB_CONCURRENCY) {
      this.thumbnailActive += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.thumbnailWaiters.push(() => {
        this.thumbnailActive += 1;
        resolve();
      });
    });
  }

  private releaseThumbnailSlot(): void {
    this.thumbnailActive = Math.max(0, this.thumbnailActive - 1);
    const next = this.thumbnailWaiters.shift();
    if (next) next();
  }

  async localStorageSummary(): Promise<{ fileCount: number; totalBytes: number }> {
    let fileCount = 0;
    let totalBytes = 0;
    try {
      for (const entry of await readdir(this.downloadsDirectory, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        fileCount += 1;
        try {
          totalBytes += (await stat(safeLocalFile(this.downloadsDirectory, entry.name))).size;
        } catch {
          // skip unreadable entries
        }
      }
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") throw error;
    }
    return { fileCount, totalBytes };
  }

  async deleteLocalFiles(names: readonly string[]): Promise<{ deleted: string[]; missing: string[] }> {
    const deleted: string[] = [];
    const missing: string[] = [];
    for (const name of names) {
      const path = safeLocalFile(this.downloadsDirectory, name);
      try {
        await unlink(path);
        deleted.push(name);
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") missing.push(name);
        else throw error;
      }
    }
    if (deleted.length > 0) this.invalidateListCache();
    return { deleted, missing };
  }

  async openDownloadsFolder(): Promise<void> {
    await mkdir(this.downloadsDirectory, { recursive: true });
    const child = spawn("explorer.exe", [this.downloadsDirectory], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  }

  private rememberThumb(key: string, body: Uint8Array): void {
    if (this.thumbMemory.has(key)) {
      this.thumbMemory.set(key, body);
      return;
    }
    this.thumbMemory.set(key, body);
    this.thumbMemoryOrder.push(key);
    while (this.thumbMemoryOrder.length > CameraService.THUMB_MEM_MAX) {
      const oldest = this.thumbMemoryOrder.shift();
      if (oldest !== undefined) this.thumbMemory.delete(oldest);
    }
  }

  async prepare(remotePath: string, onProgress?: PrepareProgressCallback, signal?: AbortSignal): Promise<PreparedMedia> {
    assertNotAborted(signal);
    assertRemoteMediaPath(remotePath);
    report(onProgress, { stage: "starting", percent: 0, message: "Se verifică fișierul…" });
    await mkdir(this.downloadsDirectory, { recursive: true });
    const originalName = posix.basename(remotePath);
    const originalPath = safeLocalFile(this.downloadsDirectory, originalName);
    await this.ensureDownloaded(remotePath, originalPath, signal, (transfer) => {
      const snapshot = calculateProgress(transfer);
      const percent = snapshot.percent === undefined
        ? Math.min(90, 5 + Math.round(Math.log10(Math.max(transfer.bytesReceived, 1)) * 8))
        : Math.min(90, Math.round(snapshot.percent * 0.9));
      report(onProgress, {
        stage: "video",
        percent,
        message: "Se descarcă videoclipul…",
        bytesReceived: transfer.bytesReceived,
        ...(transfer.totalBytes === undefined ? {} : { totalBytes: transfer.totalBytes }),
        bytesPerSecond: transfer.bytesPerSecond,
        ...(snapshot.etaSeconds === undefined ? {} : { etaSeconds: snapshot.etaSeconds }),
      });
    });
    assertNotAborted(signal);
    report(onProgress, { stage: "video", percent: 90, message: "Videoclip descărcat" });

    const nmeaRemote = remotePath.replace(/\.[^.]+$/u, ".NMEA");
    const nmeaName = posix.basename(nmeaRemote);
    const nmeaPath = safeLocalFile(this.downloadsDirectory, nmeaName);
    report(onProgress, { stage: "telemetry", percent: 92, message: "Se verifică traseul GPS…" });
    const hasNmea = await this.tryDownload(nmeaRemote, nmeaPath, signal);
    assertNotAborted(signal);
    report(onProgress, { stage: "telemetry", percent: 94, message: hasNmea ? "Date GPS pregătite" : "Fără date GPS" });

    const aacName = originalName.replace(/\.[^.]+$/u, "-AAC.MP4");
    const aacPath = safeLocalFile(this.downloadsDirectory, aacName);
    let playableName = originalName;
    let warning: string | undefined;
    try {
      report(onProgress, { stage: "audio", percent: 96, message: "Se pregătește sunetul AAC…" });
      await this.ensureAacCopy(originalPath, aacPath, signal);
      playableName = aacName;
    } catch (error) {
      if (isAbortError(error)) throw error;
      warning = `Conversia AAC nu a fost disponibilă: ${errorMessage(error)}`;
      this.logger.debug(warning);
    }

    assertNotAborted(signal);
    let gpxName: string | undefined;
    report(onProgress, { stage: "gpx", percent: 98, message: "Se finalizează traseul…" });
    if (hasNmea) {
      const derivedGpxName = nmeaName.replace(/\.NMEA$/i, ".gpx");
      gpxName = derivedGpxName;
      const gpxPath = safeLocalFile(this.downloadsDirectory, derivedGpxName);
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
    signal?: AbortSignal,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    assertNotAborted(signal);
    if (await exists(destinationPath)) return;
    const head = await this.client.headFile(remotePath);
    assertNotAborted(signal);
    const lengthText = head.headers["content-length"];
    const expectedBytes = lengthText !== undefined && /^\d+$/.test(lengthText)
      ? Number.parseInt(lengthText, 10)
      : undefined;
    try {
      await downloadToFile({
        host: this.endpoint.host,
        port: this.endpoint.httpPort,
        remotePath,
        destinationPath,
        ...(expectedBytes === undefined ? {} : { expectedBytes }),
        ...(signal === undefined ? {} : { signal }),
        ...(onProgress === undefined ? {} : { onProgress }),
      });
    } catch (error) {
      if (error instanceof DownloadError) {
        await unlink(error.partialPath).catch(() => undefined);
      }
      throw error;
    }
  }

  private async tryDownload(remotePath: string, destinationPath: string, signal?: AbortSignal): Promise<boolean> {
    if (await exists(destinationPath)) return true;
    try {
      await this.ensureDownloaded(remotePath, destinationPath, signal);
      return true;
    } catch (error) {
      if (isAbortError(error)) throw error;
      this.logger.debug(`Sidecar indisponibil pentru ${basename(remotePath)}: ${errorMessage(error)}`);
      return false;
    }
  }

  private async ensureAacCopy(inputPath: string, outputPath: string, signal?: AbortSignal): Promise<void> {
    assertNotAborted(signal);
    if (await exists(outputPath)) return;
    const ffmpeg = await findFfmpeg();
    await runProcess(ffmpeg, [
      "-hide_banner", "-nostdin", "-loglevel", "error", "-i", inputPath,
      "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy", "-c:a", "aac",
      "-b:a", "128k", "-movflags", "+faststart", outputPath,
    ], signal);
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

async function runProcess(command: string, args: readonly string[], signal?: AbortSignal): Promise<void> {
  assertNotAborted(signal);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    const errors: Buffer[] = [];
    const onAbort = (): void => {
      child.kill();
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stderr.on("data", (chunk: Buffer) => {
      if (Buffer.concat(errors).byteLength < 64 * 1024) errors.push(chunk);
    });
    child.once("error", (error: Error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.once("close", (code: number | null) => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) reject(abortError());
      else if (code === 0) resolve();
      else reject(new Error(Buffer.concat(errors).toString("utf8").trim() || `FFmpeg a ieșit cu codul ${code}`));
    });
  });
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function abortError(): Error {
  const error = new Error("Descărcare anulată");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.message === "Descărcare anulată" || error.message === "Transfer anulat");
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

function isLocalMediaName(name: string): boolean {
  if (/^thumb-/i.test(name)) return false;
  return /\.(mp4|jpg|jpeg)$/i.test(name);
}

function mediaStem(name: string): string {
  return name.replace(/-AAC(?=\.[^.]+$)/i, "").replace(/\.[^.]+$/u, "").toLowerCase();
}

function inferLocalMedia(name: string): {
  category: FileCategory;
  camera: CameraPosition;
  mediaFormat: string;
  recordedAt: string;
} {
  const upper = name.toUpperCase();
  let category: FileCategory = "unknown";
  if (upper.startsWith("PARK")) category = "parking";
  else if (upper.startsWith("EVENT") || upper.startsWith("EMER")) category = "event";
  else if (/\.(JPG|JPEG)$/i.test(name)) category = "photo";
  else if (upper.startsWith("FILE") || /\.MP4$/i.test(name)) category = "normal";

  let camera: CameraPosition = "unknown";
  if (/F(?:-AAC)?\.(MP4|JPG|JPEG)$/i.test(name)) camera = "front";
  else if (/R(?:-AAC)?\.(MP4|JPG|JPEG)$/i.test(name)) camera = "rear";
  else if (/I(?:-AAC)?\.(MP4|JPG|JPEG)$/i.test(name)) camera = "incabin";

  const match = name.match(/(\d{6})-(\d{6})/);
  let recordedAt = "unknown";
  if (match?.[1] && match[2]) {
    const d = match[1];
    const t = match[2];
    recordedAt = `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)} ${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
  }

  return {
    category,
    camera,
    mediaFormat: /\.(JPG|JPEG)$/i.test(name) ? "jpeg" : "mp4",
    recordedAt,
  };
}
