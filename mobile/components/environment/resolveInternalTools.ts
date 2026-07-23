import Constants from "expo-constants";
import * as Updates from "expo-updates";

import {
  areInternalToolsEnabled,
  type BuildEnvironmentInput,
} from "./buildEnvironment";

export type { BuildEnvironmentInput } from "./buildEnvironment";
export { areInternalToolsEnabled } from "./buildEnvironment";

/** Snapshot of the running app’s environment for internal-tool gates. */
export function resolveBuildEnvironmentInput(): BuildEnvironmentInput {
  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : false;
  return {
    isDev,
    appOwnership: Constants.appOwnership ?? null,
    updatesChannel: Updates.channel ?? null,
  };
}

/** Live gate used by Settings screens and protected handlers. */
export function internalToolsEnabled(
  input: BuildEnvironmentInput = resolveBuildEnvironmentInput(),
): boolean {
  return areInternalToolsEnabled(input);
}
