import {
  DEFAULT_ONBOARDING_STATE,
  ONBOARDING_SCHEMA_VERSION,
  ONBOARDING_STORAGE_KEY,
  type OnboardingState,
  type OnboardingStep,
} from "./onboardingTypes";
import { safeResumeStep } from "./onboardingMachine";

type StorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const STEPS = new Set<OnboardingStep>([
  "loading",
  "terms",
  "cameraSetup",
  "selectCamera",
  "connectionGuide",
  "connecting",
  "success",
  "completed",
]);

export function parseOnboardingState(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ONBOARDING_STATE };

  const o = raw as Record<string, unknown>;
  const schemaVersion =
    typeof o.schemaVersion === "number" && Number.isFinite(o.schemaVersion)
      ? o.schemaVersion
      : ONBOARDING_SCHEMA_VERSION;

  // Future migrations go here by schemaVersion.
  if (schemaVersion > ONBOARDING_SCHEMA_VERSION) {
    return { ...DEFAULT_ONBOARDING_STATE };
  }

  const resumeRaw = typeof o.resumeStep === "string" ? o.resumeStep : undefined;
  const resumeStep =
    resumeRaw && STEPS.has(resumeRaw as OnboardingStep)
      ? safeResumeStep(resumeRaw as OnboardingStep)
      : DEFAULT_ONBOARDING_STATE.resumeStep;

  return {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    onboardingCompleted: o.onboardingCompleted === true,
    cameraSetupCompleted: o.cameraSetupCompleted === true,
    ...(typeof o.acceptedTermsVersion === "string"
      ? { acceptedTermsVersion: o.acceptedTermsVersion }
      : {}),
    ...(typeof o.acceptedTermsAt === "string" ? { acceptedTermsAt: o.acceptedTermsAt } : {}),
    ...(typeof o.selectedCameraProfileId === "string"
      ? { selectedCameraProfileId: o.selectedCameraProfileId }
      : {}),
    ...(resumeStep ? { resumeStep } : {}),
    localNetworkPrePromptSeen: o.localNetworkPrePromptSeen === true,
  };
}

export async function loadOnboardingState(storage: StorageLike): Promise<OnboardingState> {
  try {
    const raw = await storage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ONBOARDING_STATE };
    return parseOnboardingState(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_ONBOARDING_STATE };
  }
}

export async function saveOnboardingState(
  storage: StorageLike,
  state: OnboardingState,
): Promise<void> {
  const payload: OnboardingState = {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    onboardingCompleted: state.onboardingCompleted,
    cameraSetupCompleted: state.cameraSetupCompleted,
    ...(state.acceptedTermsVersion
      ? { acceptedTermsVersion: state.acceptedTermsVersion }
      : {}),
    ...(state.acceptedTermsAt ? { acceptedTermsAt: state.acceptedTermsAt } : {}),
    ...(state.selectedCameraProfileId
      ? { selectedCameraProfileId: state.selectedCameraProfileId }
      : {}),
    ...(state.resumeStep ? { resumeStep: safeResumeStep(state.resumeStep) } : {}),
    localNetworkPrePromptSeen: state.localNetworkPrePromptSeen === true,
  };
  await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
}

export async function clearOnboardingState(storage: StorageLike): Promise<void> {
  await storage.removeItem(ONBOARDING_STORAGE_KEY);
}

export { ONBOARDING_STORAGE_KEY };
