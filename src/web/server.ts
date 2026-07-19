import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";
import type { FileCategory } from "../protocol/types.js";
import type { Logger } from "../utils/logger.js";
import type { PreparedMedia, PrepareProgress, PrepareProgressCallback } from "./cameraService.js";
import type { GpsSample } from "../protocol/nmea.js";
import type { RemoteFile } from "../protocol/types.js";
import { safeLocalFile } from "./pathSafety.js";

const STATIC_FILES: Readonly<Record<string, string>> = {
  "/": "index.html",
  "/app.js": "app.js",
  "/styles.css": "styles.css",
  "/fonts/SourceSans3-Regular.woff2": "fonts/SourceSans3-Regular.woff2",
  "/fonts/SourceSans3-Semibold.woff2": "fonts/SourceSans3-Semibold.woff2",
  "/fonts/IBMPlexMono-Regular.woff2": "fonts/IBMPlexMono-Regular.woff2",
  "/fonts/IBMPlexMono-Medium.woff2": "fonts/IBMPlexMono-Medium.woff2",
};
const CATEGORIES = new Set<Exclude<FileCategory, "unknown">>(["normal", "event", "parking", "photo"]);
const GZIP_MIN_BYTES = 1024;

export interface DashboardServerOptions {
  readonly service: DashboardService;
  readonly logger: Logger;
  readonly webDirectory?: string;
}

export interface DashboardService {
  readonly downloadsDirectory: string;
  info(): Promise<unknown>;
  list(category?: Exclude<FileCategory, "unknown">, options?: { fresh?: boolean }): Promise<readonly RemoteFile[]>;
  invalidateListCache(): void;
  prepare(remotePath: string, onProgress?: PrepareProgressCallback, signal?: AbortSignal): Promise<PreparedMedia>;
  thumbnail(remotePath: string): Promise<Uint8Array>;
  telemetry(name: string): Promise<readonly GpsSample[]>;
  localStorageSummary(): Promise<{ fileCount: number; totalBytes: number }>;
  deleteLocalFiles(names: readonly string[]): Promise<{ deleted: string[]; missing: string[] }>;
  openDownloadsFolder(): Promise<void>;
  cameraCapabilities(): {
    mutateAllowed: boolean;
    setProperties: readonly string[];
    setPropertyValues: Readonly<Record<string, readonly string[]>>;
    setPropertyValueLabels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
    readableProperties: readonly string[];
    propertyLabels: Readonly<Record<string, string>>;
  };
  setCameraProperty(property: string, value: string): Promise<unknown>;
  deleteRemoteFiles(paths: readonly string[]): Promise<{
    results: Array<{ path: string; ok: boolean; statusCode: number; message: string }>;
  }>;
}

export function createDashboardServer(options: DashboardServerOptions): Server {
  const webDirectory = options.webDirectory ?? join(process.cwd(), "web");
  const jobs = new Map<string, PrepareJob>();
  const controllers = new Map<string, AbortController>();
  const prepareQueue: PrepareQueue = { running: false, items: [] };
  return createServer((request, response) => {
    void handleRequest(request, response, options.service, webDirectory, jobs, controllers, prepareQueue).catch((error: unknown) => {
      options.logger.error(error instanceof Error ? error.message : String(error));
      if (!response.headersSent) sendJson(response, request, 500, { error: publicError(error) });
      else response.destroy();
    });
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  service: DashboardService,
  webDirectory: string,
  jobs: Map<string, PrepareJob>,
  controllers: Map<string, AbortController>,
  prepareQueue: PrepareQueue,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Content-Security-Policy", "default-src 'self'; media-src 'self'; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data: https://tile.openstreetmap.org");

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, request, 200, { ok: true });
    return;
  }
  if (url.pathname === "/api/info" && request.method === "GET") {
    sendJson(response, request, 200, await service.info());
    return;
  }
  if (url.pathname === "/api/files" && request.method === "GET") {
    const categoryText = url.searchParams.get("category");
    const category = categoryText === null || categoryText === "all" ? undefined : categoryText;
    if (category !== undefined && !CATEGORIES.has(category as Exclude<FileCategory, "unknown">)) {
      sendJson(response, request, 400, { error: "Categorie invalidă" });
      return;
    }
    const fresh = url.searchParams.get("refresh") === "1";
    const files = await service.list(category as Exclude<FileCategory, "unknown"> | undefined, { fresh });
    sendJson(response, request, 200, { files, amount: files.length, cached: !fresh }, { preferGzip: true });
    return;
  }
  if (url.pathname === "/api/storage" && request.method === "GET") {
    sendJson(response, request, 200, await service.localStorageSummary());
    return;
  }
  if (url.pathname === "/api/open-downloads" && request.method === "POST") {
    await service.openDownloadsFolder();
    sendJson(response, request, 200, { ok: true });
    return;
  }
  if (url.pathname === "/api/camera/capabilities" && request.method === "GET") {
    sendJson(response, request, 200, service.cameraCapabilities());
    return;
  }
  if (url.pathname === "/api/camera/set" && request.method === "POST") {
    const body = await readJsonBody(request);
    const property = body["property"];
    const value = body["value"];
    if (typeof property !== "string" || typeof value !== "string") {
      sendJson(response, request, 400, { error: "property și value sunt obligatorii" });
      return;
    }
    try {
      const result = await service.setCameraProperty(property, value);
      sendJson(response, request, 200, result);
    } catch (error) {
      const message = publicError(error);
      const status = /Mutate dezactivat|allowlist/i.test(message) ? 403 : 400;
      sendJson(response, request, status, { error: message });
    }
    return;
  }
  if (url.pathname === "/api/camera/delete" && request.method === "POST") {
    const body = await readJsonBody(request);
    const paths = Array.isArray(body["paths"])
      ? body["paths"].filter((item): item is string => typeof item === "string")
      : typeof body["path"] === "string"
        ? [body["path"]]
        : [];
    if (paths.length === 0) {
      sendJson(response, request, 400, { error: "path sau paths lipsește" });
      return;
    }
    try {
      const result = await service.deleteRemoteFiles(paths);
      sendJson(response, request, 200, result);
    } catch (error) {
      const message = publicError(error);
      const status = /Mutate dezactivat/i.test(message) ? 403 : 400;
      sendJson(response, request, status, { error: message });
    }
    return;
  }
  if (url.pathname === "/api/local" && request.method === "DELETE") {
    const body = await readJsonBody(request);
    const names = Array.isArray(body["names"])
      ? body["names"].filter((item): item is string => typeof item === "string")
      : typeof body["name"] === "string"
        ? [body["name"]]
        : [];
    if (names.length === 0) {
      sendJson(response, request, 400, { error: "name sau names lipsește" });
      return;
    }
    if (names.length > 200) {
      sendJson(response, request, 400, { error: "Prea multe fișiere (max 200)" });
      return;
    }
    const result = await service.deleteLocalFiles(names);
    sendJson(response, request, 200, result);
    return;
  }
  if (url.pathname === "/api/prepare" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (typeof body["remotePath"] !== "string") {
      sendJson(response, request, 400, { error: "remotePath lipsește" });
      return;
    }
    for (const [existingId, existing] of jobs) {
      if ((existing.status === "queued" || existing.status === "running") && existing.remotePath === body["remotePath"]) {
        sendJson(response, request, 202, { jobId: existingId });
        return;
      }
    }
    const jobId = randomUUID();
    jobs.set(jobId, {
      status: "queued",
      remotePath: body["remotePath"],
      progress: { stage: "starting", percent: 0, message: "În coada de descărcare…" },
    });
    prepareQueue.items.push({ jobId, remotePath: body["remotePath"] });
    updateQueuePositions(prepareQueue, jobs);
    void drainPrepareQueue(prepareQueue, jobs, controllers, service);
    sendJson(response, request, 202, { jobId });
    return;
  }
  if (url.pathname.startsWith("/api/jobs/") && request.method === "GET") {
    const jobId = url.pathname.slice("/api/jobs/".length);
    const job = jobs.get(jobId);
    if (job === undefined) sendJson(response, request, 404, { error: "Operația nu a fost găsită sau a expirat" });
    else sendJson(response, request, 200, job);
    return;
  }
  if (url.pathname.startsWith("/api/jobs/") && request.method === "DELETE") {
    const jobId = url.pathname.slice("/api/jobs/".length);
    const cancelled = cancelPrepareJob(jobId, jobs, controllers, prepareQueue);
    if (!cancelled) sendJson(response, request, 404, { error: "Operația nu a fost găsită sau nu mai poate fi anulată" });
    else sendJson(response, request, 200, { ok: true, jobId });
    return;
  }
  if (url.pathname === "/api/thumbnail" && request.method === "GET") {
    const remotePath = url.searchParams.get("path");
    if (remotePath === null) {
      sendJson(response, request, 400, { error: "path lipsește" });
      return;
    }
    const image = await service.thumbnail(remotePath);
    response.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Content-Length": image.byteLength,
      "Cache-Control": "private, max-age=86400",
    });
    response.end(image);
    return;
  }
  if (url.pathname === "/api/telemetry" && request.method === "GET") {
    const name = url.searchParams.get("name");
    if (name === null) {
      sendJson(response, request, 400, { error: "name lipsește" });
      return;
    }
    const samples = await service.telemetry(name);
    sendJson(response, request, 200, { samples });
    return;
  }
  if (url.pathname.startsWith("/media/") && request.method === "GET") {
    const name = decodeURIComponent(url.pathname.slice("/media/".length));
    await serveMedia(request, response, safeLocalFile(service.downloadsDirectory, name));
    return;
  }
  const staticName = STATIC_FILES[url.pathname];
  if (staticName !== undefined && request.method === "GET") {
    await serveStatic(request, response, join(webDirectory, staticName), staticName);
    return;
  }
  const leafletPath = leafletAsset(url.pathname);
  if (leafletPath !== undefined && request.method === "GET") {
    const body = await readFile(leafletPath);
    response.writeHead(200, { "Content-Type": contentType(leafletPath), "Cache-Control": "public, max-age=31536000, immutable" });
    response.end(body);
    return;
  }
  sendJson(response, request, 404, { error: "Ruta nu există" });
}

type PrepareJob =
  | { status: "queued"; remotePath: string; progress: PrepareProgress }
  | { status: "running"; remotePath: string; progress: PrepareProgress }
  | { status: "complete"; result: ReturnType<typeof preparedResponse> }
  | { status: "error"; error: string };

interface PrepareQueue {
  running: boolean;
  readonly items: Array<{ jobId: string; remotePath: string }>;
}

async function drainPrepareQueue(
  queue: PrepareQueue,
  jobs: Map<string, PrepareJob>,
  controllers: Map<string, AbortController>,
  service: DashboardService,
): Promise<void> {
  if (queue.running) return;
  const next = queue.items.shift();
  if (next === undefined) return;
  queue.running = true;
  const controller = new AbortController();
  controllers.set(next.jobId, controller);
  jobs.set(next.jobId, {
    status: "running", remotePath: next.remotePath,
    progress: { stage: "starting", percent: 0, message: "Se pornește descărcarea…" },
  });
  updateQueuePositions(queue, jobs);
  try {
    const prepared = await service.prepare(next.remotePath, (progress) => {
      const job = jobs.get(next.jobId);
      if (job?.status === "running") job.progress = progress;
    }, controller.signal);
    if (controller.signal.aborted) {
      jobs.set(next.jobId, { status: "error", error: "Descărcare anulată" });
    } else {
      service.invalidateListCache();
      jobs.set(next.jobId, { status: "complete", result: preparedResponse(prepared) });
    }
  } catch (error) {
    const message = publicError(error);
    jobs.set(next.jobId, {
      status: "error",
      error: controller.signal.aborted || /anulat/i.test(message) ? "Descărcare anulată" : message,
    });
  } finally {
    controllers.delete(next.jobId);
    expireJob(jobs, next.jobId);
    queue.running = false;
    void drainPrepareQueue(queue, jobs, controllers, service);
  }
}

function cancelPrepareJob(
  jobId: string,
  jobs: Map<string, PrepareJob>,
  controllers: Map<string, AbortController>,
  queue: PrepareQueue,
): boolean {
  const job = jobs.get(jobId);
  if (job === undefined) return false;
  if (job.status === "queued") {
    const index = queue.items.findIndex((item) => item.jobId === jobId);
    if (index >= 0) queue.items.splice(index, 1);
    jobs.set(jobId, { status: "error", error: "Descărcare anulată" });
    updateQueuePositions(queue, jobs);
    expireJob(jobs, jobId);
    return true;
  }
  if (job.status === "running") {
    const controller = controllers.get(jobId);
    if (controller === undefined) return false;
    controller.abort();
    return true;
  }
  return false;
}

function updateQueuePositions(queue: PrepareQueue, jobs: Map<string, PrepareJob>): void {
  queue.items.forEach((item, index) => {
    const job = jobs.get(item.jobId);
    if (job?.status === "queued") {
      job.progress = { stage: "starting", percent: 0, message: `În coadă · poziția ${index + 1}` };
    }
  });
}

function preparedResponse(prepared: PreparedMedia) {
  return {
    ...prepared,
    mediaUrl: `/media/${encodeURIComponent(prepared.playableName)}`,
    ...(prepared.nmeaName === undefined
      ? {}
      : { telemetryUrl: `/api/telemetry?name=${encodeURIComponent(prepared.nmeaName)}` }),
  };
}

function expireJob(jobs: Map<string, PrepareJob>, jobId: string): void {
  const timer = setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  timer.unref();
}

function leafletAsset(pathname: string): string | undefined {
  const files: Readonly<Record<string, string>> = {
    "/vendor/leaflet.css": "leaflet.css",
    "/vendor/leaflet.js": "leaflet.js",
    "/vendor/images/layers.png": "images/layers.png",
    "/vendor/images/layers-2x.png": "images/layers-2x.png",
    "/vendor/images/marker-icon.png": "images/marker-icon.png",
    "/vendor/images/marker-icon-2x.png": "images/marker-icon-2x.png",
    "/vendor/images/marker-shadow.png": "images/marker-shadow.png",
  };
  const relative = files[pathname];
  return relative === undefined ? undefined : join(process.cwd(), "node_modules", "leaflet", "dist", relative);
}

async function serveMedia(request: IncomingMessage, response: ServerResponse, path: string): Promise<void> {
  const details = await stat(path);
  if (!details.isFile()) throw new Error("Media locală nu este un fișier");
  const range = request.headers.range;
  const headers = { "Accept-Ranges": "bytes", "Content-Type": contentType(path) };
  if (range === undefined) {
    response.writeHead(200, { ...headers, "Content-Length": details.size });
    createReadStream(path).pipe(response);
    return;
  }
  const match = range.match(/^bytes=(\d+)-(\d*)$/);
  if (match?.[1] === undefined) {
    response.writeHead(416, { "Content-Range": `bytes */${details.size}` });
    response.end();
    return;
  }
  const start = Number.parseInt(match[1], 10);
  const end = match[2] === undefined || match[2] === "" ? details.size - 1 : Number.parseInt(match[2], 10);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= details.size) {
    response.writeHead(416, { "Content-Range": `bytes */${details.size}` });
    response.end();
    return;
  }
  response.writeHead(206, {
    ...headers,
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${details.size}`,
  });
  createReadStream(path, { start, end }).pipe(response);
}

async function serveStatic(
  request: IncomingMessage,
  response: ServerResponse,
  absolutePath: string,
  relativeName: string,
): Promise<void> {
  const body = await readFile(absolutePath);
  const etag = `"${createHash("sha1").update(body).digest("hex")}"`;
  if (request.headers["if-none-match"] === etag) {
    response.writeHead(304, {
      ETag: etag,
      "Cache-Control": "no-cache",
    });
    response.end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentType(relativeName),
    "Content-Length": body.byteLength,
    ETag: etag,
    "Cache-Control": "no-cache",
  });
  response.end(body);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 32 * 1024) throw new Error("Corpul cererii depășește 32 KiB");
    chunks.push(buffer);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON invalid");
  return parsed as Record<string, unknown>;
}

function sendJson(
  response: ServerResponse,
  request: IncomingMessage | undefined,
  status: number,
  value: unknown,
  options: { preferGzip?: boolean } = {},
): void {
  const raw = Buffer.from(JSON.stringify(value), "utf8");
  const accept = request?.headers["accept-encoding"] ?? "";
  const wantsGzip = options.preferGzip === true && /\bgzip\b/i.test(String(accept)) && raw.byteLength >= GZIP_MIN_BYTES;
  if (wantsGzip) {
    const compressed = gzipSync(raw);
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "gzip",
      "Content-Length": compressed.byteLength,
      "Cache-Control": "no-store",
      Vary: "Accept-Encoding",
    });
    response.end(compressed);
    return;
  }
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": raw.byteLength,
    "Cache-Control": "no-store",
  });
  response.end(raw);
}

function contentType(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".gpx") return "application/gpx+xml";
  if (extension === ".woff2") return "font/woff2";
  return "application/octet-stream";
}

function publicError(error: unknown): string {
  if (error instanceof SyntaxError) return "JSON invalid";
  if (error instanceof Error) return error.message;
  return "Eroare necunoscută";
}
