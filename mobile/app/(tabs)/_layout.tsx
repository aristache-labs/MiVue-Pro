import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { Link, Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet } from "react-native";

import Colors from "@/constants/Colors";
import { useAppTheme } from "@/constants/Theme";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

function TabBarIcon(props: {
  readonly name: React.ComponentProps<typeof Ionicons>["name"];
  readonly color: string;
  readonly focused: boolean;
}) {
  return <Ionicons size={23} name={props.name} color={props.color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: colors.textFaint,
        headerShown: useClientOnlyValue(false, true),
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: Platform.OS === "ios" ? "transparent" : colors.surface,
          borderTopColor: colors.border,
        },
        tabBarBackground:
          Platform.OS === "ios"
            ? () => (
                <BlurView
                  intensity={80}
                  tint={colorScheme === "dark" ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              )
            : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "albums" : "albums-outline"} color={color} focused={focused} />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="About Laneory" hitSlop={8}>
                {({ pressed }) => (
                  <Ionicons
                    name="information-circle-outline"
                    size={25}
                    color={colors.text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="local"
        options={{
          title: "Local",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "folder-open" : "folder-open-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: "Queue",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "cloud-download" : "cloud-download-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
