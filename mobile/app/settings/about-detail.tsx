import { Text, StyleSheet } from "react-native";

import { SettingsScroll } from "@/components/settings/SettingsScroll";
import {
  APP_NAME,
  APP_SHORT_DESCRIPTION,
  APP_SUBTITLE,
} from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

export default function SettingsAboutDetailScreen() {
  const { colors } = useAppTheme();
  return (
    <SettingsScroll>
      <Text style={[styles.title, { color: colors.text }]}>{APP_NAME}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>{APP_SUBTITLE}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{APP_SHORT_DESCRIPTION}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        Laneory is a local-first library for compatible Mio MiVue cameras you own. Browse and
        download over the camera Wi‑Fi using read-only GET/HEAD requests. It is an independent
        product — not an official Mio or MiTAC app.
      </Text>
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontFamily: Type.fontBold, marginBottom: 4 },
  sub: { fontSize: 14, fontFamily: Type.fontSemi, marginBottom: 16 },
  body: { fontSize: 15, fontFamily: Type.font, lineHeight: 22, marginBottom: 12 },
});
