import type { GpsSample } from "./types";

const GPX_CREATOR = "[NUMELE_APLICAȚIEI]";
const GPX_NS = "https://example.invalid/app";

export class NmeaParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NmeaParseError";
  }
}

export function parseNmeaTelemetry(raw: string): readonly GpsSample[] {
  const lines = raw.replaceAll("\r", "").split("\n").filter(Boolean);
  const altitudeByTime = new Map<string, number>();

  for (const line of lines) {
    if (!line.startsWith("$GPGGA,")) continue;
    assertChecksum(line);
    const fields = sentenceFields(line);
    const time = fields[1];
    const fixQuality = fields[6];
    const altitude = Number(fields[9]);
    if (time !== undefined && fixQuality !== "0" && Number.isFinite(altitude)) {
      altitudeByTime.set(time, altitude);
    }
  }

  const samples: GpsSample[] = [];
  for (const line of lines) {
    if (!line.startsWith("$GPRMC,")) continue;
    assertChecksum(line);
    const fields = sentenceFields(line);
    if (fields[2] !== "A") continue;
    const time = required(fields[1], "RMC time");
    const date = required(fields[9], "RMC date");
    const latitude = coordinate(required(fields[3], "latitude"), fields[4], 2);
    const longitude = coordinate(required(fields[5], "longitude"), fields[6], 3);
    const speedKnots = finiteNumber(fields[7] ?? "0", "speed");
    const course = optionalFiniteNumber(fields[8]);
    const altitudeMeters = altitudeByTime.get(time);
    samples.push({
      recordedAt: nmeaDateTime(date, time),
      latitude,
      longitude,
      ...(altitudeMeters === undefined ? {} : { altitudeMeters }),
      speedKmh: speedKnots * 1.852,
      ...(course === undefined ? {} : { courseDegrees: course }),
    });
  }

  if (samples.length === 0) throw new NmeaParseError("NMEA file contains no valid active GPRMC samples");
  return samples;
}

export function telemetryToGpx(samples: readonly GpsSample[], name: string): string {
  if (samples.length === 0) throw new NmeaParseError("Cannot create GPX without samples");
  const points = samples
    .map((sample) => {
      const elevation = sample.altitudeMeters === undefined ? "" : `\n        <ele>${sample.altitudeMeters}</ele>`;
      const course =
        sample.courseDegrees === undefined
          ? ""
          : `\n          <app:courseDegrees>${sample.courseDegrees}</app:courseDegrees>`;
      return `      <trkpt lat="${sample.latitude}" lon="${sample.longitude}">${elevation}
        <time>${escapeXml(sample.recordedAt)}</time>
        <extensions>
          <app:speedKmh>${sample.speedKmh.toFixed(3)}</app:speedKmh>${course}
        </extensions>
      </trkpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${GPX_CREATOR}" xmlns="http://www.topografix.com/GPX/1/1" xmlns:app="${GPX_NS}">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

function sentenceFields(line: string): string[] {
  return line.slice(0, line.indexOf("*") >= 0 ? line.indexOf("*") : undefined).split(",");
}

function assertChecksum(line: string): void {
  const star = line.indexOf("*");
  if (star < 0) return;
  const expected = line.slice(star + 1).trim().toUpperCase();
  let checksum = 0;
  for (const char of line.slice(1, star)) checksum ^= char.charCodeAt(0);
  if (expected !== checksum.toString(16).toUpperCase().padStart(2, "0")) {
    throw new NmeaParseError("Invalid NMEA checksum");
  }
}

function coordinate(value: string, hemisphere: string | undefined, degreeDigits: number): number {
  if (value.length <= degreeDigits) throw new NmeaParseError("Invalid NMEA coordinate");
  const degrees = finiteNumber(value.slice(0, degreeDigits), "coordinate degrees");
  const minutes = finiteNumber(value.slice(degreeDigits), "coordinate minutes");
  if (minutes >= 60) throw new NmeaParseError("Invalid NMEA coordinate minutes");
  const sign = hemisphere === "S" || hemisphere === "W" ? -1 : 1;
  if (hemisphere !== "N" && hemisphere !== "S" && hemisphere !== "E" && hemisphere !== "W") {
    throw new NmeaParseError("Invalid NMEA hemisphere");
  }
  return sign * (degrees + minutes / 60);
}

function nmeaDateTime(date: string, time: string): string {
  if (!/^\d{6}$/.test(date) || !/^\d{6}(?:\.\d+)?$/.test(time)) {
    throw new NmeaParseError("Invalid NMEA date or time");
  }
  const day = Number(date.slice(0, 2));
  const month = Number(date.slice(2, 4));
  const year = 2000 + Number(date.slice(4, 6));
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(2, 4));
  const second = Number(time.slice(4));
  const milliseconds = Math.round((second % 1) * 1000);
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute, Math.floor(second), milliseconds));
  if (instant.getUTCFullYear() !== year || instant.getUTCMonth() !== month - 1 || instant.getUTCDate() !== day) {
    throw new NmeaParseError("Invalid NMEA calendar date");
  }
  return instant.toISOString();
}

function finiteNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new NmeaParseError(`Invalid NMEA ${field}`);
  return parsed;
}

function optionalFiniteNumber(value: string | undefined): number | undefined {
  return value === undefined || value === "" ? undefined : finiteNumber(value, "number");
}

function required(value: string | undefined, field: string): string {
  if (value === undefined || value === "") throw new NmeaParseError(`Missing ${field}`);
  return value;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
