const {
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
  AndroidConfig,
} = require("@expo/config-plugins");

/**
 * Access Wi‑Fi Information (iOS) + minimal Android Wi‑Fi/location permissions
 * so Laneory can display the current SSID of the camera network.
 * Does not enable Wi‑Fi password access.
 */
function withWifiSsidAccess(config) {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.developer.networking.wifi-info"] = true;
    return config;
  });

  config = withInfoPlist(config, (config) => {
    const plist = config.modResults;
    plist.NSLocationWhenInUseUsageDescription =
      plist.NSLocationWhenInUseUsageDescription ||
      "Laneory needs When-In-Use location access only so iOS can reveal the Wi‑Fi network name (SSID) of the dashcam you are connected to. Coordinates are not collected or stored.";
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    AndroidConfig.Permissions.ensurePermissions(manifest, [
      "android.permission.ACCESS_WIFI_STATE",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.NEARBY_WIFI_DEVICES",
    ]);
    return config;
  });

  return config;
}

module.exports = withWifiSsidAccess;
