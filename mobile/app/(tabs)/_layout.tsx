import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";

import { Type } from "@/constants/Theme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { LaneoryTabBar } from "@/components/navigation/LaneoryTabBar";
import { SelectionTabChromeProvider } from "@/context/SelectionTabChromeContext";
import { useTheme } from "@/src/contexts/ThemeContext";

function TabBarIcon(props: {
  readonly name: React.ComponentProps<typeof Ionicons>["name"];
  readonly color: string;
}) {
  return <Ionicons size={23} name={props.name} color={props.color} />;
}

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <SelectionTabChromeProvider>
      <Tabs
        tabBar={(props) => <LaneoryTabBar {...props} />}
        screenOptions={{
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarLabelStyle: { fontFamily: Type.fontSemi, fontSize: 11 },
          headerShown: useClientOnlyValue(false, true),
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text, fontFamily: Type.fontBold },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
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
              <TabBarIcon
                name={focused ? "cloud-download" : "cloud-download-outline"}
                color={color}
              />
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
    </SelectionTabChromeProvider>
  );
}
