import { isPrivateIpv4 } from "@/packages/camera-transport/src/index";

export type CameraIpv4ParseResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: string };

/** Strict IPv4 (four octets 0–255). Rejects protocol, port, path, hostname. */
export function isStrictIpv4(host: string): boolean {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
  const parts = host.split(".");
  return parts.every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

/**
 * Validate and normalize a camera IP draft for the settings editor.
 * Persists only private IPv4 addresses the transport already accepts.
 */
export function parseCameraIpv4Input(raw: string): CameraIpv4ParseResult {
  const value = raw.trim();
  if (!value) {
    return { ok: false, error: "Enter a camera IP address." };
  }
  if (
    /[:/\\?#]|[a-zA-Z]|^\./.test(value) ||
    value.includes(" ") ||
    !isStrictIpv4(value)
  ) {
    return {
      ok: false,
      error: "Enter a valid IPv4 address with exactly four numbers (0–255).",
    };
  }
  if (!isPrivateIpv4(value)) {
    return {
      ok: false,
      error: "Use a private IPv4 address on the camera Wi‑Fi network.",
    };
  }
  return { ok: true, value };
}

export function canSaveCameraIpv4(draft: string, currentHost: string): boolean {
  const parsed = parseCameraIpv4Input(draft);
  if (!parsed.ok) return false;
  return parsed.value !== currentHost.trim();
}
