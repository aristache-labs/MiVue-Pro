import { requireNativeModule, type EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";

import {
  buildSpikeCameraFileUrl,
  isPrivateIpv4,
  redactSpikeUrlForLog,
} from "./urlHelpers";

export type SpikePhase =
  | "idle"
  | "starting"
  | "downloading"
  | "waiting_for_connectivity"
  | "completed"
  | "failed"
  | "cancelled";

export type SpikeEventPayload = {
  readonly phase: SpikePhase | string;
  readonly ts?: string;
  readonly sessionIdentifier?: string;
  readonly nativeTaskId?: number;
  readonly urlRedacted?: string;
  readonly destinationPath?: string;
  readonly expectedBytes?: number;
  readonly bytesWritten?: number;
  readonly partBytes?: number;
  readonly totalBytesExpectedToWrite?: number;
  readonly httpStatus?: number;
  readonly contentLength?: number | null;
  readonly acceptRanges?: string | null;
  readonly safeResponseHeaders?: Record<string, string>;
  readonly message?: string;
  readonly urlErrorCode?: number;
  readonly restoredTaskCount?: number;
  readonly restoredTaskState?: string;
};

export type StartSpikeDownloadInput = {
  readonly url: string;
  readonly destinationPath: string;
  readonly expectedBytes?: number;
};

type SpikeNativeModule = {
  isNativeAvailable(): Promise<boolean>;
  startDownload(options: StartSpikeDownloadInput): Promise<SpikeEventPayload>;
  cancel(): Promise<SpikeEventPayload>;
  getActiveTask(): Promise<SpikeEventPayload>;
  restoreSession(): Promise<SpikeEventPayload>;
  getSessionIdentifier(): string;
  addListener(
    eventName: string,
    listener: (event: SpikeEventPayload) => void,
  ): EventSubscription;
};

const SESSION_ID = "app.laneory.mobile.bg-download-spike";

let native: SpikeNativeModule | null | undefined;

function getNative(): SpikeNativeModule | null {
  if (native !== undefined) return native;
  if (Platform.OS !== "ios") {
    native = null;
    return native;
  }
  try {
    native = requireNativeModule<SpikeNativeModule>("BackgroundDownloadSpike");
  } catch {
    native = null;
  }
  return native;
}

/** True only on iOS development builds that include this native module. */
export function isBackgroundDownloadSpikeAvailable(): boolean {
  return getNative() !== null;
}

export function getBackgroundDownloadSpikeSessionId(): string {
  const mod = getNative();
  try {
    return mod?.getSessionIdentifier() ?? SESSION_ID;
  } catch {
    return SESSION_ID;
  }
}

export async function startBackgroundDownloadSpike(
  input: StartSpikeDownloadInput,
): Promise<SpikeEventPayload> {
  const mod = getNative();
  if (!mod) {
    throw new Error("Background download spike requires an iOS development build (not Expo Go).");
  }
  return mod.startDownload(input);
}

export async function cancelBackgroundDownloadSpike(): Promise<SpikeEventPayload> {
  const mod = getNative();
  if (!mod) {
    return { phase: "idle", message: "Native module unavailable" };
  }
  return mod.cancel();
}

export async function getBackgroundDownloadSpikeTask(): Promise<SpikeEventPayload> {
  const mod = getNative();
  if (!mod) {
    return { phase: "idle", message: "Native module unavailable" };
  }
  return mod.getActiveTask();
}

export async function restoreBackgroundDownloadSpikeSession(): Promise<SpikeEventPayload> {
  const mod = getNative();
  if (!mod) {
    return { phase: "idle", message: "Native module unavailable" };
  }
  return mod.restoreSession();
}

export function addBackgroundDownloadSpikeListener(
  listener: (event: SpikeEventPayload) => void,
): EventSubscription | { remove: () => void } {
  const mod = getNative();
  if (!mod) {
    return { remove: () => undefined };
  }
  return mod.addListener("onSpikeEvent", listener);
}

export { buildSpikeCameraFileUrl, isPrivateIpv4, redactSpikeUrlForLog };

export default {
  isBackgroundDownloadSpikeAvailable,
  startBackgroundDownloadSpike,
  cancelBackgroundDownloadSpike,
  getBackgroundDownloadSpikeTask,
  restoreBackgroundDownloadSpikeSession,
  addBackgroundDownloadSpikeListener,
  buildSpikeCameraFileUrl,
};
