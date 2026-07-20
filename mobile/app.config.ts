import type { ConfigContext, ExpoConfig } from "expo/config";

// Static project config — secrets only via env / EAS, never committed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("./app.json") as { expo: ExpoConfig };

/**
 * Expo config with Google Maps SDK keys from environment.
 * Set GOOGLE_MAPS_IOS_API_KEY and GOOGLE_MAPS_ANDROID_API_KEY in .env (local)
 * or EAS Secrets (CI). Empty keys → Maps SDK will fail at runtime; UI falls back to local schematic.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = appJson.expo;
  const iosKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim() ?? "";
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() ?? "";

  if (process.env.CI !== "true") {
    if (!iosKey) {
      console.warn(
        "[Laneory] GOOGLE_MAPS_IOS_API_KEY is unset — Online map on iOS will use local schematic fallback until configured.",
      );
    }
    if (!androidKey) {
      console.warn(
        "[Laneory] GOOGLE_MAPS_ANDROID_API_KEY is unset — Online map on Android will use local schematic fallback until configured.",
      );
    }
  }

  return {
    ...config,
    ...base,
    ios: {
      ...base.ios,
      config: {
        googleMapsApiKey: iosKey,
      },
    },
    android: {
      ...base.android,
      config: {
        googleMaps: {
          apiKey: androidKey,
        },
      },
    },
    plugins: [...(base.plugins ?? [])],
    extra: {
      ...base.extra,
      /** Booleans only — never expose key material to JS bundles unnecessarily. */
      googleMapsIosConfigured: iosKey.length > 0,
      googleMapsAndroidConfigured: androidKey.length > 0,
    },
  };
};
