export type FileCategory = "normal" | "event" | "parking" | "photo" | "unknown";

export type CameraPosition = "front" | "rear" | "incabin" | "unknown";

export interface CameraEndpoint {
  readonly host: string;
  readonly httpPort: number;
  readonly rtspPort: number;
}

export interface ConfigResponse {
  readonly code: number;
  readonly message: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly raw: string;
}

export interface RemoteFile {
  readonly path: string;
  readonly name: string;
  readonly category: FileCategory;
  readonly camera: CameraPosition;
  readonly mediaFormat: string;
  readonly resolution?: string;
  readonly fps?: number;
  readonly durationSeconds?: number;
  readonly sizeBytes: number;
  readonly writable: boolean;
  readonly recordedAt: string;
}

export interface FileListResponse {
  readonly files: readonly RemoteFile[];
  readonly amount: number;
  readonly raw: string;
}

export interface CompleteFileListResponse {
  readonly files: readonly RemoteFile[];
  readonly amount: number;
  readonly pages: number;
  readonly truncated: boolean;
}

export interface CameraInfo {
  readonly endpoint: CameraEndpoint;
  readonly server?: string;
  readonly status: ConfigResponse;
  readonly properties: Readonly<Record<string, string>>;
}
