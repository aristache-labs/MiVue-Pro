import { Stack } from "expo-router";

import { useAppTheme } from "@/constants/Theme";

export default function OnboardingLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="add-camera" />
      <Stack.Screen name="select-camera" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
