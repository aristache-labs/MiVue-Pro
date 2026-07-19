import { basename, isAbsolute, resolve, sep } from "node:path";

export function safeLocalFile(root: string, name: string): string {
  if (name === "" || basename(name) !== name || isAbsolute(name) || /[\r\n]/.test(name)) {
    throw new Error("Nume de fișier local invalid");
  }
  const resolvedRoot = resolve(root);
  const candidate = resolve(resolvedRoot, name);
  if (!candidate.startsWith(`${resolvedRoot}${sep}`)) throw new Error("Calea locală iese din folderul permis");
  return candidate;
}

export function assertRemoteMediaPath(remotePath: string): void {
  if (!remotePath.startsWith("/SD/") || remotePath.includes("..") || /[\r\n]/.test(remotePath)) {
    throw new Error("Cale remote invalidă");
  }
  if (!/\.(?:MP4|MOV)$/i.test(remotePath)) throw new Error("Dashboardul pregătește numai fișiere video");
}

/** Any file under /SD/ (video, photo, NMEA) — used for camera delete. */
export function assertRemoteSdPath(remotePath: string): void {
  if (!remotePath.startsWith("/SD/") || remotePath.includes("..") || /[\r\n]/.test(remotePath)) {
    throw new Error("Cale remote invalidă");
  }
}

export function assertRemoteThumbnailPath(remotePath: string): void {
  if (!remotePath.startsWith("/SD/") || remotePath.includes("..") || /[\r\n]/.test(remotePath)) {
    throw new Error("Cale remote invalidă");
  }
  if (!/\.(?:MP4|MOV|JPG|JPEG|PNG)$/i.test(remotePath)) {
    throw new Error("Miniatura este permisă numai pentru fișiere media");
  }
}
