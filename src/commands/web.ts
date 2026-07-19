import { resolve } from "node:path";
import { discoverCamera } from "../discovery/discoverCamera.js";
import { CameraService } from "../web/cameraService.js";
import { createDashboardServer } from "../web/server.js";
import type { CommandContext } from "./context.js";
import { endpointForHost } from "./shared.js";

export async function runWeb(context: CommandContext, port: number): Promise<void> {
  const endpoint = context.host === undefined
    ? (await discoverCamera({ timeoutMs: context.timeoutMs, logger: context.logger }))?.endpoint
    : endpointForHost(context.host);
  if (endpoint === undefined) throw new Error("Camera MiVue nu a fost găsită");

  const downloadsDirectory = resolve("downloads");
  const service = new CameraService(endpoint, downloadsDirectory, context.logger, context.timeoutMs);
  const server = createDashboardServer({ service, logger: context.logger });
  await new Promise<void>((resolveListening, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolveListening());
  });
  context.logger.info(`MiVue Dashboard: http://127.0.0.1:${port}`);
  context.logger.info("Serverul ascultă numai local. Ctrl+C îl oprește.");
}
