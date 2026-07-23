import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export type WifiSsidNativeResult = {
  readonly ssid: string | null;
  readonly status: "available" | "unavailable" | "permission_denied" | "unsupported";
};

type WifiSsidNativeModule = {
  getCurrentSsid: () => Promise<WifiSsidNativeResult>;
};

let native: WifiSsidNativeModule | null | undefined;

function getNative(): WifiSsidNativeModule | null {
  if (native !== undefined) return native;
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    native = null;
    return native;
  }
  try {
    native = requireNativeModule<WifiSsidNativeModule>("WifiSsid");
  } catch {
    native = null;
  }
  return native;
}

/**
 * Reads the phone’s current Wi‑Fi SSID via OS APIs.
 * Never returns passwords or BSSID. Returns null SSID when the OS withholds it.
 */
export async function getCurrentWifiSsidNative(): Promise<WifiSsidNativeResult> {
  const mod = getNative();
  if (!mod) {
    return { ssid: null, status: "unsupported" };
  }
  return mod.getCurrentSsid();
}

export default {
  getCurrentWifiSsidNative,
};
