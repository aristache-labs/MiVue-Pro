import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import Colors from "@/constants/Colors";
import { Type, useAppTheme } from "@/constants/Theme";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

function TabBarIcon(props: {
  readonly name: React.ComponentProps<typeof Ionicons>["name"];
  readonly color: string;
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
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: Type.fontSemi, fontSize: 11 },
        headerShown: useClientOnlyValue(false, true),
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontFamily: Type.fontBold },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "albums" : "albums-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="local"
        options={{
          title: "Local library",
          tabBarLabel: "Local",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "folder-open" : "folder-open-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: "Download queue",
          tabBarLabel: "Queue",
          headerTitle: "Download queue",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "cloud-download" : "cloud-download-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          headerTitle: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? "settings" : "settings-outline"} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
