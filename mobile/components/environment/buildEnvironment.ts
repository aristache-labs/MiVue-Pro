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
 * Internal tools (Diagnostics hub, Developer Logs) are enabled unless the
 * updates channel is explicitly `production`.
 *
 * A preview binary built without an embedded EAS Update URL reports a null
 * channel. That build still needs Developer Logs. `__DEV__` and Expo Go stay on.
 */
export function areInternalToolsEnabled(input: BuildEnvironmentInput): boolean {
  if (input.isDev === true) return true;
  if (input.appOwnership === "expo") return true;

  const channel = typeof input.updatesChannel === "string" ? input.updatesChannel.trim().toLowerCase() : "";
  return channel !== "production";
}
