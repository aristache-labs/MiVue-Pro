/**
 * Path safety for Local Library batch delete — download dir only, no camera.
 */

export function normalizeDirUri(dir: string): string {
  let d = dir.replace(/\\/gu, "/");
  if (!d.endsWith("/")) d += "/";
  return d;
}

/**
 * True when `uri` is a file directly under `downloadDir` (no traversal, no subdir escape).
 * Rejects `..`, absolute escapes, and anything outside the managed downloads folder.
 */
export function isManagedLocalMediaUri(uri: string, downloadDir: string): boolean {
  if (!uri || !downloadDir) return false;
  if (uri.includes("\0") || /[\r\n]/u.test(uri)) return false;
  const root = normalizeDirUri(downloadDir);
  const candidate = uri.replace(/\\/gu, "/");
  if (!candidate.startsWith(root)) return false;
  const rest = candidate.slice(root.length);
  if (!rest || rest.includes("/") || rest.includes("\\") || rest === ".." || rest.includes("..")) {
    return false;
  }
  if (rest.startsWith(".")) return false; // skip .thumbs / hidden
  if (rest.endsWith(".part") || /\.nmea$/iu.test(rest)) return false;
  return /\.(mp4|mov|m4v|jpg|jpeg|png|webp)$/iu.test(rest);
}

export function assertManagedLocalMediaUri(uri: string, downloadDir: string): void {
  if (!isManagedLocalMediaUri(uri, downloadDir)) {
    throw new Error("Path is outside the local downloads directory");
  }
}

export interface BatchDeleteResult {
  readonly deleted: number;
  readonly failed: number;
}

/**
 * Sequential local deletes. `deleteOne` must only remove managed local files.
 * Does not contact the camera.
 */
export async function deleteLocalFilesSequential(
  uris: readonly string[],
  downloadDir: string,
  deleteOne: (uri: string) => Promise<void>,
): Promise<BatchDeleteResult> {
  let deleted = 0;
  let failed = 0;
  for (const uri of uris) {
    try {
      assertManagedLocalMediaUri(uri, downloadDir);
      await deleteOne(uri);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { deleted, failed };
}
