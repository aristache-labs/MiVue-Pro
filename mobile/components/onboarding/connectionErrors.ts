import type { VerifyUiState } from "./onboardingTypes";

export type UserFacingConnectionError = {
  readonly title: string;
  readonly message: string;
  readonly tone: "neutral" | "warn" | "danger";
  readonly technical?: string;
};

/** Map internal verify failures to short production copy. */
export function userFacingConnectionError(
  state: Exclude<VerifyUiState, "idle" | "waitingForWifi" | "checking" | "connected" | "needsModelConfirm">,
  raw?: string,
): UserFacingConnectionError {
  const technical = raw?.trim() || undefined;
  switch (state) {
    case "timedOut":
    case "cameraUnreachable":
    case "wrongNetwork":
      return {
        title: "Camera connection unavailable",
        message: "Join the camera’s Wi-Fi, then try again.",
        tone: "warn",
        ...(technical ? { technical } : {}),
      };
    case "permissionDenied":
      return {
        title: "Local network access is off",
        message: "Allow Local Network access for Laneory in Settings, then try again.",
        tone: "warn",
        ...(technical ? { technical } : {}),
      };
    case "invalidCameraResponse":
      return {
        title: "Camera could not be verified",
        message: "Laneory reached a device, but it did not return a supported camera response.",
        tone: "neutral",
        ...(technical ? { technical } : {}),
      };
    default:
      return {
        title: "Camera connection unavailable",
        message: "Join the camera’s Wi-Fi, then try again.",
        tone: "warn",
        ...(technical ? { technical } : {}),
      };
  }
}

/** Wi-Fi join failures use the compact Connect status card (not InlineMessage). */
export function isCameraConnectionUnavailableState(
  state: VerifyUiState | undefined,
): boolean {
  return state === "timedOut" || state === "cameraUnreachable" || state === "wrongNetwork";
}

export function shouldAllowGateBypassSegment(segment: string | undefined): boolean {
  return (
    segment === "onboarding" ||
    segment === "connection-help" ||
    segment === "legal-document"
  );
}
