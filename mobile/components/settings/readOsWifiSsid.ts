import { PermissionsAndroid, Platform } from "react-native";

import {
  normalizeWifiSsid,
  type WifiSsidRead,
} from "@/components/settings/cameraSoftwareInfo";

async function ensureAndroidLocationForSsid(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const current = await PermissionsAndroid.check(fine);
  if (current) return true;
  const result = await PermissionsAndroid.request(fine, {
    title: "Wi‑Fi network name",
    message:
      "Android requires location permission so Laneory can read the SSID of the camera Wi‑Fi you are connected to. Laneory does not collect GPS coordinates or the Wi‑Fi password.",
    buttonPositive: "Allow",
    buttonNegative: "Not now",
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * OS SSID accessor — Laneory does not request or store Wi‑Fi passwords.
 * Prefer a confirmed camera CGI SSID only after live black-box confirmation (none yet).
 *
 * iOS: NEHotspotNetwork.fetchCurrent + wifi-info entitlement + When-In-Use location
 * (Apple returns nil otherwise). Requires a development/production build — not Expo Go.
 */
export async function readOsWifiSsid(): Promise<WifiSsidRead> {
  if (Platform.OS === "web") {
    return { ssid: undefined, status: "unsupported" };
  }
  try {
    const allowed = await ensureAndroidLocationForSsid();
    if (Platform.OS === "android" && !allowed) {
      return { ssid: undefined, status: "permission_denied" };
    }
    const { getCurrentWifiSsidNative } = await import("wifi-ssid");
    const result = await getCurrentWifiSsidNative();
    const ssid = normalizeWifiSsid(result.ssid ?? undefined);
    if (ssid) {
      return { ssid, status: "available" };
    }
    if (result.status === "permission_denied") {
      return { ssid: undefined, status: "permission_denied" };
    }
    if (result.status === "unsupported") {
      return { ssid: undefined, status: "unsupported" };
    }
    return { ssid: undefined, status: "unavailable" };
  } catch {
    return { ssid: undefined, status: "unsupported" };
  }
}
