import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>[NUMELE_APLICAȚIEI]</Text>
      <Text style={styles.body}>
        Independent local-first app for read-only interoperability with user-owned dashcams. Compatible
        (tested): Mio MiVue 866 — see docs/compatibility.md. Not affiliated with Mio or MiTAC.
      </Text>
      <Text style={styles.body}>
        Foundation build: Expo prebuild / development builds. Camera HTTP/1.0 TCP uses NativeTcpTransport
        after prebuild (stub in this release). Demo Mode uses synthetic fixtures only.
      </Text>
      <Text style={styles.body}>Licenses: see About / third-party notices (populated at release).</Text>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20, opacity: 0.85 },
});
