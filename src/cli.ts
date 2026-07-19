import type { FileCategory } from "./protocol/types.js";

export type CommandName = "discover" | "info" | "list" | "download" | "gpx" | "web" | "help";

export interface CliOptions {
  readonly command: CommandName;
  readonly host?: string;
  readonly timeoutMs: number;
  readonly count: number;
  readonly from: number;
  readonly all: boolean;
  readonly summary: boolean;
  readonly category?: FileCategory;
  readonly remotePath?: string;
  readonly inputPath?: string;
  readonly outputPath?: string;
  readonly outputDirectory: string;
  readonly json: boolean;
  readonly debug: boolean;
  readonly port: number;
}

const categories = new Set<FileCategory>(["normal", "event", "parking", "photo", "unknown"]);

export function parseCli(argv: readonly string[]): CliOptions {
  const commandText = argv[0] ?? "help";
  const command: CommandName = commandText === "discover" || commandText === "info" || commandText === "list" || commandText === "download" || commandText === "gpx" || commandText === "web"
    ? commandText
    : commandText === "help" || commandText === "--help" || commandText === "-h"
      ? "help"
      : fail(`Comandă necunoscută: ${commandText}`);

  let host: string | undefined;
  let timeoutMs = 5_000;
  let count = 32;
  let from = 0;
  let all = false;
  let summary = false;
  let category: FileCategory | undefined;
  let remotePath: string | undefined;
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let outputDirectory = "downloads";
  let json = false;
  let debug = false;
  let port = 4_173;

  let firstOptionIndex = 1;
  if (command === "download" || command === "gpx") {
    const value = argv[1];
    if (value === undefined || value.startsWith("--")) fail(`Comanda ${command} necesită o cale`);
    if (command === "download") remotePath = value;
    else inputPath = value;
    firstOptionIndex = 2;
  }

  for (let index = firstOptionIndex; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (argument === "--json") json = true;
    else if (argument === "--debug") debug = true;
    else if (argument === "--all") all = true;
    else if (argument === "--summary") summary = true;
    else if (argument === "--host") host = requiredValue(argv, ++index, "--host");
    else if (argument === "--timeout") timeoutMs = positiveInteger(requiredValue(argv, ++index, "--timeout"), "--timeout");
    else if (argument === "--port") port = positiveInteger(requiredValue(argv, ++index, "--port"), "--port");
    else if (argument === "--count") count = positiveInteger(requiredValue(argv, ++index, "--count"), "--count");
    else if (argument === "--from") from = nonNegativeInteger(requiredValue(argv, ++index, "--from"), "--from");
    else if (argument === "--output") {
      const value = requiredValue(argv, ++index, "--output");
      if (command === "gpx") outputPath = value;
      else outputDirectory = value;
    }
    else if (argument === "--category") {
      const value = requiredValue(argv, ++index, "--category").toLowerCase() as FileCategory;
      if (!categories.has(value)) fail(`Categorie invalidă: ${value}`);
      category = value;
    } else if (argument === "--help" || argument === "-h") {
      return { command: "help", timeoutMs, count, from, all, summary, outputDirectory, json, debug, port };
    } else {
      fail(`Opțiune necunoscută: ${argument}`);
    }
  }

  if (all && from !== 0) fail("--all nu poate fi combinat cu --from");

  return {
    command,
    ...(host === undefined ? {} : { host }),
    timeoutMs,
    count,
    from,
    all,
    summary,
    ...(category === undefined ? {} : { category }),
    ...(remotePath === undefined ? {} : { remotePath }),
    ...(inputPath === undefined ? {} : { inputPath }),
    ...(outputPath === undefined ? {} : { outputPath }),
    outputDirectory,
    json,
    debug,
    port,
  };
}

export const usage = `MiVue 866 CLI — client read-only experimental

Utilizare:
  npm run dev -- discover [--host 192.72.1.1] [--debug]
  npm run dev -- info [--host 192.72.1.1] [--json]
  npm run dev -- list [--host 192.72.1.1] [--count 32] [--from 0 | --all]
                     [--category normal|event|parking|photo] [--summary] [--json]
  npm run dev -- download <cale-remote> [--host 192.72.1.1]
                         [--output ./downloads]
  npm run dev -- gpx <fișier.NMEA> [--output traseu.gpx]
  npm run dev -- web [--host 192.72.1.1] [--port 4173]

Opțiuni comune:
  --host <ip>       Folosește direct IP-ul camerei
  --timeout <ms>    Timeout per cerere (implicit 5000)
  --json            Output JSON
  --debug           Logging de diagnostic
`;

function requiredValue(argv: readonly string[], index: number, option: string): string {
  return argv[index] ?? fail(`Lipsește valoarea pentru ${option}`);
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) fail(`${option} trebuie să fie un număr întreg pozitiv`);
  return parsed;
}

function nonNegativeInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) fail(`${option} trebuie să fie un număr întreg >= 0`);
  return parsed;
}

function fail(message: string): never {
  throw new Error(message);
}
