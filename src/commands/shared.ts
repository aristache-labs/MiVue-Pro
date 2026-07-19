import { MiVueClient } from "../protocol/mivueClient.js";
import type { CameraEndpoint } from "../protocol/types.js";
import { HttpTransport } from "../transport/httpTransport.js";
import type { CommandContext } from "./context.js";

export function createClient(endpoint: CameraEndpoint, context: CommandContext): MiVueClient {
  const transport = new HttpTransport({
    host: endpoint.host,
    port: endpoint.httpPort,
    timeoutMs: context.timeoutMs,
    attempts: 2,
    ...(context.logger === undefined ? {} : { logger: context.logger }),
  });
  return new MiVueClient(endpoint, transport);
}

export function endpointForHost(host: string): CameraEndpoint {
  return { host, httpPort: 80, rtspPort: 554 };
}
