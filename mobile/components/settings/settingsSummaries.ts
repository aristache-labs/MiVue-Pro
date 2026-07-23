import type { CameraLinkState } from "@/components/camera/cameraLibraryModel";
import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";

export type ConnectionHubKind = "connected" | "connecting" | "unavailable";

export function connectionStatusLabel(linkState: CameraLinkState): string {
  switch (linkState) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "unstable":
      return "Unstable";
    case "connection_lost":
      return "Connection lost";
    case "disconnected":
      return "Not connected";
    default:
      return "Not connected";
  }
}

export function connectionHubKind(linkState: CameraLinkState): ConnectionHubKind {
  if (linkState === "connected" || linkState === "unstable") return "connected";
  if (linkState === "connecting") return "connecting";
  return "unavailable";
}

/** Hub summary for Camera & Connection. */
export function cameraConnectionSummary(
  linkState: CameraLinkState,
  cameraModel: string | undefined,
): string {
  const kind = connectionHubKind(linkState);
  if (kind === "connecting") return "Connecting…";
  if (kind === "unavailable") return "Camera unavailable";
  const model = cameraModel?.trim();
  return model ? `Connected · ${model}` : "Connected";
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
  if (input.linkState === "connected" || input.linkState === "unstable") {
    return "Last request: OK";
  }
  if (input.linkState === "connection_lost" || input.linkState === "disconnected") {
    return "Connection issue";
  }
  return "Not tested";
}

export function diagnosticsRequestStatus(input: {
  readonly lastError: string | undefined;
  readonly linkState: CameraLinkState;
}): string {
  if (input.lastError) return "Error";
  if (input.linkState === "connected") return "OK";
  if (input.linkState === "unstable") return "Unstable";
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
