import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { Link, Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

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

function HeaderTitle({ title, subtitle }: { readonly title: string; readonly subtitle?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.headerTitleWrap}>
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
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
            <TabBarIcon name={focused ? "albums" : "albums-outline"} color={color} />
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
          title: "Local library",
          tabBarLabel: "Local",
          headerTitle: () => <HeaderTitle title="Local library" subtitle="Saved on this device" />,
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleWrap: {
    alignItems: Platform.OS === "ios" ? "center" : "flex-start",
    marginTop: Platform.OS === "ios" ? -2 : 0,
    paddingBottom: 6,
  },
  headerTitle: { fontSize: 17, fontFamily: Type.fontBold },
  headerSubtitle: { fontSize: 11, fontFamily: Type.font, marginTop: 0 },
});
