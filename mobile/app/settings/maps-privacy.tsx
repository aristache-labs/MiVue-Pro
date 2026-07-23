import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LEGAL_DRAFT_BANNER } from "@/components/onboarding";
import {
  SettingsActionRow,
  SettingsSection,
  SettingsValueRow,
} from "@/components/settings";
import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type MapPreference } from "@/context/DemoModeContext";

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
  const { mapPreference, setMapPreference } = useDemoMode();

  const setPref = (next: MapPreference) => {
    if (next !== mapPreference) setMapPreference(next);
  };

  return (
    <SettingsScroll>
      <SettingsSection title="Map preference">
        <View style={styles.selector}>
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
          subtitle="Loads only visible map tiles via Google Maps SDK when Online map is selected. Laneory does not upload the video or the complete GPS track as part of map display."
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
          title="Camera Wi‑Fi"
          subtitle="The camera is reached directly on the local Wi‑Fi network. Laneory does not ask for or store the camera Wi‑Fi password. Downloaded media stays in app storage until you export or delete it."
        />
        <SettingsActionRow
          icon="shield-outline"
          title="Privacy Policy"
          subtitle={LEGAL_DRAFT_BANNER}
          onPress={() =>
            router.push("/legal-document?doc=privacy" as Parameters<typeof router.push>[0])
          }
        />
      </SettingsSection>

      <Text style={[styles.footnote, { color: colors.textFaint }]}>
        Communication with the camera is GET/HEAD read-only.
      </Text>
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
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
