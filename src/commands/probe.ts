import { discoverCamera } from "../discovery/discoverCamera.js";
import {
  buildCgiPath,
  deleteRemoteFile,
  probeCgi,
  setCameraProperty,
  truncateBody,
} from "../protocol/cameraMutate.js";
import { createClient, endpointForHost } from "./shared.js";
import type { CommandContext } from "./context.js";

export type ProbeAction = "get" | "set" | "del";

export interface ProbeOptions {
  readonly action: ProbeAction;
  readonly property?: string;
  readonly value?: string;
  readonly remotePath?: string;
  readonly dryRun: boolean;
  readonly confirm: boolean;
}

export async function runProbe(context: CommandContext, options: ProbeOptions): Promise<void> {
  const endpoint = context.host === undefined
    ? (await discoverCamera({ timeoutMs: context.timeoutMs, logger: context.logger }))?.endpoint
    : endpointForHost(context.host);
  if (endpoint === undefined) {
    throw new Error("Camera MiVue nu a fost găsită.");
  }

  const client = createClient(endpoint, context);
  const transport = client.getTransport();

  if (options.action === "get") {
    const property = options.property ?? "status";
    const result = await probeCgi(transport, "get", { property });
    logProbe(context, result);
    return;
  }

  if (options.action === "set") {
    const property = options.property ?? "Camera.Menu.UIMode";
    const value = options.value ?? "MENU";
    const path = buildCgiPath("set", { property, value });
    if (options.dryRun || !options.confirm) {
      context.logger.info(`Dry-run set: GET ${path}`);
      context.logger.info("Pentru execuție: adaugă --confirm (și evită --dry-run).");
      return;
    }
    const result = await setCameraProperty(transport, property, value);
    logProbe(context, result);
    return;
  }

  if (options.action === "del") {
    const remotePath = options.remotePath;
    if (remotePath === undefined) throw new Error("del necesită --path /SD/...");
    const head = await client.headFile(remotePath);
    context.logger.info(`HEAD ${remotePath}: HTTP ${head.statusCode}`);
    if (head.statusCode < 200 || head.statusCode >= 300) {
      throw new Error(`Fișierul nu răspunde la HEAD (HTTP ${head.statusCode})`);
    }
    const path = buildCgiPath("del", { property: remotePath });
    if (options.dryRun || !options.confirm) {
      context.logger.info(`Dry-run del: GET ${path}`);
      context.logger.info("Pentru ștergere reală: adaugă --confirm (un singur fișier de test).");
      return;
    }
    const result = await deleteRemoteFile(transport, remotePath);
    logProbe(context, result);
    const after = await client.headFile(remotePath).catch(() => null);
    context.logger.info(
      after === null
        ? "Verificare post-del: HEAD a eșuat (posibil șters)."
        : `Verificare post-del: HEAD HTTP ${after.statusCode}`,
    );
    return;
  }

  throw new Error(`Acțiune probe necunoscută: ${options.action}`);
}

function logProbe(
  context: CommandContext,
  result: { path: string; statusCode: number; bodyText: string; parsed?: { code: number; message: string } },
): void {
  if (context.json) {
    context.logger.info(JSON.stringify(result, null, 2));
    return;
  }
  context.logger.info(`CGI ${result.path}`);
  context.logger.info(`  HTTP ${result.statusCode}`);
  if (result.parsed !== undefined) {
    context.logger.info(`  ${result.parsed.code} ${result.parsed.message}`);
  }
  context.logger.info(`  body: ${truncateBody(result.bodyText, 300)}`);
}
