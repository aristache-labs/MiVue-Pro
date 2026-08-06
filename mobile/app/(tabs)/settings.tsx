import Constants from "expo-constants";
import { router, useNavigation } from "expo-router";
import { useLayoutEffect, useMemo } from "react";

import { getCameraProfile } from "@/components/onboarding";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { internalToolsEnabled } from "@/components/environment/resolveInternalTools";
import { TabScreenHeader } from "@/components/navigation/TabScreenHeader";
import {
  SettingsCategoryRow,
  SettingsSection,
  aboutVersionSummary,
  cameraConnectionSummary,
  diagnosticsSummary,
  legalSummary,
  mapsPreferenceSummary,
  storageSummary,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { useDemoMode } from "@/context/DemoModeContext";
import { ThemeToggle } from "@/src/components/ThemeToggle";

export default function SettingsHubScreen() {
  const navigation = useNavigation();
  const {
    cameraLinkState,
    cameraModel,
    lastConnectedAt,
    lastError,
    localFiles,
    mapPreference,
  } = useDemoMode();
  const { state: onboardingState } = useOnboarding();
  const selectedProfile = getCameraProfile(onboardingState.selectedCameraProfileId);
  const cameraConfigured =
    Boolean(onboardingState.selectedCameraProfileId) || onboardingState.cameraSetupCompleted;
  const cameraModelLabel = selectedProfile?.displayName ?? cameraModel;
  const showDiagnostics = internalToolsEnabled();

  const downloadedBytes = useMemo(
    () => localFiles.reduce((sum, f) => sum + (f.sizeBytes > 0 ? f.sizeBytes : 0), 0),
    [localFiles],
  );

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0";

  const hasEverTested = Boolean(lastConnectedAt || lastError);

  const push = (href: string) => {
    router.push(href as Parameters<typeof router.push>[0]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => <TabScreenHeader title="Settings" right={<ThemeToggle />} />,
    });
  }, [navigation]);

  return (
    <SettingsScroll>
      <SettingsSection title="Device">
        <SettingsCategoryRow
          icon="videocam-outline"
          title="Camera & Connection"
          summary={cameraConnectionSummary(cameraLinkState, cameraModelLabel, cameraConfigured)}
          onPress={() => push("/settings/camera")}
          accessibilityLabel="Camera and Connection"
        />
      </SettingsSection>

      <SettingsSection title="App">
        <SettingsCategoryRow
          icon="folder-outline"
          title="Downloads & Storage"
          summary={storageSummary(localFiles.length, downloadedBytes)}
          onPress={() => push("/settings/storage")}
          accessibilityLabel="Downloads and Storage"
        />
        <SettingsCategoryRow
          icon="map-outline"
          title="Maps & Privacy"
          summary={mapsPreferenceSummary(mapPreference)}
          onPress={() => push("/settings/maps-privacy")}
          accessibilityLabel="Maps and Privacy"
        />
      </SettingsSection>

      <SettingsSection title="Support">
        {showDiagnostics ? (
          <>
            <SettingsCategoryRow
              icon="pulse-outline"
              title="Diagnostics"
              summary={diagnosticsSummary({
                hasEverTested,
                lastError,
                linkState: cameraLinkState,
              })}
              onPress={() => push("/settings/diagnostics")}
              accessibilityLabel="Diagnostics"
            />
            <SettingsCategoryRow
              icon="terminal-outline"
              title="Developer Logs"
              summary="Connection, download, errors · local"
              onPress={() => push("/settings/dev-logs")}
              accessibilityLabel="Developer Logs"
            />
          </>
        ) : null}
        <SettingsCategoryRow
          icon="document-text-outline"
          title="Legal"
          summary={legalSummary({
            acceptedTermsVersion: onboardingState.acceptedTermsVersion,
            termsAccepted: Boolean(onboardingState.acceptedTermsVersion),
          })}
          onPress={() => push("/settings/legal")}
          accessibilityLabel="Legal"
        />
        <SettingsCategoryRow
          icon="ribbon-outline"
          title="About Laneory"
          summary={aboutVersionSummary(version)}
          onPress={() => push("/settings/about")}
          accessibilityLabel="About Laneory"
        />
      </SettingsSection>
    </SettingsScroll>
  );
}
