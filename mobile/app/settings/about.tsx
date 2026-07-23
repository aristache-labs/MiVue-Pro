import Constants from "expo-constants";
import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  BackHandler,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LegalInfoSheet, type LegalInfoSheetKind } from "@/components/settings/LegalInfoSheet";
import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { SettingsActionRow, SettingsSection } from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { Badge, Card } from "@/components/ui";
import { APP_NAME } from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

export default function SettingsAboutScreen() {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<LegalInfoSheetKind | null>(null);

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0";
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    undefined;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (sheet !== null) {
          setSheet(null);
          return true;
        }
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, [sheet]),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="About Laneory" onBack={navigateBackToSettings} />

      <SettingsScroll
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <Card style={[styles.hero, { borderRadius: radius.md }]}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.heroIcon}
            accessibilityIgnoresInvertColors
          />
          <Text style={[styles.heroTitle, { color: colors.text }]} maxFontSizeMultiplier={1.3}>
            {APP_NAME}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>
            Your local dashcam library
          </Text>
          <Text style={[styles.heroVersion, { color: colors.textMuted }]} maxFontSizeMultiplier={1.2}>
            Version {version}
            {build ? ` · Build ${build}` : ""}
          </Text>
          <View style={styles.badgeWrap}>
            <Badge label="Independent app" tone="brand" icon="ribbon-outline" />
          </View>
          <Text style={[styles.heroBody, { color: colors.text }]} maxFontSizeMultiplier={1.35}>
            Browse, download and organise recordings from compatible dashcams over their local
            Wi-Fi network.
          </Text>
          <Text style={[styles.heroNote, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>
            Local-first. Recordings remain on this device unless you choose to export or delete
            them.
          </Text>
        </Card>

        <SettingsSection title="Legal information" style={styles.section}>
          <SettingsActionRow
            icon="book-outline"
            title="About"
            compact
            onPress={() => setSheet("about")}
            accessibilityLabel="About"
          />
          <SettingsActionRow
            icon="warning-outline"
            title="Disclaimer"
            compact
            onPress={() => setSheet("disclaimer")}
            accessibilityLabel="Disclaimer"
          />
          <SettingsActionRow
            icon="code-slash-outline"
            title="Open-source licences"
            compact
            onPress={() => setSheet("licenses")}
            accessibilityLabel="Open-source licences"
          />
        </SettingsSection>
      </SettingsScroll>

      <LegalInfoSheet
        kind={sheet}
        onClose={() => setSheet(null)}
        appVersion={version}
        buildLabel={build}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Type.fontBold,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Type.font,
    textAlign: "center",
    marginTop: 4,
  },
  heroVersion: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Type.mono,
    textAlign: "center",
    marginTop: 8,
  },
  badgeWrap: { marginTop: 12, marginBottom: 14 },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Type.font,
    textAlign: "center",
  },
  heroNote: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Type.font,
    textAlign: "center",
    marginTop: 10,
  },
  section: { marginBottom: 0 },
});
