import * as FileSystem from "expo-file-system/legacy";

import { parseNmeaTelemetry, type GpsSample } from "@/packages/parsers/src/index";

export async function loadSiblingNmea(mediaUri: string): Promise<readonly GpsSample[] | undefined> {
  const nmeaUri = mediaUri.replace(/\.[^.]+$/u, ".NMEA");
  if (nmeaUri === mediaUri) return undefined;
  try {
    const info = await FileSystem.getInfoAsync(nmeaUri);
    if (!info.exists) return undefined;
    const raw = await FileSystem.readAsStringAsync(nmeaUri);
    return parseNmeaTelemetry(raw);
  } catch {
    return undefined;
  }
}
