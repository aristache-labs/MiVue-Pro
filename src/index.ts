#!/usr/bin/env node
import { parseCli, usage } from "./cli.js";
import { runDiscover } from "./commands/discover.js";
import { runDownload } from "./commands/download.js";
import { runExportGpx } from "./commands/exportGpx.js";
import { runInfo } from "./commands/info.js";
import { runList } from "./commands/listFiles.js";
import { runProbe } from "./commands/probe.js";
import { runWeb } from "./commands/web.js";
import type { CommandContext } from "./commands/context.js";
import { createLogger } from "./utils/logger.js";

async function main(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  const logger = createLogger(options.debug);
  if (options.command === "help") {
    logger.info(usage);
    return;
  }

  const context: CommandContext = {
    ...(options.host === undefined ? {} : { host: options.host }),
    timeoutMs: options.timeoutMs,
    json: options.json,
    logger,
  };

  if (options.command === "discover") await runDiscover(context);
  else if (options.command === "info") await runInfo(context);
  else if (options.command === "list") {
    await runList(context, {
      count: options.count,
      from: options.from,
      all: options.all,
      summary: options.summary,
      ...(options.category === undefined ? {} : { category: options.category }),
    });
  } else if (options.command === "download") {
    if (options.remotePath === undefined) throw new Error("Lipsește calea remote pentru download");
    await runDownload(context, {
      remotePath: options.remotePath,
      outputDirectory: options.outputDirectory,
    });
  } else if (options.command === "gpx") {
    if (options.inputPath === undefined) throw new Error("Lipsește fișierul NMEA");
    await runExportGpx(context, {
      inputPath: options.inputPath,
      ...(options.outputPath === undefined ? {} : { outputPath: options.outputPath }),
    });
  } else if (options.command === "web") {
    await runWeb(context, options.port);
  } else if (options.command === "probe") {
    if (options.probeAction === undefined) throw new Error("Lipsește acțiunea probe");
    await runProbe(context, {
      action: options.probeAction,
      dryRun: options.dryRun,
      confirm: options.confirm,
      ...(options.probeProperty === undefined ? {} : { property: options.probeProperty }),
      ...(options.probeValue === undefined ? {} : { value: options.probeValue }),
      ...(options.remotePath === undefined ? {} : { remotePath: options.remotePath }),
    });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Eroare: ${message}\n`);
  process.exitCode = 1;
});
