const { withInfoPlist } = require("@expo/config-plugins");

/**
 * Stage 0 feasibility only — documents the stable background URLSession identifier.
 * Does not enable UIBackgroundModes (not required for URLSession.background downloads).
 * Does not modify signing or release credentials.
 *
 * Completion delivery uses ExpoAppDelegateSubscriber
 * (BackgroundDownloadSpikeAppDelegateSubscriber) registered via expo-module.config.json.
 */
function withBackgroundDownloadSpike(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.LaneoryBackgroundDownloadSpikeSessionId =
      "app.laneory.mobile.bg-download-spike";
    config.modResults.LaneoryBackgroundDownloadSpikeNote =
      "Experimental Stage-0 harness. Not production. See docs/mobile/background-download-spike.md";
    return config;
  });
}

module.exports = withBackgroundDownloadSpike;
