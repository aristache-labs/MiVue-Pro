import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { SettingsSection } from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { ThemeSelector } from "@/src/components/ThemeSelector";
import { useTheme } from "@/src/contexts/ThemeContext";
import { Type, useAppTheme } from "@/constants/Theme";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

export default function AppearanceScreen() {
  const { colors } = useAppTheme();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        navigateBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Appearance" onBack={navigateBackToSettings} />

      <SettingsScroll
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.description, { color: theme.colors.textMuted }]}>
            Choose how Laneory looks. System automatically matches your device settings.
          </Text>
        </View>
        <SettingsSection title="Theme Preferences">
          <View style={styles.selectorContainer}>
            <ThemeSelector />
          </View>
        </SettingsSection>
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  description: {
    fontSize: 14,
    fontFamily: Type.font,
    lineHeight: 20,
  },
  selectorContainer: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
});
