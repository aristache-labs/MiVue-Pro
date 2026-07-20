/**
 * Shared video thumbnail cache for Local Library + Download Queue.
 * Keyed by full URI and by basename so Queue can reuse Local Library hits
 * without a second cache system.
 */

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | undefined>>();

export function basenameOfUri(uri: string): string {
  const cleaned = uri.split("?")[0] ?? uri;
  const parts = cleaned.split(/[/\\]/u);
  return parts[parts.length - 1] ?? cleaned;
}

export function peekVideoThumbCache(uriOrName: string): string | undefined {
  return cache.get(uriOrName) ?? cache.get(basenameOfUri(uriOrName));
}

export function isVideoThumbInflight(uriOrName: string): boolean {
  const base = basenameOfUri(uriOrName);
  return inflight.has(uriOrName) || inflight.has(base);
}

export function rememberVideoThumb(sourceUri: string, thumbUri: string): void {
  cache.set(sourceUri, thumbUri);
  cache.set(basenameOfUri(sourceUri), thumbUri);
}

/** Test helper — clears module cache between cases. */
export function clearVideoThumbCache(): void {
  cache.clear();
  inflight.clear();
}

export type VideoThumbGenerator = (sourceUri: string) => Promise<string>;

/**
 * Load (or reuse) a thumbnail URI. Errors return undefined — callers must not
 * treat failures as download failures.
 */
export async function loadVideoThumb(
  sourceUri: string,
  generate: VideoThumbGenerator,
): Promise<string | undefined> {
  const base = basenameOfUri(sourceUri);
  const hit = cache.get(sourceUri) ?? cache.get(base);
  if (hit) return hit;

  const existing = inflight.get(sourceUri) ?? inflight.get(base);
  if (existing) return existing;

  const task = (async () => {
    try {
      const thumbUri = await generate(sourceUri);
      rememberVideoThumb(sourceUri, thumbUri);
      return thumbUri;
    } catch {
      return undefined;
    } finally {
      inflight.delete(sourceUri);
      inflight.delete(base);
    }
  })();

  inflight.set(sourceUri, task);
  inflight.set(base, task);
  return task;
}
