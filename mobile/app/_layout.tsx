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
import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import {
  ErrorBoundary as RouterErrorBoundary,
  router,
  Stack,
  useSegments,
  type ErrorBoundaryProps,
  type Href,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import "react-native-reanimated";

import { CONNECTION_HELP_BACK_TITLE } from "@/components/camera/cameraLibraryModel";
import { shouldAllowGateBypassSegment } from "@/components/onboarding/connectionErrors";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { StartupLoadingScreen } from "@/components/startup/StartupLoadingScreen";
import {
  appLog,
  hydrateAppLogs,
  installConsoleAppLogCapture,
} from "@/components/diagnostics/appLogStore";
import { DemoModeProvider, useDemoMode } from "@/context/DemoModeContext";
import { Type } from "@/constants/Theme";
import { ThemeProvider, useTheme } from "@/src/contexts/ThemeContext";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    appLog.error("ui", `unhandled render error: ${error.message}`);
  }, [error]);

  return (
    <RouterErrorBoundary
      error={error}
      retry={() => {
        appLog.info("ui", "render error retry requested");
        return retry();
      }}
    />
  );
}

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

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
    if (error) {
      appLog.error("load", `font loading failed: ${error.message}`);
      throw error;
    }
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <OnboardingProvider>
        <DemoModeProvider>
          <RootLayoutNav />
        </DemoModeProvider>
      </OnboardingProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  const { ready, gateActive } = useOnboarding();
  const { cameraBootstrapDone } = useDemoMode();
  const segments = useSegments();
  const top = String(segments[0] ?? "");
  const allowOutsideOnboarding = shouldAllowGateBypassSegment(top);
  const bootReady = ready && cameraBootstrapDone;
  const splashHiddenRef = useRef(false);
  const startupLoggedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const routePath = segments.join("/") || "root";

  useEffect(() => {
    void hydrateAppLogs();
    const restoreConsoleCapture = installConsoleAppLogCapture();
    appLog.info("load", "application shell mounted");
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current === nextState) return;
      appLog.info("background", `app state ${appStateRef.current} -> ${nextState}`);
      appStateRef.current = nextState;
    });
    return () => {
      subscription.remove();
      restoreConsoleCapture();
    };
  }, []);

  useEffect(() => {
    appLog.info("navigation", `route ${routePath}`);
  }, [routePath]);

  useEffect(() => {
    if (!bootReady || startupLoggedRef.current) return;
    startupLoggedRef.current = true;
    appLog.info("load", "startup complete; navigation ready");
  }, [bootReady]);

  const hideNativeSplash = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    void SplashScreen.hideAsync().catch(() => {
      // Already hidden or unavailable — safe to ignore.
    });
  }, []);

  // Prefer imperative replace over focus Redirect — on Android, focus Redirect
  // can race the root stack and surface unhandled GO_BACK in Expo Go.
  useEffect(() => {
    if (!bootReady) return;
    if (gateActive && !allowOutsideOnboarding) {
      router.replace("/onboarding" as Href);
    }
  }, [bootReady, gateActive, allowOutsideOnboarding]);

  if (!bootReady) {
    return <StartupLoadingScreen onLayout={hideNativeSplash} />;
  }

  // Bridge custom theme to React Navigation's ThemeProvider
  const navTheme = isDark ? {
    ...NavDarkTheme,
    colors: {
      ...NavDarkTheme.colors,
      primary: theme.colors.brand,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.brand,
    },
  } : {
    ...NavDefaultTheme,
    colors: {
      ...NavDefaultTheme.colors,
      primary: theme.colors.brand,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.brand,
    },
  };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: Type.fontSemi },
          headerStyle: {
            backgroundColor: theme.colors.bg,
          },
          contentStyle: {
            backgroundColor: theme.colors.bg,
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
    </NavThemeProvider>
  );
}
