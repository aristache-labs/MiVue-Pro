import { discoverCamera } from "../discovery/discoverCamera.js";
import { createClient, endpointForHost } from "./shared.js";
import type { CommandContext } from "./context.js";

export async function runInfo(context: CommandContext): Promise<void> {
  const endpoint = context.host === undefined
    ? (await discoverCamera({ timeoutMs: context.timeoutMs, logger: context.logger }))?.endpoint
    : endpointForHost(context.host);
  if (endpoint === undefined) {
    throw new Error("Camera MiVue nu a fost găsită.");
  }

  const info = await createClient(endpoint, context).getInfo();
  if (context.json) {
    context.logger.info(JSON.stringify(info, null, 2));
    return;
  }

  context.logger.info("Informații cameră");
  context.logger.info(`  HTTP:       http://${info.endpoint.host}:${info.endpoint.httpPort}`);
  context.logger.info(`  RTSP port:  ${info.endpoint.rtspPort} (flux neconfirmat)`);
  context.logger.info(`  Status:     ${info.status.code} ${info.status.message}`);
  if (info.server !== undefined) {
    context.logger.info(`  Server:     ${info.server}`);
  }
  for (const [key, value] of Object.entries(info.properties)) {
    context.logger.info(`  ${key}: ${value || "(gol)"}`);
  }
}
