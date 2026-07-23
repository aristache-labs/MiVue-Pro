import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SettingsChromeHeader } from "@/components/settings/SettingsChromeHeader";
import { Type, useAppTheme } from "@/constants/Theme";

type HelpSource = "settings-camera" | "onboarding" | "library";

function normalizeSource(raw: string | string[] | undefined): HelpSource | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "settings-camera" || value === "onboarding" || value === "library") {
    return value;
  }
  return undefined;
}

function navigateBackFromHelp(source: HelpSource | undefined): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  if (source === "settings-camera") {
    router.replace("/settings/camera" as Parameters<typeof router.replace>[0]);
    return;
  }
  if (source === "onboarding") {
    router.replace("/onboarding/connect" as Parameters<typeof router.replace>[0]);
    return;
  }
  router.replace("/(tabs)" as Parameters<typeof router.replace>[0]);
}

function HelpBlock({
  icon,
  title,
  body,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly body: string;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <View
      style={[
        styles.block,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
      ]}
    >
      <View style={styles.blockHead}>
        <Ionicons name={icon} size={18} color={colors.brand} />
        <Text style={[styles.blockTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.blockBody, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

function TroubleItem({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  const { colors, radius } = useAppTheme();
  const [open, setOpen] = useState(false);
  return (
    <View
      style={[
        styles.block,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
      ]}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={styles.troubleHeadBtn}
      >
        <Text style={[styles.blockTitle, { color: colors.text, flex: 1 }]}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>
      {open ? (
        <Text style={[styles.blockBody, { color: colors.textMuted, marginTop: 6 }]}>{body}</Text>
      ) : null}
    </View>
  );
}

export default function ConnectionHelpScreen() {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const source = normalizeSource(params.source);

  const onBack = useCallback(() => {
    navigateBackFromHelp(source);
  }, [source]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }, [onBack]),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsChromeHeader title="Connection help" onBack={onBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, 24) + 24,
          gap: 10,
        }}
      >
        <Text style={[styles.intro, { color: colors.textMuted }]}>
          Laneory uses read-only requests to list and download files you choose. Camera settings change
          only when you explicitly select a new value and confirm Apply.
        </Text>

        <HelpBlock
          icon="list-outline"
          title="Before you start"
          body="Park safely and keep the camera powered. You will leave your usual Wi‑Fi briefly while joined to the camera hotspot."
        />
        <HelpBlock
          icon="wifi-outline"
          title="Enable camera Wi‑Fi"
          body="On the camera, open its menu and turn on Wi‑Fi / app connection mode. Wait until the camera shows that Wi‑Fi is ready."
        />
        <HelpBlock
          icon="phone-portrait-outline"
          title="Connect your phone"
          body="In phone Wi‑Fi settings, join the camera network using the SSID and password shown on the camera. Laneory does not ask for that password."
        />
        <HelpBlock
          icon="return-down-back-outline"
          title="Return to Laneory"
          body="Open Laneory, then use Connect or Try connection. Recordings appear after a successful refresh."
        />

        <Text style={[styles.troubleHead, { color: colors.text }]}>Troubleshooting</Text>

        <TroubleItem
          title="Camera Wi‑Fi is not visible"
          body="Confirm Wi‑Fi mode is enabled on the camera and that you are close enough. Restart camera Wi‑Fi mode, then rescan on the phone."
        />
        <TroubleItem
          title="Phone says the network has no internet"
          body="That is normal for many dashcam hotspots. Stay connected — Laneory only needs local access to the camera."
        />
        <TroubleItem
          title="Local network permission was denied"
          body="On iOS, allow Laneory to find devices on local networks in system Settings. Without it, the app cannot reach the camera."
        />
        <TroubleItem
          title="Laneory cannot reach the camera"
          body="Confirm you are on the camera Wi‑Fi, check the camera IP in Settings if you changed it, then try Connect again."
        />
        <TroubleItem
          title="Connection was interrupted"
          body="The phone may have switched back to cellular or home Wi‑Fi. Rejoin the camera network and refresh the Library."
        />
        <TroubleItem
          title="Cellular while on camera Wi‑Fi"
          body="Some phones keep cellular data available; others do not. Camera browsing only works while linked to the camera network."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  intro: { fontSize: 14, fontFamily: Type.font, lineHeight: 20, marginBottom: 2 },
  block: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10 },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  blockTitle: { fontSize: 15, fontFamily: Type.fontSemi },
  blockBody: { fontSize: 13, fontFamily: Type.font, lineHeight: 18 },
  troubleHead: {
    fontSize: 12,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 2,
  },
  troubleHeadBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
