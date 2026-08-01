import type { Transport, TransportResponse } from "../../camera-transport/src/index";
import { assertRemoteSdPath } from "../../camera-transport/src/index";
import {
  parseConfigResponse,
  parseFileListXml,
  parseMenuPropertyValue,
  type CameraEndpoint,
  type CameraInfo,
  type CompleteFileListResponse,
  type ConfigResponse,
  type FileCategory,
  type FileListResponse,
  type RemoteFile,
} from "../../parsers/src/index";
import { CameraProtocolError } from "./errors";

export interface ListFilesOptions {
  readonly count?: number;
  readonly from?: number;
  readonly category?: Exclude<FileCategory, "unknown">;
  readonly signal?: AbortSignal;
}

export interface ListAllFilesOptions {
  readonly pageSize?: number;
  readonly maxFiles?: number;
  readonly categories?: readonly Exclude<FileCategory, "unknown">[];
  readonly signal?: AbortSignal;
  readonly onPage?: (page: {
    readonly pageNumber: number;
    readonly category: Exclude<FileCategory, "unknown">;
    readonly from: number;
    readonly received: number;
    readonly total: number;
  }) => void;
}

/** Read-only properties confirmed live on MiVue 866 (docs/protocol.md). No mutate. */
const READONLY_INFO_PROPERTIES = Object.freeze([
  "Camera.Menu.UIMode",
  "Camera.Menu.VideoRes",
  "Vendor.DeviceInfo.LiveView",
  "Vendor.DeviceInfo.SupportMjpegStream",
  "Vendor.DeviceInfo.1080P",
]);

const FILE_PROPERTIES: Readonly<Record<Exclude<FileCategory, "unknown">, string>> = {
  normal: "Normal",
  event: "Event",
  parking: "Parking",
  photo: "Photo",
};

const ALL_FILE_CATEGORIES = Object.freeze(
  Object.keys(FILE_PROPERTIES) as Exclude<FileCategory, "unknown">[],
);

/**
 * Read-only camera client. Intentionally omits set/delete/probe mutate APIs.
 */
export class CameraClient {
  constructor(
    readonly endpoint: CameraEndpoint,
    private readonly transport: Transport,
  ) {}

  async getStatus(signal?: AbortSignal): Promise<ConfigResponse> {
    return this.getProperty("status", signal);
  }

  async getProperty(property: string, signal?: AbortSignal): Promise<ConfigResponse> {
    const query = new URLSearchParams({ action: "get", property });
    const response = await this.transport.request({
      method: "GET",
      path: `/cgi-bin/Config.cgi?${query.toString()}`,
      ...(signal === undefined ? {} : { signal }),
    });
    const parsed = parseConfigResponse(readText(response));
    if (parsed.code !== 0 || parsed.message.toUpperCase() !== "OK") {
      throw new CameraProtocolError(`Camera rejected property ${property}: ${parsed.code} ${parsed.message}`);
    }
    return parsed;
  }

  async getMenuProperty(property: string, signal?: AbortSignal): Promise<string | undefined> {
    const query = new URLSearchParams({ action: "get", property: "Camera.Menu.Property" });
    const response = await this.transport.request({
      method: "GET",
      path: `/cgi-bin/Config.cgi?${query.toString()}`,
      ...(signal === undefined ? {} : { signal }),
    });
    return parseMenuPropertyValue(readText(response), property);
  }

  async getInfo(signal?: AbortSignal): Promise<CameraInfo> {
    const statusResponse = await this.requestConfig("status", signal);
    const properties: Record<string, string> = { ...statusResponse.parsed.properties };
    for (const property of READONLY_INFO_PROPERTIES) {
      try {
        const result = await this.getProperty(property, signal);
        Object.assign(properties, result.properties);
      } catch {
        // Intermittent 799/703 on AIT firmware
      }
    }

    return {
      endpoint: this.endpoint,
      ...(statusResponse.response.headers.server === undefined
        ? {}
        : { server: statusResponse.response.headers.server }),
      status: statusResponse.parsed,
      properties,
    };
  }

  async listFiles(options: ListFilesOptions = {}): Promise<FileListResponse> {
    const count = options.count ?? 32;
    const from = options.from ?? 0;
    if (!Number.isInteger(count) || count < 1 || count > 1_000) {
      throw new RangeError("count must be an integer between 1 and 1000");
    }
    if (!Number.isInteger(from) || from < 0) {
      throw new RangeError("from must be a non-negative integer");
    }

    const query = new URLSearchParams({
      action: "dir",
      property: options.category === undefined ? "DCIM" : FILE_PROPERTIES[options.category],
      format: "all",
      count: String(count),
      from: String(from),
    });
    const response = await this.transport.request({
      method: "GET",
      path: `/cgi-bin/Config.cgi?${query.toString()}`,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
    return parseFileListXml(readText(response));
  }

  async listAllFiles(options: ListAllFilesOptions = {}): Promise<CompleteFileListResponse> {
    const pageSize = options.pageSize ?? 32;
    const maxFiles = options.maxFiles ?? 10_000;
    const categories = options.categories ?? ALL_FILE_CATEGORIES;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1_000) {
      throw new RangeError("pageSize must be an integer between 1 and 1000");
    }
    if (!Number.isInteger(maxFiles) || maxFiles < 1) {
      throw new RangeError("maxFiles must be a positive integer");
    }
    if (categories.length === 0 || categories.some((category) => !(category in FILE_PROPERTIES))) {
      throw new RangeError("categories must contain supported file categories");
    }

    const files: RemoteFile[] = [];
    const seenPaths = new Set<string>();
    let pages = 0;
    let completedCategories = 0;

    for (const category of categories) {
      let from = 0;
      while (files.length < maxFiles) {
        const page = await this.listFiles({
          count: pageSize,
          from,
          category,
          ...(options.signal === undefined ? {} : { signal: options.signal }),
        });
        pages += 1;
        let added = 0;
        for (const file of page.files) {
          if (!seenPaths.has(file.path)) {
            seenPaths.add(file.path);
            files.push(file);
            added += 1;
            if (files.length === maxFiles) break;
          }
        }
        options.onPage?.({
          pageNumber: pages,
          category,
          from,
          received: page.files.length,
          total: files.length,
        });

        if (page.files.length === 0 || page.amount === 0) break;
        if (added === 0) {
          throw new CameraProtocolError(`Camera repeated page ${category} at offset ${from}`);
        }
        if (page.files.length < pageSize || page.amount < pageSize) break;
        from += page.files.length;
      }
      if (files.length === maxFiles) break;
      completedCategories += 1;
    }

    return { files, amount: files.length, pages, truncated: completedCategories < categories.length };
  }

  async headFile(remotePath: string, signal?: AbortSignal): Promise<TransportResponse> {
    assertRemoteSdPath(remotePath);
    return this.transport.request({
      method: "HEAD",
      path: remotePath,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  private async requestConfig(
    property: string,
    signal?: AbortSignal,
  ): Promise<{ readonly parsed: ConfigResponse; readonly response: TransportResponse }> {
    const query = new URLSearchParams({ action: "get", property });
    const response = await this.transport.request({
      method: "GET",
      path: `/cgi-bin/Config.cgi?${query.toString()}`,
      ...(signal === undefined ? {} : { signal }),
    });
    const parsed = parseConfigResponse(readText(response));
    if (parsed.code !== 0) {
      throw new CameraProtocolError(`Camera returned ${parsed.code} for ${property}`);
    }
    return { parsed, response };
  }
}

function readText(response: TransportResponse): string {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new CameraProtocolError(`Camera returned HTTP ${response.statusCode}`, response.statusCode);
  }
  return new TextDecoder().decode(response.body);
}
