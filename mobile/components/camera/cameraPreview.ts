import type { CameraLinkState } from "@/components/camera/cameraLibraryModel";
import type { RemoteFile } from "@/packages/parsers/src/index";

export type CameraPreviewKind = "image" | "video";

export type CameraPreviewAvailability =
  | { readonly available: true; readonly kind: CameraPreviewKind }
  | { readonly available: false; readonly reason: string };

export const CAMERA_PLAYBACK_PREVIEW_PROPERTY =
  "Vendor.DeviceInfo.SupportPlaybackPreview";
const DEFAULT_CAMERA_HOST = "192.72.1.1";

function previewKind(file: RemoteFile): CameraPreviewKind | undefined {
  if (file.category === "photo" || /\.(?:jpe?g)$/iu.test(file.name)) return "image";
  if (/\.(?:mp4|mov|m4v)$/iu.test(file.name)) return "video";
  return undefined;
}

export function cameraReportsVideoPreview(
  properties: Readonly<Record<string, string>>,
): boolean {
  const value = properties[CAMERA_PLAYBACK_PREVIEW_PROPERTY]?.trim().toLocaleUpperCase();
  return value === "YES" || value === "TRUE" || value === "1" || value === "SUPPORTED";
}

export function cameraPreviewAvailability(input: {
  readonly file: RemoteFile;
  readonly linkState: CameraLinkState;
  readonly cameraHost: string;
  readonly cameraProperties: Readonly<Record<string, string>>;
  readonly demoMode: boolean;
}): CameraPreviewAvailability {
  const { file, linkState, cameraHost, cameraProperties, demoMode } = input;
  const kind = previewKind(file);
  if (!kind) return { available: false, reason: "This file type cannot be previewed." };
  if (linkState !== "connected" && linkState !== "unstable") {
    return { available: false, reason: "Reconnect the camera to preview this file." };
  }
  if (demoMode && kind === "video") {
    return { available: false, reason: "Remote video preview is unavailable in Demo Mode." };
  }
  if (kind === "video" && !cameraReportsVideoPreview(cameraProperties)) {
    return {
      available: false,
      reason: "This camera does not report video preview support. Download the file to play it.",
    };
  }
  if (kind === "video" && cameraHost.trim() !== DEFAULT_CAMERA_HOST) {
    return {
      available: false,
      reason: "Video preview currently requires the camera's default 192.72.1.1 address.",
    };
  }
  return { available: true, kind };
}

/** Build an HTTP URL only for a validated camera SD media path. */
export function buildCameraPreviewUrl(cameraHost: string, remotePath: string): string {
  const host = cameraHost.trim();
  if (host !== DEFAULT_CAMERA_HOST) {
    throw new Error("Camera preview host is not allowed");
  }
  if (
    !remotePath.startsWith("/SD/") ||
    remotePath.includes("..") ||
    /[\r\n?#]/u.test(remotePath) ||
    !/\.(?:mp4|mov|m4v)$/iu.test(remotePath)
  ) {
    throw new Error("Camera preview path is not allowed");
  }
  const encodedPath = remotePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `http://${host}${encodedPath}`;
}
