import {
  DEFAULT_ONBOARDING_STATE,
  TERMS_VERSION,
  type OnboardingState,
  type OnboardingStep,
} from "./onboardingTypes";

const SAFE_RESUME: Readonly<Record<OnboardingStep, OnboardingStep>> = Object.freeze({
  loading: "terms",
  terms: "terms",
  cameraSetup: "cameraSetup",
  selectCamera: "selectCamera",
  connectionGuide: "connectionGuide",
  connecting: "connectionGuide",
  success: "success",
  completed: "completed",
});

export function needsTermsAcceptance(state: OnboardingState, currentTerms = TERMS_VERSION): boolean {
  return state.acceptedTermsVersion !== currentTerms;
}

export function resolveInitialStep(state: OnboardingState): OnboardingStep {
  if (needsTermsAcceptance(state)) return "terms";
  if (state.onboardingCompleted && state.cameraSetupCompleted) return "completed";
  if (state.onboardingCompleted && !state.cameraSetupCompleted) {
    // Skipped camera setup — stay in main app; re-entry from Settings uses explicit route.
    return "completed";
  }
  const raw = state.resumeStep ?? "cameraSetup";
  return SAFE_RESUME[raw] ?? "cameraSetup";
}

export function safeResumeStep(step: OnboardingStep): OnboardingStep {
  return SAFE_RESUME[step] ?? "terms";
}

export function acceptTerms(state: OnboardingState, atIso: string): OnboardingState {
  return {
    ...state,
    acceptedTermsVersion: TERMS_VERSION,
    acceptedTermsAt: atIso,
    resumeStep: "cameraSetup",
  };
}

export function skipCameraSetup(state: OnboardingState): OnboardingState {
  return {
    ...state,
    onboardingCompleted: true,
    cameraSetupCompleted: false,
    resumeStep: "completed",
  };
}

export function selectCameraProfile(state: OnboardingState, profileId: string): OnboardingState {
  return {
    ...state,
    selectedCameraProfileId: profileId,
    resumeStep: "connectionGuide",
  };
}

export function markPrePromptSeen(state: OnboardingState): OnboardingState {
  return { ...state, localNetworkPrePromptSeen: true };
}

export function markConnecting(state: OnboardingState): OnboardingState {
  return { ...state, resumeStep: "connecting" };
}

export function markConnectionGuide(state: OnboardingState): OnboardingState {
  return { ...state, resumeStep: "connectionGuide" };
}

export function markSuccess(state: OnboardingState): OnboardingState {
  return { ...state, resumeStep: "success" };
}

export function completeOnboarding(state: OnboardingState): OnboardingState {
  return {
    ...state,
    onboardingCompleted: true,
    cameraSetupCompleted: true,
    resumeStep: "completed",
  };
}

/** Change camera: keep terms + local media; reset setup progress only. */
export function changeCamera(state: OnboardingState): OnboardingState {
  return {
    ...state,
    selectedCameraProfileId: undefined,
    cameraSetupCompleted: false,
    onboardingCompleted: true,
    resumeStep: "selectCamera",
    localNetworkPrePromptSeen: state.localNetworkPrePromptSeen,
  };
}

export function resetOnboarding(): OnboardingState {
  return { ...DEFAULT_ONBOARDING_STATE };
}

export function continueEnabled(agreed: boolean): boolean {
  return agreed;
}

export function isOnboardingGateActive(state: OnboardingState): boolean {
  if (needsTermsAcceptance(state)) return true;
  if (!state.onboardingCompleted) return true;
  return false;
}
