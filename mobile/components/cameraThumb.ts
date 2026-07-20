/**
 * Camera SD thumbnails — same mapping as CLI `CameraService.thumbnail`:
 * video → GET `/thumb/Normal/F/FILE.MP4`; photo → GET the JPG itself.
 */

export function cameraThumbRequestPath(remoteSdPath: string): string {
  if (!remoteSdPath.startsWith("/SD/") || remoteSdPath.includes("..") || /[\r\n]/.test(remoteSdPath)) {
    throw new Error("Invalid remote media path for thumbnail");
  }
  if (!/\.(?:MP4|MOV|JPG|JPEG|PNG)$/i.test(remoteSdPath)) {
    throw new Error("Thumbnail only allowed for media files");
  }
  if (/\.(?:JPG|JPEG|PNG)$/i.test(remoteSdPath)) return remoteSdPath;
  return `/thumb${remoteSdPath.replace(/^\/SD/u, "")}`;
}

/** Stable, path-safe cache file name under the thumbs directory. */
export function cameraThumbCacheFileName(remoteSdPath: string): string {
  const trimmed = remoteSdPath.replace(/^\/SD\//u, "").replace(/[/\\]/gu, "_");
  return `thumb_${trimmed}.jpg`;
}

export function isJpegMagic(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
