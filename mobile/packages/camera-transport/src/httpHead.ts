export interface ParsedHttpHead {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly bodyOffset: number;
  readonly contentLength?: number;
}

export function tryParseHttpHead(buffer: Uint8Array): ParsedHttpHead | undefined {
  const delimiter = indexOfCrLfCrLf(buffer);
  return delimiter < 0 ? undefined : parseHttpHead(buffer, delimiter);
}

export function parseHttpHead(buffer: Uint8Array, delimiter = indexOfCrLfCrLf(buffer)): ParsedHttpHead {
  if (delimiter < 0) {
    throw new Error("Invalid HTTP response: missing header terminator");
  }
  const headerText = new TextDecoder("latin1").decode(buffer.subarray(0, delimiter));
  const lines = headerText.split("\r\n");
  const statusMatch = lines[0]?.match(/^HTTP\/\d\.\d\s+(\d{3})\b/);
  if (statusMatch?.[1] === undefined) {
    throw new Error("Invalid HTTP status line");
  }
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
    }
  }
  const contentLengthText = headers["content-length"];
  const contentLength =
    contentLengthText !== undefined && /^\d+$/.test(contentLengthText)
      ? Number.parseInt(contentLengthText, 10)
      : undefined;
  return {
    statusCode: Number.parseInt(statusMatch[1], 10),
    headers,
    bodyOffset: delimiter + 4,
    ...(contentLength === undefined ? {} : { contentLength }),
  };
}

function indexOfCrLfCrLf(buffer: Uint8Array): number {
  for (let i = 0; i + 3 < buffer.length; i += 1) {
    if (buffer[i] === 13 && buffer[i + 1] === 10 && buffer[i + 2] === 13 && buffer[i + 3] === 10) {
      return i;
    }
  }
  return -1;
}
