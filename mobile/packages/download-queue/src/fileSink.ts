/** Abstract sink so Node tests and Expo FileSystem can share queue logic. */
export interface FileSink {
  exists(path: string): Promise<boolean>;
  writeExclusive(path: string, data: Uint8Array): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export class MemoryFileSink implements FileSink {
  private readonly files = new Map<string, Uint8Array>();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async writeExclusive(path: string, data: Uint8Array): Promise<void> {
    if (this.files.has(path)) {
      throw new Error(`File already exists: ${path}`);
    }
    this.files.set(path, data);
  }

  async rename(from: string, to: string): Promise<void> {
    const data = this.files.get(from);
    if (data === undefined) throw new Error(`Missing partial: ${from}`);
    if (this.files.has(to)) throw new Error(`Destination exists: ${to}`);
    this.files.set(to, data);
    this.files.delete(from);
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
  }

  read(path: string): Uint8Array | undefined {
    return this.files.get(path);
  }
}
