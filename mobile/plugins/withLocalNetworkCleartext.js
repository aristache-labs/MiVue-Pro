const {
  withAndroidManifest,
  withInfoPlist,
  AndroidConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Minimal cleartext/ATS exceptions for local camera HTTP.
 * Does not enable global cleartext to the internet.
 */
function withLocalNetworkCleartext(config) {
  config = withInfoPlist(config, (config) => {
    const plist = config.modResults;
    plist.NSLocalNetworkUsageDescription =
      plist.NSLocalNetworkUsageDescription ||
      "The app connects to your dashcam on the local Wi-Fi network to list and download files you choose. It does not change camera settings.";
    plist.NSAppTransportSecurity = {
      NSAllowsLocalNetworking: true,
      NSExceptionDomains: {
        "192.72.1.1": {
          NSExceptionAllowsInsecureHTTPLoads: true,
          NSIncludesSubdomains: false,
        },
      },
    };
    return config;
  });

  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    app.$["android:usesCleartextTraffic"] = "false";
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";

    const projectRoot = config.modRequest.platformProjectRoot;
    const xmlDir = path.join(projectRoot, "app", "src", "main", "res", "xml");
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.writeFileSync(
      path.join(xmlDir, "network_security_config.xml"),
      `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Fetch/HTTP stack only. Native TCP sockets bypass this. -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">192.72.1.1</domain>
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">127.0.0.1</domain>
  </domain-config>
  <base-config cleartextTrafficPermitted="false" />
</network-security-config>
`,
      "utf8",
    );
    return config;
  });

  return config;
}

module.exports = withLocalNetworkCleartext;
