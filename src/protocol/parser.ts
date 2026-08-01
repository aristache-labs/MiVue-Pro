import type { CameraPosition, ConfigResponse, FileCategory, FileListResponse, RemoteFile } from "./types.js";

export class ProtocolParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolParseError";
  }
}

export function parseConfigResponse(raw: string): ConfigResponse {
  const lines = raw.replaceAll("\r", "").split("\n");
  while (lines.at(-1) === "") {
    lines.pop();
  }

  const codeText = lines[0];
  const message = lines[1];
  if (codeText === undefined || message === undefined || !/^-?\d+$/.test(codeText.trim())) {
    throw new ProtocolParseError("Invalid MiVue config response");
  }

  const properties: Record<string, string> = {};
  for (const line of lines.slice(2)) {
    const separator = line.indexOf("=");
    if (separator >= 0) {
      properties[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }

  return {
    code: Number.parseInt(codeText, 10),
    message: message.trim(),
    properties,
    raw,
  };
}

/** Parse one named value from the XML aggregate returned by Camera.Menu.Property. */
export function parseMenuPropertyValue(raw: string, property: string): string | undefined {
  if (!/^[A-Za-z0-9_.-]+$/u.test(property)) {
    throw new ProtocolParseError("Invalid camera menu property name");
  }
  if (!/<camera\b/iu.test(raw)) {
    throw new ProtocolParseError("Invalid camera menu property XML");
  }

  const escaped = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const directElement = raw.match(
    new RegExp(`<${escaped}\\b[^>]*>([^<]*)<\\/${escaped}>`, "iu"),
  )?.[1];
  if (directElement !== undefined) return decodeXml(directElement.trim());

  for (const tag of raw.matchAll(/<[^>]+>/gu)) {
    if (!tag[0].includes(property)) continue;
    const value = tag[0].match(/\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)')/iu);
    const captured = value?.[1] ?? value?.[2];
    if (captured !== undefined) return decodeXml(captured.trim());
  }

  const assignment = raw.match(
    new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s<>"']+))`, "iu"),
  );
  const assigned = assignment?.[1] ?? assignment?.[2] ?? assignment?.[3];
  if (assigned !== undefined) return decodeXml(assigned.trim());

  const markerIndex = raw.indexOf(property);
  if (markerIndex >= 0) {
    const nearby = raw.slice(markerIndex, markerIndex + 1024);
    const nested = nearby.match(/<value\b[^>]*>([^<]*)<\/value>/iu)?.[1];
    if (nested !== undefined) return decodeXml(nested.trim());
  }
  return undefined;
}

export function parseFileListXml(raw: string): FileListResponse {
  if (!/<(?:DCIM(?:\$\*)?|Normal|Event|Parking|Photo)(?:\s|>)/i.test(raw)) {
    throw new ProtocolParseError("Response does not contain a supported MiVue file-list document");
  }

  const files: RemoteFile[] = [];
  for (const match of raw.matchAll(/<file>([\s\S]*?)<\/file>/gi)) {
    const block = match[1];
    if (block === undefined) {
      continue;
    }

    const path = requiredTag(block, "name");
    const sizeBytes = parseNonNegativeInteger(requiredTag(block, "size"), "size");
    const recordedAt = requiredTag(block, "time");
    const attr = optionalTag(block, "attr") ?? "";
    const formatMatch = block.match(/<format\b([^>]*)>([\s\S]*?)<\/format>/i);
    const attributes = formatMatch?.[1] ?? "";
    const mediaFormat = decodeXml(formatMatch?.[2]?.trim() ?? "UNKNOWN");
    const resolution = optionalAttribute(attributes, "size");
    const fps = optionalNumber(optionalAttribute(attributes, "fps"));
    const durationSeconds = optionalNumber(optionalAttribute(attributes, "time"));

    files.push({
      path,
      name: path.split("/").at(-1) ?? path,
      category: categoryFromPath(path),
      camera: cameraFromPath(path),
      mediaFormat,
      ...(resolution === undefined ? {} : { resolution }),
      ...(fps === undefined ? {} : { fps }),
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
      sizeBytes,
      writable: attr.toUpperCase().includes("W"),
      recordedAt,
    });
  }

  const amountText = optionalTag(raw, "amount");
  const amount = amountText === undefined ? files.length : parseNonNegativeInteger(amountText, "amount");
  return { files, amount, raw };
}

function requiredTag(block: string, tag: string): string {
  const value = optionalTag(block, tag);
  if (value === undefined) {
    throw new ProtocolParseError(`Missing <${tag}> in file entry`);
  }
  return value;
}

function optionalTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] === undefined ? undefined : decodeXml(match[1].trim());
}

function optionalAttribute(attributes: string, name: string): string | undefined {
  const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match?.[1] === undefined ? undefined : decodeXml(match[1]);
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function parseNonNegativeInteger(value: string, field: string): number {
  if (!/^\d+$/.test(value)) {
    throw new ProtocolParseError(`Invalid ${field}: ${value}`);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed)) {
    throw new ProtocolParseError(`${field} exceeds JavaScript's safe integer range`);
  }
  return parsed;
}

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function categoryFromPath(path: string): FileCategory {
  const normalized = path.toLowerCase();
  if (normalized.includes("/normal/")) return "normal";
  if (normalized.includes("/event/")) return "event";
  if (normalized.includes("/parking/")) return "parking";
  if (normalized.includes("/photo/")) return "photo";
  return "unknown";
}

function cameraFromPath(path: string): CameraPosition {
  const normalized = path.toLowerCase();
  if (normalized.includes("/incabin/") || normalized.includes("/i/")) return "incabin";
  if (normalized.includes("/f/") || /f\.[^.]+$/i.test(path)) return "front";
  if (normalized.includes("/r/") || /r\.[^.]+$/i.test(path)) return "rear";
  return "unknown";
}
