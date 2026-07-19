export interface TransportRequest {
  readonly method: "GET" | "HEAD";
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

export interface TransportResponse {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
}

export interface Transport {
  request(request: TransportRequest): Promise<TransportResponse>;
}

export class TransportError extends Error {
  constructor(
    message: string,
    readonly causeCode?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TransportError";
  }
}

/** Reserved for development-build native HTTP/1.0 TCP (not implemented in Faza 2 foundation). */
export interface NativeTcpTransportOptions {
  readonly host: string;
  readonly port?: number;
  readonly timeoutMs?: number;
  readonly maxBodyBytes?: number;
  readonly userAgent?: string;
}
