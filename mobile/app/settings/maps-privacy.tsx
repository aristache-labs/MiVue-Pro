import { Stack, router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { SettingsSection, SettingsValueRow } from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type MapPreference } from "@/context/DemoModeContext";

function navigateBackToSettings(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/settings" as Parameters<typeof router.replace>[0]);
}

function MapOption({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: selected ? colors.brand : colors.border,
          backgroundColor: selected ? colors.brandSoft : colors.surfaceMuted,
          borderRadius: radius.sm,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.brand : colors.text,
          fontFamily: Type.fontSemi,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsMapsPrivacyScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { mapPreference, setMapPreference } = useDemoMode();

  const setPref = (next: MapPreference) => {
    if (next !== mapPreference) setMapPreference(next);
  };

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
      <SettingsChromeHeader title="Maps & Privacy" onBack={navigateBackToSettings} />

      <SettingsScroll
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <SettingsSection title="Map preference">
          <View
            style={styles.selector}
            accessibilityRole="radiogroup"
            accessibilityLabel="Map preference"
          >
            <MapOption
              label="Online map"
              selected={mapPreference === "online"}
              onPress={() => setPref("online")}
            />
            <MapOption
              label="Local schematic"
              selected={mapPreference === "schematic"}
              onPress={() => setPref("schematic")}
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Map privacy">
          <SettingsValueRow
            icon="map-outline"
            title="Online map"
            subtitle="Loads visible OpenStreetMap tiles when selected. Laneory does not upload the video or the complete GPS track for map display."
          />
          <SettingsValueRow
            icon="git-branch-outline"
            title="Local schematic"
            subtitle="Works entirely on this device with no online map tiles."
          />
        </SettingsSection>

        <SettingsSection title="Local connection privacy">
          <SettingsValueRow
            icon="wifi-outline"
            title="Camera Wi-Fi"
            subtitle="Direct local connection. Laneory does not store the camera Wi-Fi password."
          />
        </SettingsSection>

        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          Browsing and downloading use GET/HEAD. Camera settings change only when you explicitly select
          a new value and confirm Apply.
        </Text>
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  selector: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  option: {
    flex: 1,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  footnote: {
    fontSize: 12,
    fontFamily: Type.font,
    marginTop: 4,
    marginHorizontal: 4,
    lineHeight: 16,
  },
});
