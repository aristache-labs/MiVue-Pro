import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Type, useAppTheme } from "@/constants/Theme";

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

export default function ConnectionHelpScreen() {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: Math.max(insets.bottom, 24) + 24,
        gap: 12,
      }}
    >
      <Text style={[styles.intro, { color: colors.textMuted }]}>
        Laneory talks to your dashcam only over the camera’s Wi‑Fi network, using read-only requests.
      </Text>

      <HelpBlock
        icon="list-outline"
        title="Before you start"
        body="Park safely. Keep the camera powered. You will leave your usual Wi‑Fi briefly while connected to the camera hotspot."
      />
      <HelpBlock
        icon="wifi-outline"
        title="Enable camera Wi‑Fi"
        body="On the camera, open its menu and turn on the app / Wi‑Fi connection mode. Wait until the camera shows that Wi‑Fi is ready."
      />
      <HelpBlock
        icon="phone-portrait-outline"
        title="Connect your phone"
        body="In your phone’s Wi‑Fi settings, join the camera’s network. Use the SSID and password shown on the camera screen. Laneory does not collect that password."
      />
      <HelpBlock
        icon="return-down-back-outline"
        title="Return to Laneory"
        body="Open Laneory again, then use Connect or Try connection on the Library tab. Recordings appear after a successful read-only refresh."
      />

      <Text style={[styles.troubleHead, { color: colors.text }]}>Troubleshooting</Text>

      <HelpBlock
        icon="search-outline"
        title="Camera Wi‑Fi is not visible"
        body="Confirm Wi‑Fi mode is enabled on the camera and that you are close enough. Restart camera Wi‑Fi mode, then rescan networks on the phone."
      />
      <HelpBlock
        icon="cloud-offline-outline"
        title="Phone says the network has no internet"
        body="That is normal for many dashcam hotspots. Stay connected anyway — Laneory only needs local access to the camera."
      />
      <HelpBlock
        icon="shield-outline"
        title="Local network permission was denied"
        body="On iOS, allow Laneory to find devices on local networks in system Settings. Without it, the app cannot reach the camera."
      />
      <HelpBlock
        icon="alert-circle-outline"
        title="Laneory cannot reach the camera"
        body="Confirm you are on the camera Wi‑Fi, check the camera IP in Laneory Settings if you changed it, then try Connect again."
      />
      <HelpBlock
        icon="flash-outline"
        title="Connection was interrupted"
        body="The phone may have switched back to cellular or home Wi‑Fi. Rejoin the camera network and refresh the Library."
      />
      <HelpBlock
        icon="cellular-outline"
        title="Cellular while on camera Wi‑Fi"
        body="Some phones keep cellular data available; others do not. Either way, browsing and downloads from the camera only work while linked to the camera network."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, fontFamily: Type.font, lineHeight: 20, marginBottom: 4 },
  block: { borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  blockTitle: { fontSize: 15, fontFamily: Type.fontSemi },
  blockBody: { fontSize: 13, fontFamily: Type.font, lineHeight: 18 },
  troubleHead: {
    fontSize: 13,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
});
