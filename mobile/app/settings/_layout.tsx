import { Stack } from "expo-router";

import { CONNECTION_HELP_BACK_TITLE } from "@/components/camera/cameraLibraryModel";
import { Type, useAppTheme } from "@/constants/Theme";

export default function SettingsStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.brand,
        headerTitleStyle: { color: colors.text, fontFamily: Type.fontSemi },
        headerShadowVisible: false,
        headerBackTitle: CONNECTION_HELP_BACK_TITLE,
        contentStyle: { backgroundColor: colors.bg },
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="camera" options={{ title: "Camera & Connection" }} />
      <Stack.Screen name="storage" options={{ title: "Downloads & Storage" }} />
      <Stack.Screen name="maps-privacy" options={{ title: "Maps & Privacy" }} />
      <Stack.Screen name="diagnostics" options={{ title: "Diagnostics" }} />
      <Stack.Screen name="legal" options={{ title: "Legal" }} />
      <Stack.Screen name="about" options={{ title: "About Laneory", headerShown: false }} />
    </Stack>
  );
}
