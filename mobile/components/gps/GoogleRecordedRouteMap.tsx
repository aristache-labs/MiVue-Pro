import { Pressable, StyleSheet, Text, View } from "react-native";

import { SchematicRoute } from "@/components/gps/SchematicRoute";
import type { GoogleRecordedRouteMapProps } from "@/components/gps/GoogleRecordedRouteMap.types";
import { Type, useAppTheme } from "@/constants/Theme";

export type {
  MapFollowPose,
  GoogleRecordedRouteMapProps,
} from "@/components/gps/GoogleRecordedRouteMap.types";
export { isGoogleMapsSdkConfigured } from "@/components/gps/GoogleRecordedRouteMap.types";

/**
 * Default / web entry — no `react-native-maps` import (keeps typecheck + web builds clean).
 * Native builds resolve `GoogleRecordedRouteMap.native.tsx` (PROVIDER_GOOGLE) instead.
 */
export function GoogleRecordedRouteMap({
  samples,
  pose,
  height = 220,
  onUseLocalMap,
}: GoogleRecordedRouteMapProps) {
  const { colors, radius } = useAppTheme();
  const index = pose?.index ?? 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          height,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceMuted,
        },
      ]}
    >
      <SchematicRoute samples={samples} activeIndex={index} height={Math.max(120, height - 40)} />
      <Text style={[styles.note, { color: colors.textMuted }]}>
        Online Google Maps requires the iOS/Android app. Showing local schematic here.
      </Text>
      {onUseLocalMap ? (
        <Pressable
          onPress={onUseLocalMap}
          accessibilityRole="button"
          accessibilityLabel="Use local schematic"
          style={({ pressed }) => [
            styles.btn,
            { borderColor: colors.brand, opacity: pressed ? 0.75 : 1, minHeight: 44 },
          ]}
        >
          <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 13 }}>
            Use local schematic
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  note: {
    fontFamily: Type.font,
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 12,
    marginTop: 4,
  },
  btn: {
    alignSelf: "center",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
