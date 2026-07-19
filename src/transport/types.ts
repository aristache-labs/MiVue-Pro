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
