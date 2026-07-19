import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { parseNmeaTelemetry, telemetryToGpx } from "../protocol/nmea.js";
import type { CommandContext } from "./context.js";

const MAX_NMEA_BYTES = 20 * 1024 * 1024;

export interface ExportGpxOptions {
  readonly inputPath: string;
  readonly outputPath?: string;
}

export async function runExportGpx(context: CommandContext, options: ExportGpxOptions): Promise<void> {
  const inputPath = resolve(options.inputPath);
  const details = await stat(inputPath);
  if (!details.isFile() || details.size > MAX_NMEA_BYTES) {
    throw new Error("Fișierul NMEA trebuie să fie un fișier local de maximum 20 MiB");
  }
  const raw = await readFile(inputPath, "utf8");
  const samples = parseNmeaTelemetry(raw);
  const defaultOutput = inputPath.slice(0, inputPath.length - extname(inputPath).length) + ".gpx";
  const outputPath = resolve(options.outputPath ?? defaultOutput);
  const gpx = telemetryToGpx(samples, basename(inputPath));
  await writeFile(outputPath, gpx, { encoding: "utf8", flag: "wx" });

  context.logger.info(`GPX creat: ${outputPath}`);
  context.logger.info(`Puncte GPS: ${samples.length}; interval UTC: ${samples[0]?.recordedAt} – ${samples.at(-1)?.recordedAt}`);
}
