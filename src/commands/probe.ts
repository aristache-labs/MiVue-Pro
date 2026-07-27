import { discoverCamera } from "../discovery/discoverCamera.js";
import {
  buildCgiPath,
  deleteRemoteFile,
  FORMAT_SD_STATUS_PROPERTY,
  FORMAT_SD_WIRE_PROPERTY,
  FORMAT_SD_WIRE_VALUE,
  formatSdCard,
  probeCgi,
  setCameraProperty,
  truncateBody,
} from "../protocol/cameraMutate.js";
import { createClient, endpointForHost } from "./shared.js";
import type { CommandContext } from "./context.js";

export type ProbeAction = "get" | "set" | "del" | "format";

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
    const property = options.property ?? "Flicker";
    const value = options.value ?? "50Hz";
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

  if (options.action === "format") {
    const path = buildCgiPath("set", {
      property: FORMAT_SD_WIRE_PROPERTY,
      value: FORMAT_SD_WIRE_VALUE,
    });
    /** Full cards / many files can keep CGI open for minutes; never retry SET. */
    const formatTimeoutMs = Math.max(context.timeoutMs, 300_000);
    context.logger.info(
      `Format SD (destructive): GET ${path} după pre-check ${FORMAT_SD_STATUS_PROPERTY} (timeout ${formatTimeoutMs} ms)`,
    );
    if (options.dryRun || !options.confirm) {
      context.logger.info("Dry-run format: nicio mutație trimisă.");
      context.logger.info(
        "Pentru formatare reală pe o cameră deținută legal: adaugă --confirm (și evită --dry-run).",
      );
      const pre = await probeCgi(transport, "get", { property: FORMAT_SD_STATUS_PROPERTY });
      logProbe(context, pre);
      return;
    }
    const formatClient = createClient(endpoint, { ...context, timeoutMs: formatTimeoutMs });
    const result = await formatSdCard(formatClient.getTransport());
    logProbe(context, result);
    context.logger.info(`  outcome: ${result.outcome}`);
    if (result.preStatus !== undefined) context.logger.info(`  pre SD0: ${result.preStatus}`);
    if (result.postStatus !== undefined) context.logger.info(`  post SD0: ${result.postStatus}`);
    if (result.outcome === "unknown") {
      context.logger.info(
        "Rezultat necunoscut — nu repeta --confirm. Verifică pe cameră / list / GET Camera.Menu.SD0.",
      );
    }
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
