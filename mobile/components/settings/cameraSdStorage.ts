import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";

/**
 * Camera SD capacity model (read-only).
 *
 * Live CGI for total/free capacity is **not** camera-confirmed in docs/protocol.md
 * yet — production UI must not invent endpoints. Demo Mode supplies deterministic
 * bytes through the same helpers.
 */

export type CameraSdStorageKind =
  | "ready"
  | "loading"
  | "refreshing"
  | "disconnected"
  | "unavailable"
  | "no_card"
  | "error";

export interface CameraSdRawBytes {
  readonly totalBytes?: number;
  readonly freeBytes?: number;
  readonly availableBytes?: number;
  readonly usedBytes?: number;
}

export interface CameraSdUsage {
  readonly totalBytes: number;
  readonly usedBytes: number;
  readonly availableBytes: number;
  /** Integer 0–100. */
  readonly usedPercent: number;
}

export interface CameraSdStorageView {
  readonly kind: CameraSdStorageKind;
  readonly usage: CameraSdUsage | null;
  readonly primaryLabel: string;
  readonly secondaryLabel: string | null;
  readonly percentLabel: string | null;
  readonly accessibilityLabel: string;
  readonly errorMessage?: string;
  readonly lastKnownAt?: string;
}

/** ~59.5 GiB usable / ~22.4 GiB used — realistic formatted Demo Mode values. */
export const DEMO_CAMERA_SD_RAW: CameraSdRawBytes = Object.freeze({
  totalBytes: Math.round(59.5 * 1024 * 1024 * 1024),
  usedBytes: Math.round(22.4 * 1024 * 1024 * 1024),
});

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/** Bytes formatter that allows a confirmed zero (`0 B`). */
export function formatSdStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  return formatMediaSizeMbGb(bytes);
}

/**
 * Normalize camera-reported bytes into a safe usage snapshot.
 * Returns null when total is missing/invalid (cannot show a meaningful bar).
 */
export function normalizeCameraSdUsage(raw: CameraSdRawBytes): CameraSdUsage | null {
  if (!isFiniteNonNegative(raw.totalBytes) || raw.totalBytes <= 0) {
    return null;
  }
  const totalBytes = raw.totalBytes;

  let availableBytes: number | undefined;
  if (isFiniteNonNegative(raw.availableBytes)) {
    availableBytes = raw.availableBytes;
  } else if (isFiniteNonNegative(raw.freeBytes)) {
    availableBytes = raw.freeBytes;
  }

  let usedBytes: number | undefined;
  if (isFiniteNonNegative(raw.usedBytes)) {
    usedBytes = raw.usedBytes;
  } else if (availableBytes !== undefined) {
    usedBytes = totalBytes - availableBytes;
  }

  if (usedBytes === undefined) {
    return null;
  }

  usedBytes = Math.min(totalBytes, Math.max(0, usedBytes));
  if (availableBytes === undefined) {
    availableBytes = totalBytes - usedBytes;
  }
  availableBytes = Math.min(totalBytes, Math.max(0, availableBytes));

  // Prefer derived available from clamped used when both were supplied inconsistently.
  if (usedBytes + availableBytes !== totalBytes) {
    availableBytes = totalBytes - usedBytes;
  }

  const usedPercent =
    totalBytes === 0 ? 0 : Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100)));

  return {
    totalBytes,
    usedBytes,
    availableBytes,
    usedPercent,
  };
}

export function cameraSdUsedOfTotalLabel(usage: CameraSdUsage): string {
  return `${formatSdStorageBytes(usage.usedBytes)} used of ${formatSdStorageBytes(usage.totalBytes)}`;
}

export function cameraSdAvailableLabel(usage: CameraSdUsage): string {
  return `${formatSdStorageBytes(usage.availableBytes)} available`;
}

export function cameraSdPercentLabel(usage: CameraSdUsage): string {
  return `${usage.usedPercent}%`;
}

export function cameraSdAccessibilityValue(usage: CameraSdUsage): string {
  return `${formatSdStorageBytes(usage.usedBytes)} used of ${formatSdStorageBytes(usage.totalBytes)}, ${formatSdStorageBytes(usage.availableBytes)} available`;
}

export function presentCameraSdStorage(options: {
  readonly kind: CameraSdStorageKind;
  readonly raw?: CameraSdRawBytes | null;
  readonly errorMessage?: string;
  readonly lastKnownAt?: string;
}): CameraSdStorageView {
  const { kind, raw, errorMessage, lastKnownAt } = options;

  if (kind === "disconnected") {
    return {
      kind,
      usage: null,
      primaryLabel: "Connect to the camera to view SD card usage",
      secondaryLabel: null,
      percentLabel: null,
      accessibilityLabel: "Camera SD card storage. Connect to the camera to view SD card usage",
    };
  }

  if (kind === "loading") {
    return {
      kind,
      usage: null,
      primaryLabel: "Reading camera storage…",
      secondaryLabel: null,
      percentLabel: null,
      accessibilityLabel: "Camera SD card storage. Reading camera storage",
    };
  }

  if (kind === "no_card") {
    return {
      kind,
      usage: null,
      primaryLabel: "No SD card detected",
      secondaryLabel: null,
      percentLabel: null,
      accessibilityLabel: "Camera SD card storage. No SD card detected",
    };
  }

  if (kind === "unavailable") {
    return {
      kind,
      usage: null,
      primaryLabel: "Storage information unavailable for this camera",
      secondaryLabel: null,
      percentLabel: null,
      accessibilityLabel:
        "Camera SD card storage. Storage information unavailable for this camera",
    };
  }

  if (kind === "error") {
    return {
      kind,
      usage: null,
      primaryLabel: errorMessage?.trim() || "Could not read camera storage",
      secondaryLabel: null,
      percentLabel: null,
      accessibilityLabel: `Camera SD card storage. ${errorMessage?.trim() || "Could not read camera storage"}`,
      errorMessage,
    };
  }

  const usage = raw ? normalizeCameraSdUsage(raw) : null;
  if (!usage) {
    return {
      kind: "unavailable",
      usage: null,
      primaryLabel: "Storage information unavailable for this camera",
      secondaryLabel: null,
      percentLabel: null,
      accessibilityLabel:
        "Camera SD card storage. Storage information unavailable for this camera",
    };
  }

  const primary = cameraSdUsedOfTotalLabel(usage);
  const secondary = cameraSdAvailableLabel(usage);
  const percent = cameraSdPercentLabel(usage);
  const lastKnown =
    kind === "refreshing" && lastKnownAt
      ? `Updating… Last known ${lastKnownAt}`
      : kind === "refreshing"
        ? "Updating…"
        : null;

  return {
    kind,
    usage,
    primaryLabel: primary,
    secondaryLabel: lastKnown ? `${secondary} · ${lastKnown}` : secondary,
    percentLabel: percent,
    accessibilityLabel: `Camera SD card storage. ${cameraSdAccessibilityValue(usage)}${
      kind === "refreshing" ? ". Updating" : ""
    }`,
    lastKnownAt,
  };
}

/**
 * Resolve UI kind from connection + demo/live capability.
 * Live cameras: capacity CGI is not camera-confirmed → `unavailable`.
 */
export function resolveCameraSdStorageKind(options: {
  readonly connected: boolean;
  readonly connecting: boolean;
  readonly demoMode: boolean;
  readonly hasCachedUsage: boolean;
  readonly refreshing?: boolean;
}): CameraSdStorageKind {
  if (options.connecting && !options.hasCachedUsage) return "loading";
  if (!options.connected && !options.connecting) return "disconnected";
  if (options.demoMode && options.connected) {
    return options.refreshing && options.hasCachedUsage ? "refreshing" : "ready";
  }
  if (options.connected) return "unavailable";
  if (options.connecting && options.hasCachedUsage) return "refreshing";
  return "disconnected";
}
