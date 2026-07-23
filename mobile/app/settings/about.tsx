import Constants from "expo-constants";
import { router } from "expo-router";
import { Text, StyleSheet, View } from "react-native";

import {
  SettingsActionRow,
  SettingsSection,
  SettingsValueRow,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import {
  APP_NAME,
  APP_SHORT_DESCRIPTION,
  APP_SUBTITLE,
} from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

export default function SettingsAboutScreen() {
  const { colors } = useAppTheme();
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0";
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    undefined;

  return (
    <SettingsScroll>
      <SettingsSection title="Application">
        <SettingsValueRow
          icon="ribbon-outline"
          title={APP_NAME}
          subtitle={APP_SUBTITLE}
          value={version}
        />
        {build ? (
          <SettingsValueRow icon="construct-outline" title="Build" value={String(build)} />
        ) : null}
        <View style={styles.blurb}>
          <Text style={[styles.blurbText, { color: colors.textMuted }]}>
            {APP_SHORT_DESCRIPTION} Local-first — recordings stay on this device.
          </Text>
        </View>
      </SettingsSection>

      <SettingsSection title="Legal information">
        <SettingsActionRow
          icon="book-outline"
          title="About"
          onPress={() =>
            router.push("/settings/about-detail" as Parameters<typeof router.push>[0])
          }
        />
        <SettingsActionRow
          icon="warning-outline"
          title="Disclaimer"
          onPress={() =>
            router.push("/settings/disclaimer" as Parameters<typeof router.push>[0])
          }
        />
        <SettingsActionRow
          icon="code-slash-outline"
          title="Open-source licences"
          onPress={() =>
            router.push("/settings/licenses" as Parameters<typeof router.push>[0])
          }
        />
      </SettingsSection>
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  blurb: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  blurbText: { fontSize: 13, fontFamily: Type.font, lineHeight: 18 },
});
