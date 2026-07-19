import { discoverCamera } from "../discovery/discoverCamera.js";
import type { CommandContext } from "./context.js";

export async function runDiscover(context: CommandContext): Promise<void> {
  const result = await discoverCamera({
    ...(context.host === undefined ? {} : { explicitHosts: [context.host] }),
    timeoutMs: context.timeoutMs,
    logger: context.logger,
  });
  if (result === undefined) {
    throw new Error("Camera MiVue nu a fost găsită. Verifică asocierea Wi-Fi și încearcă --host 192.72.1.1.");
  }

  if (context.json) {
    context.logger.info(JSON.stringify(result, null, 2));
    return;
  }
  context.logger.info("Camera MiVue detectată");
  context.logger.info(`  IP HTTP:  ${result.endpoint.host}:${result.endpoint.httpPort}`);
  context.logger.info(`  RTSP:     ${result.endpoint.host}:${result.endpoint.rtspPort} (port cunoscut; flux neconfirmat)`);
  context.logger.info(`  Latență:  ${result.latencyMs.toFixed(0)} ms`);
  if (result.server !== undefined) {
    context.logger.info(`  Server:   ${result.server}`);
  }
}
