import type { NativeTcpTransportOptions, Transport, TransportRequest, TransportResponse } from "./types";
import { TransportError } from "./types";

/**
 * Placeholder for HTTP/1.0 over raw TCP in a development build.
 * Throws until the native module is implemented (prototype gate).
 */
export class NativeTcpTransportStub implements Transport {
  constructor(private readonly options: NativeTcpTransportOptions) {}

  async request(_request: TransportRequest): Promise<TransportResponse> {
    void this.options;
    throw new TransportError(
      "NativeTcpTransport is not implemented yet. Use DemoTransport or complete the HTTP/1.0 native module after expo prebuild.",
      "NOT_IMPLEMENTED",
    );
  }
}
