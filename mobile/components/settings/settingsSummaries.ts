import type { CameraLinkState } from "@/components/camera/cameraLibraryModel";
import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";

/** UI-only connection status — single source for Settings, Camera, and Library badges. */
export type VisibleConnectionStatus = "connected" | "connecting" | "disconnected";

export type ConnectionHubKind = VisibleConnectionStatus;

/**
 * Map internal link state to the three user-visible statuses.
 * Historical success (`lastConnectedAt`) must never keep a live Connected label.
 */
export function visibleConnectionStatus(linkState: CameraLinkState): VisibleConnectionStatus {
  if (linkState === "connected") return "connected";
  if (linkState === "connecting") return "connecting";
  // idle | disconnected | connection_lost | unstable | unknown → Disconnected
  return "disconnected";
}

export function connectionStatusLabel(linkState: CameraLinkState): string {
  switch (visibleConnectionStatus(linkState)) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    default:
      return "Disconnected";
  }
}

export function connectionHubKind(linkState: CameraLinkState): ConnectionHubKind {
  return visibleConnectionStatus(linkState);
}

/**
 * Hub summary for Camera & Connection.
 * “No camera configured” only when onboarding has no camera profile / setup.
 * When configured but offline → “Not connected” (optionally with model).
 */
export function cameraConnectionSummary(
  linkState: CameraLinkState,
  cameraModel: string | undefined,
  cameraConfigured = Boolean(cameraModel?.trim()),
): string {
  if (!cameraConfigured) return "No camera configured";
  const model = cameraModel?.trim();
  const status = connectionStatusLabel(linkState);
  if (status === "Disconnected") {
    return model ? `Not connected · ${model}` : "Not connected";
  }
  return model ? `${status} · ${model}` : status;
}

/** Primary status-card title under the badge. */
export function cameraStatusTitle(
  cameraConfigured: boolean,
  modelName: string | undefined,
): string {
  if (!cameraConfigured) return "No camera configured";
  const model = modelName?.trim();
  if (model) return model;
  return "Not connected";
}

/** Hub summary for Downloads & Storage. */
export function storageSummary(fileCount: number, totalBytes: number): string {
  if (fileCount <= 0) return "No local downloads";
  return `${fileCount} files · ${formatMediaSizeMbGb(totalBytes)}`;
}

/** Hub summary for Maps & Privacy. */
export function mapsPreferenceSummary(preference: "online" | "schematic"): string {
  return preference === "online" ? "Online map" : "Local schematic";
}

export type DiagnosticsSummaryKind = "ok" | "issue" | "not_tested";

/**
 * Hub diagnostics summary.
 * `hasEverTested` is true after any refresh/connectivity attempt (success or fail).
 */
export function diagnosticsSummary(input: {
  readonly hasEverTested: boolean;
  readonly lastError: string | undefined;
  readonly linkState: CameraLinkState;
}): string {
  if (!input.hasEverTested) return "Not tested";
  if (input.lastError) return "Connection issue";
  if (visibleConnectionStatus(input.linkState) === "connected") {
    return "Last request: OK";
  }
  if (visibleConnectionStatus(input.linkState) === "disconnected") {
    return "Connection issue";
  }
  return "Not tested";
}

export function diagnosticsRequestStatus(input: {
  readonly lastError: string | undefined;
  readonly linkState: CameraLinkState;
}): string {
  if (input.lastError) return "Error";
  if (visibleConnectionStatus(input.linkState) === "connected") return "OK";
  return "—";
}

/** Hub summary for Legal & Onboarding. */
export function legalSummary(input: {
  readonly acceptedTermsVersion: string | undefined;
  readonly termsAccepted: boolean;
}): string {
  if (!input.termsAccepted || !input.acceptedTermsVersion) return "Terms not accepted";
  return `Terms accepted · ${input.acceptedTermsVersion}`;
}

/** Hub summary for About. */
export function aboutVersionSummary(version: string): string {
  return `Version ${version}`;
}

export function transportLabel(input: {
  readonly nativeTcpReady: boolean;
  readonly isExpoGo: boolean;
}): string {
  if (input.nativeTcpReady) return "Native TCP";
  if (input.isExpoGo) return "Expo Go";
  return "Fallback";
}

/**
 * Compact English “Last connected” value — no seconds.
 * Today → “Today, 11:59”; otherwise “23 Jul, 11:59”.
 * Historical only — never proof of a live connection.
 */
export function formatLastConnected(
  iso: string | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `Today, ${time}`;
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${month}, ${time}`;
}

/** Summary-card line: “Last connected · Today, 11:59”. */
export function lastConnectedSummaryLine(
  iso: string | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!iso) return undefined;
  const value = formatLastConnected(iso, now);
  if (value === "—") return undefined;
  return `Last connected · ${value}`;
}
