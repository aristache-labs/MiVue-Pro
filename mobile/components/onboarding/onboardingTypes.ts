export const ONBOARDING_SCHEMA_VERSION = 1;
export const TERMS_VERSION = "0.1-draft";
export const ONBOARDING_STORAGE_KEY = "@laneory/onboarding_v1";

export type OnboardingStep =
  | "loading"
  | "terms"
  | "cameraSetup"
  | "selectCamera"
  | "connectionGuide"
  | "connecting"
  | "success"
  | "completed";

export type CameraCompatibility = "verified" | "experimental" | "unsupported";

export type ConnectionMethod = "wifi" | "qr" | "bluetooth";

export type CameraProfile = {
  readonly id: string;
  readonly displayName: string;
  readonly compatibility: CameraCompatibility;
  readonly defaultHost?: string;
  readonly connectionMethods: readonly ConnectionMethod[];
};

export type OnboardingState = {
  readonly schemaVersion: number;
  readonly onboardingCompleted: boolean;
  readonly acceptedTermsVersion?: string;
  readonly acceptedTermsAt?: string;
  readonly selectedCameraProfileId?: string;
  readonly cameraSetupCompleted: boolean;
  readonly resumeStep?: OnboardingStep;
  /** Shown local-network pre-permission once before first verify. */
  readonly localNetworkPrePromptSeen?: boolean;
};

export type VerifyUiState =
  | "idle"
  | "waitingForWifi"
  | "checking"
  | "connected"
  | "permissionDenied"
  | "wrongNetwork"
  | "cameraUnreachable"
  | "invalidCameraResponse"
  | "timedOut"
  | "needsModelConfirm";

export type VerifyResult =
  | {
      readonly ok: true;
      readonly host: string;
      readonly detectedModelHint?: string;
      readonly serverHeader?: string;
      readonly needsModelConfirm: boolean;
    }
  | {
      readonly ok: false;
      readonly state: Exclude<VerifyUiState, "idle" | "waitingForWifi" | "checking" | "connected">;
      readonly error?: string;
    };

export const DEFAULT_ONBOARDING_STATE: OnboardingState = Object.freeze({
  schemaVersion: ONBOARDING_SCHEMA_VERSION,
  onboardingCompleted: false,
  cameraSetupCompleted: false,
  resumeStep: "terms",
  localNetworkPrePromptSeen: false,
});
