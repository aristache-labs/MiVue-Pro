/**
 * AppState return → single deferred verify.
 * Pure helpers so tests do not need React Native AppState.
 */

export type AppStateVerifyGate = {
  readonly enabled: boolean;
  readonly verifyState: string;
  readonly inflight: boolean;
};

export function shouldRunAppStateVerify(gate: AppStateVerifyGate): boolean {
  if (!gate.enabled || gate.inflight) return false;
  return gate.verifyState === "idle" || gate.verifyState === "waitingForWifi";
}

export const APP_STATE_VERIFY_DEBOUNCE_MS = 800;

/**
 * Schedules at most one callback after debounce; returns cancel fn.
 * Caller must ensure verify itself is single-flight.
 */
export function scheduleOneShotVerify(
  run: () => void,
  debounceMs = APP_STATE_VERIFY_DEBOUNCE_MS,
): () => void {
  let cancelled = false;
  const t = setTimeout(() => {
    if (!cancelled) run();
  }, debounceMs);
  return () => {
    cancelled = true;
    clearTimeout(t);
  };
}
