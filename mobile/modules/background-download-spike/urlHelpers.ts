/** Pure URL helpers for the Stage 0 background download spike (no RN imports). */

export function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 72) return true;
  if (a === 127) return true;
  return false;
}

/**
 * Build a camera file URL for the spike. Host must be private IPv4; path under /SD/.
 */
export function buildSpikeCameraFileUrl(host: string, remotePath: string, port = 80): string {
  const trimmedHost = host.trim();
  if (!isPrivateIpv4(trimmedHost)) {
    throw new Error("Host is not an allowed private IPv4 address");
  }
  const path = remotePath.startsWith("/") ? remotePath : `/${remotePath}`;
  if (!path.startsWith("/SD/") || path.includes("..") || /[\r\n]/.test(path)) {
    throw new Error("Unsafe remote path — expected /SD/…");
  }
  const portPart = port === 80 ? "" : `:${port}`;
  return `http://${trimmedHost}${portPart}${path}`;
}

/** Redact query/fragment for on-device logs (camera GETs normally have none). */
export function redactSpikeUrlForLog(url: string): string {
  try {
    const u = new URL(url);
    return `http://${u.hostname}${u.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}
