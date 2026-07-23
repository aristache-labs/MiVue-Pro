import { Text, StyleSheet } from "react-native";

import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { Type, useAppTheme } from "@/constants/Theme";

export default function SettingsLicensesScreen() {
  const { colors } = useAppTheme();
  return (
    <SettingsScroll>
      <Text style={[styles.body, { color: colors.text }]}>
        Third-party open-source notices ship with the release build. Laneory uses Expo, React
        Native, and related libraries under their respective licences.
      </Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        A full licence inventory is maintained for commercial release review and is not presented
        here as legal advice.
      </Text>
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, fontFamily: Type.font, lineHeight: 22, marginBottom: 12 },
});
