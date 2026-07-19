export function assertRemoteSdPath(remotePath: string): void {
  if (!remotePath.startsWith("/SD/") || remotePath.includes("..") || /[\r\n]/.test(remotePath)) {
    throw new Error("Invalid remote path");
  }
}

export function assertLocalFileName(name: string): void {
  if (name === "" || name.includes("..") || name.includes("/") || name.includes("\\") || /[\r\n]/.test(name)) {
    throw new Error("Invalid local file name");
  }
}

export function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  // Camera-confirmed LAN (docs/protocol.md)
  if (a === 192 && b === 72) return true;
  return false;
}
