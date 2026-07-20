import type { FileSink } from "./fileSink";

type FileSystemLike = {
  getInfoAsync(path: string): Promise<{ exists: boolean; size?: number }>;
  writeAsStringAsync(path: string, data: string, options?: { encoding?: string }): Promise<void>;
  moveAsync(options: { from: string; to: string }): Promise<void>;
  deleteAsync(path: string, options?: { idempotent?: boolean }): Promise<void>;
  EncodingType?: { Base64: string };
};

/** FileSink backed by expo-file-system (injected to keep package testable in Node). */
export class ExpoFileSink implements FileSink {
  constructor(private readonly fs: FileSystemLike) {}

  async exists(path: string): Promise<boolean> {
    const info = await this.fs.getInfoAsync(path);
    return info.exists;
  }

  async sizeOf(path: string): Promise<number | undefined> {
    const info = await this.fs.getInfoAsync(path);
    if (!info.exists || typeof info.size !== "number") return undefined;
    return info.size;
  }

  async writeExclusive(path: string, data: Uint8Array): Promise<void> {
    if (await this.exists(path)) {
      throw new Error(`File already exists: ${path}`);
    }
    const base64 = uint8ToBase64(data);
    const encoding = this.fs.EncodingType?.Base64 ?? "base64";
    await this.fs.writeAsStringAsync(path, base64, { encoding });
  }

  async rename(from: string, to: string): Promise<void> {
    if (await this.exists(to)) {
      throw new Error(`Destination exists: ${to}`);
    }
    await this.fs.moveAsync({ from, to });
  }

  async remove(path: string): Promise<void> {
    await this.fs.deleteAsync(path, { idempotent: true });
  }
}

function uint8ToBase64(data: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    for (let i = 0; i < data.length; i += 1) binary += String.fromCharCode(data[i]!);
    return globalThis.btoa(binary);
  }
  return Buffer.from(data).toString("base64");
}
