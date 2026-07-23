import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from "@expo-google-fonts/source-sans-3";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { router, Stack, useSegments, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { CONNECTION_HELP_BACK_TITLE } from "@/components/camera/cameraLibraryModel";
import { shouldAllowGateBypassSegment } from "@/components/onboarding/connectionErrors";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { DemoModeProvider, useDemoMode } from "@/context/DemoModeContext";
import { Palette, Type } from "@/constants/Theme";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

const LaneoryLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Palette.light.brand,
    background: Palette.light.bg,
    card: Palette.light.surface,
    text: Palette.light.text,
    border: Palette.light.border,
    notification: Palette.light.live,
  },
};

const LaneoryDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Palette.dark.brand,
    background: Palette.dark.bg,
    card: Palette.dark.surface,
    text: Palette.dark.text,
    border: Palette.dark.border,
    notification: Palette.dark.live,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <OnboardingProvider>
      <DemoModeProvider>
        <RootLayoutNav />
      </DemoModeProvider>
    </OnboardingProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { ready, gateActive } = useOnboarding();
  const { cameraBootstrapDone } = useDemoMode();
  const segments = useSegments();
  const top = String(segments[0] ?? "");
  const allowOutsideOnboarding = shouldAllowGateBypassSegment(top);
  const bootReady = ready && cameraBootstrapDone;

  useEffect(() => {
    if (bootReady) {
      void SplashScreen.hideAsync();
    }
  }, [bootReady]);

  // Prefer imperative replace over focus Redirect — on Android, focus Redirect
  // can race the root stack and surface unhandled GO_BACK in Expo Go.
  useEffect(() => {
    if (!bootReady) return;
    if (gateActive && !allowOutsideOnboarding) {
      router.replace("/onboarding" as Href);
    }
  }, [bootReady, gateActive, allowOutsideOnboarding]);

  if (!bootReady) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? LaneoryDark : LaneoryLight}>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: Type.fontSemi },
          headerStyle: {
            backgroundColor: colorScheme === "dark" ? Palette.dark.bg : Palette.light.bg,
          },
          contentStyle: {
            backgroundColor: colorScheme === "dark" ? Palette.dark.bg : Palette.light.bg,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false, animation: "fade" }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "About" }} />
        <Stack.Screen
          name="connection-help"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="legal-document" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false, headerBackTitle: CONNECTION_HELP_BACK_TITLE }}
        />
        <Stack.Screen
          name="player"
          options={{ presentation: "fullScreenModal", headerShown: false, title: "Player" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
