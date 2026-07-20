import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  acceptTerms,
  changeCamera,
  completeOnboarding,
  isOnboardingGateActive,
  loadOnboardingState,
  markConnectionGuide,
  markConnecting,
  markPrePromptSeen,
  markSuccess,
  resetOnboarding,
  resolveInitialStep,
  saveOnboardingState,
  selectCameraProfile,
  skipCameraSetup,
  clearOnboardingState,
} from "@/components/onboarding";
import type { OnboardingState, OnboardingStep } from "@/components/onboarding";
import { DEFAULT_ONBOARDING_STATE } from "@/components/onboarding";

type OnboardingContextValue = {
  readonly ready: boolean;
  readonly state: OnboardingState;
  readonly step: OnboardingStep;
  readonly gateActive: boolean;
  readonly acceptTermsNow: () => Promise<void>;
  readonly goAddCamera: () => Promise<void>;
  readonly skipCamera: () => Promise<void>;
  readonly chooseProfile: (profileId: string) => Promise<void>;
  readonly setStep: (step: OnboardingStep) => Promise<void>;
  readonly seePrePrompt: () => Promise<void>;
  readonly beginConnecting: () => Promise<void>;
  readonly backToGuide: () => Promise<void>;
  readonly showSuccess: () => Promise<void>;
  readonly finishToLibrary: () => Promise<void>;
  readonly startChangeCamera: () => Promise<void>;
  readonly reopenCameraSetup: () => Promise<void>;
  readonly resetOnboardingDev: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

async function persist(next: OnboardingState): Promise<OnboardingState> {
  await saveOnboardingState(AsyncStorage, next);
  return next;
}

export function OnboardingProvider({ children }: { readonly children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [step, setStepState] = useState<OnboardingStep>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadOnboardingState(AsyncStorage);
      if (cancelled) return;
      setState(loaded);
      setStepState(resolveInitialStep(loaded));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(async (next: OnboardingState, nextStep?: OnboardingStep) => {
    const saved = await persist(next);
    setState(saved);
    if (nextStep) setStepState(nextStep);
    else setStepState(resolveInitialStep(saved));
  }, []);

  const acceptTermsNow = useCallback(async () => {
    const next = acceptTerms(state, new Date().toISOString());
    await apply(next, "cameraSetup");
  }, [apply, state]);

  const goAddCamera = useCallback(async () => {
    const next = { ...state, resumeStep: "selectCamera" as const };
    await apply(next, "selectCamera");
  }, [apply, state]);

  const skipCamera = useCallback(async () => {
    await apply(skipCameraSetup(state), "completed");
  }, [apply, state]);

  const chooseProfile = useCallback(
    async (profileId: string) => {
      await apply(selectCameraProfile(state, profileId), "connectionGuide");
    },
    [apply, state],
  );

  const setStep = useCallback(
    async (s: OnboardingStep) => {
      await apply({ ...state, resumeStep: s }, s);
    },
    [apply, state],
  );

  const seePrePrompt = useCallback(async () => {
    await apply(markPrePromptSeen(state));
  }, [apply, state]);

  const beginConnecting = useCallback(async () => {
    await apply(markConnecting(state), "connecting");
  }, [apply, state]);

  const backToGuide = useCallback(async () => {
    await apply(markConnectionGuide(state), "connectionGuide");
  }, [apply, state]);

  const showSuccess = useCallback(async () => {
    await apply(markSuccess(state), "success");
  }, [apply, state]);

  const finishToLibrary = useCallback(async () => {
    await apply(completeOnboarding(state), "completed");
  }, [apply, state]);

  const startChangeCamera = useCallback(async () => {
    await apply(changeCamera(state), "selectCamera");
  }, [apply, state]);

  const reopenCameraSetup = useCallback(async () => {
    const next = {
      ...state,
      onboardingCompleted: false,
      resumeStep: "cameraSetup" as const,
    };
    await apply(next, "cameraSetup");
  }, [apply, state]);

  const resetOnboardingDev = useCallback(async () => {
    await clearOnboardingState(AsyncStorage);
    const fresh = resetOnboarding();
    setState(fresh);
    setStepState("terms");
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ready,
      state,
      step,
      gateActive: isOnboardingGateActive(state),
      acceptTermsNow,
      goAddCamera,
      skipCamera,
      chooseProfile,
      setStep,
      seePrePrompt,
      beginConnecting,
      backToGuide,
      showSuccess,
      finishToLibrary,
      startChangeCamera,
      reopenCameraSetup,
      resetOnboardingDev,
    }),
    [
      ready,
      state,
      step,
      acceptTermsNow,
      goAddCamera,
      skipCamera,
      chooseProfile,
      setStep,
      seePrePrompt,
      beginConnecting,
      backToGuide,
      showSuccess,
      finishToLibrary,
      startChangeCamera,
      reopenCameraSetup,
      resetOnboardingDev,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
