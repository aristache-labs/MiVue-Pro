/**
 * Pure build-environment helpers for internal tooling gates.
 * Screens must not re-implement channel / Expo Go / __DEV__ checks ad hoc.
 */

export type BuildEnvironmentInput = {
  /** Equivalent to global `__DEV__`. */
  readonly isDev: boolean;
  /** `Constants.appOwnership` — `"expo"` means Expo Go. */
  readonly appOwnership: string | null | undefined;
  /** `Updates.channel` from expo-updates. */
  readonly updatesChannel: string | null | undefined;
};

/**
 * Internal tools (Diagnostics hub, Reset onboarding, etc.) are enabled when any of:
 * - `__DEV__`
 * - Expo Go (`appOwnership === "expo"`)
 * - Updates channel `development` or `preview`
 *
 * Disabled for `production` channel and for release builds where none of the
 * internal conditions apply (including undefined channel in a release).
 */
export function areInternalToolsEnabled(input: BuildEnvironmentInput): boolean {
  if (input.isDev === true) return true;
  if (input.appOwnership === "expo") return true;

  const channel = typeof input.updatesChannel === "string" ? input.updatesChannel.trim().toLowerCase() : "";
  if (channel === "development" || channel === "preview") return true;
  if (channel === "production") return false;

  // Undefined / empty / unknown channel in a non-dev, non–Expo Go build → off.
  return false;
}
