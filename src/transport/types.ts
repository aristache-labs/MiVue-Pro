/** Explicit retry policy so mutation never inherits a raised readonly attempts default. */
export type TransportRetryPolicy = "readonly" | "mutation";

/** Default attempts for read-only HTTP (may be overridden per HttpTransport instance). */
export const READONLY_HTTP_ATTEMPTS = 2;

/** Hard cap for camera-mutating CGI (action=set/del): never retry. */
export const MUTATION_HTTP_ATTEMPTS = 1;

export interface TransportRequest {
  readonly method: "GET" | "HEAD";
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  /**
   * `mutation` forces MUTATION_HTTP_ATTEMPTS (1), ignoring transport constructor attempts.
   * Omitted / `readonly` uses the transport's configured readonly attempts.
   */
  readonly retryPolicy?: TransportRetryPolicy;
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
