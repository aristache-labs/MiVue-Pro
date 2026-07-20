import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import { APP_NAME, APP_SHORT_DESCRIPTION, APP_SUBTITLE, DISCLAIMER_EN } from "@/constants/Brand";
import { Type, useAppTheme } from "@/constants/Theme";

function Section({
  icon,
  title,
  children,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly children: ReactNode;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.brand} style={{ marginRight: 8 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export default function ModalScreen() {
  const { colors, spacing } = useAppTheme();

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={[styles.brandRow, { marginBottom: spacing.lg }]}>
        <View style={[styles.logoDot, { backgroundColor: colors.brand }]} />
        <View>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            {APP_NAME}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{APP_SUBTITLE}</Text>
        </View>
      </View>

      <Section icon="information-circle-outline" title="About">
        <Text style={[styles.body, { color: colors.textMuted }]}>{APP_SHORT_DESCRIPTION}</Text>
      </Section>

      <Section icon="shield-checkmark-outline" title="Compatibility & disclaimer">
        <Text style={[styles.body, { color: colors.textMuted, marginBottom: 10 }]}>{DISCLAIMER_EN}</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Compatible (tested): Mio MiVue 866. Read-only list and download — Laneory never changes camera
          settings or deletes files on the camera.
        </Text>
      </Section>

      <Section icon="hardware-chip-outline" title="Runtime status">
        <Text style={[styles.body, { color: colors.textMuted, marginBottom: 10 }]}>
          Expo Go uses Fetch for live camera probes and FileSystem streaming for downloads. Native HTTP/1.0
          (Http10Tcp) requires an Apple Developer account and an EAS development build — deferred until the
          membership is active again.
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Demo Mode uses synthetic fixtures only — no camera traffic. GPS uses local NMEA sidecars; online
          map tiles load only after you opt in. Licenses: see Third-Party Notices at release.
        </Text>
      </Section>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoDot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: 22, fontFamily: Type.fontBold },
  subtitle: { fontSize: 13, fontFamily: Type.fontSemi, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontFamily: Type.fontSemi },
  body: { fontSize: 13, lineHeight: 19, fontFamily: Type.font },
});
