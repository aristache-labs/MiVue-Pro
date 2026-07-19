import { MiVueClient } from "../protocol/mivueClient.js";
import type { CameraEndpoint } from "../protocol/types.js";
import { HttpTransport } from "../transport/httpTransport.js";
import { READONLY_HTTP_ATTEMPTS } from "../transport/types.js";
import type { CommandContext } from "./context.js";

export function createClient(endpoint: CameraEndpoint, context: CommandContext): MiVueClient {
  const transport = new HttpTransport({
    host: endpoint.host,
    port: endpoint.httpPort,
    timeoutMs: context.timeoutMs,
    // Read-only only. Mutating CGI sets request.retryPolicy="mutation" → attempts 1.
    attempts: READONLY_HTTP_ATTEMPTS,
    ...(context.logger === undefined ? {} : { logger: context.logger }),
  });
  return new MiVueClient(endpoint, transport);
}

export function endpointForHost(host: string): CameraEndpoint {
  const portEnv = process.env.MIVUE_HTTP_PORT;
  const parsed = portEnv === undefined ? Number.NaN : Number.parseInt(portEnv, 10);
  const httpPort = Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : 80;
  return { host, httpPort, rtspPort: 554 };
}
