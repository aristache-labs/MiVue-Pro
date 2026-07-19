import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { APP_NAME, APP_SHORT_DESCRIPTION, APP_SUBTITLE, DISCLAIMER_EN } from "@/constants/Brand";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.subtitle}>{APP_SUBTITLE}</Text>
      <Text style={styles.body}>{APP_SHORT_DESCRIPTION}</Text>
      <Text style={styles.body}>{DISCLAIMER_EN}</Text>
      <Text style={styles.body}>
        Compatible (tested): Mio MiVue 866. Read-only list and download. Foundation build: Expo SDK 54;
        full camera HTTP/1.0 requires a development build.
      </Text>
      <Text style={styles.body}>Licenses: see Third-Party Notices at release.</Text>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 15, fontWeight: "600", opacity: 0.85 },
  body: { fontSize: 14, lineHeight: 20, opacity: 0.85 },
});
