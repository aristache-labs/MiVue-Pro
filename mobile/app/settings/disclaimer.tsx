import { Text, StyleSheet } from "react-native";

import { SettingsScroll } from "@/components/settings/SettingsScroll";
import { DISCLAIMER_EN } from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

export default function SettingsDisclaimerScreen() {
  const { colors } = useAppTheme();
  return (
    <SettingsScroll>
      <Text style={[styles.body, { color: colors.text }]}>{DISCLAIMER_EN}</Text>
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, fontFamily: Type.font, lineHeight: 22 },
});
