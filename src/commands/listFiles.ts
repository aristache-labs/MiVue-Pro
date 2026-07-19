import { discoverCamera } from "../discovery/discoverCamera.js";
import type { FileCategory, RemoteFile } from "../protocol/types.js";
import { createClient, endpointForHost } from "./shared.js";
import type { CommandContext } from "./context.js";

export interface ListCommandOptions {
  readonly count: number;
  readonly from: number;
  readonly all: boolean;
  readonly summary: boolean;
  readonly category?: FileCategory;
}

export async function runList(context: CommandContext, options: ListCommandOptions): Promise<void> {
  const endpoint = context.host === undefined
    ? (await discoverCamera({ timeoutMs: context.timeoutMs, logger: context.logger }))?.endpoint
    : endpointForHost(context.host);
  if (endpoint === undefined) {
    throw new Error("Camera MiVue nu a fost găsită.");
  }

  const client = createClient(endpoint, context);
  const result = options.all
      ? await client.listAllFiles({
        pageSize: options.count,
        ...(options.category === undefined || options.category === "unknown"
          ? {}
          : { categories: [options.category] }),
        onPage: (page) => context.logger.debug(
          `Pagina ${page.pageNumber}: categorie=${page.category}, from=${page.from}, primite=${page.received}, total=${page.total}`,
        ),
      })
    : {
        ...(await client.listFiles({
          count: options.count,
          from: options.from,
          ...(options.category === undefined || options.category === "unknown" ? {} : { category: options.category }),
        })),
        pages: 1,
        truncated: false,
      };
  const files = options.category === undefined || (options.category !== "unknown" && options.all)
    ? result.files
    : result.files.filter((file) => file.category === options.category);
  const categories = categorySummary(result.files);

  if (context.json) {
    context.logger.info(JSON.stringify(
      options.summary
        ? { amount: result.amount, pages: result.pages, truncated: result.truncated, categories }
        : { amount: result.amount, pages: result.pages, truncated: result.truncated, files },
      null,
      2,
    ));
    return;
  }

  context.logger.info(`Fișiere primite: ${result.amount}; pagini: ${result.pages}; afișate: ${files.length}`);
  context.logger.info(
    `Categorii: normal=${categories.normal}, event=${categories.event}, parking=${categories.parking}, photo=${categories.photo}, unknown=${categories.unknown}`,
  );
  if (result.truncated) context.logger.info("Atenție: listarea a atins limita internă de siguranță.");
  if (options.summary) return;
  if (files.length === 0) {
    context.logger.info("Nu există rezultate în pagina și filtrul selectate.");
    return;
  }

  context.logger.info(formatTable(files));
}

function categorySummary(files: readonly RemoteFile[]): Record<FileCategory, number> {
  const counts: Record<FileCategory, number> = { normal: 0, event: 0, parking: 0, photo: 0, unknown: 0 };
  for (const file of files) counts[file.category] += 1;
  return counts;
}

function formatTable(files: readonly RemoteFile[]): string {
  const rows = files.map((file) => ({
    category: file.category,
    camera: file.camera,
    recordedAt: file.recordedAt,
    duration: file.durationSeconds === undefined ? "-" : `${file.durationSeconds.toFixed(1)}s`,
    size: formatBytes(file.sizeBytes),
    name: file.name,
  }));
  const headers = { category: "Categorie", camera: "Cameră", recordedAt: "Dată", duration: "Durată", size: "Mărime", name: "Fișier" };
  const keys = Object.keys(headers) as (keyof typeof headers)[];
  const widths = Object.fromEntries(
    keys.map((key) => [key, Math.max(headers[key].length, ...rows.map((row) => row[key].length))]),
  ) as Record<keyof typeof headers, number>;
  const line = (row: Record<keyof typeof headers, string>): string =>
    keys.map((key) => row[key].padEnd(widths[key])).join("  ");
  return [line(headers), line(Object.fromEntries(keys.map((key) => [key, "-".repeat(widths[key])])) as Record<keyof typeof headers, string>), ...rows.map(line)].join("\n");
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
