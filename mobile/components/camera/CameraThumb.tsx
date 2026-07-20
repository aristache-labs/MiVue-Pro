import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { CATEGORY_ICON, categoryColor } from "@/constants/CategoryStyle";
import { useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { FileCategory } from "@/packages/parsers/src/index";

interface CameraThumbProps {
  readonly remotePath: string;
  readonly category: FileCategory;
  readonly width: number;
  readonly height: number;
  readonly active?: boolean;
}

export const CameraThumb = memo(function CameraThumb({
  remotePath,
  category,
  width,
  height,
  active = true,
}: CameraThumbProps) {
  const { colors, radius, scheme } = useAppTheme();
  const { resolveCameraThumbUri } = useDemoMode();
  const [uri, setUri] = useState<string | undefined>();
  const accent = categoryColor(category, scheme);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      const next = await resolveCameraThumbUri(remotePath);
      if (!cancelled && next) setUri(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, remotePath, resolveCameraThumbUri]);

  return (
    <View
      style={[
        styles.wrap,
        { width, height, borderRadius: radius.sm, backgroundColor: accent + "22" },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {uri ? (
        <Image source={{ uri }} style={{ width, height, borderRadius: radius.sm }} />
      ) : (
        <Ionicons
          name={(CATEGORY_ICON[category] ?? "videocam-outline") as keyof typeof Ionicons.glyphMap}
          size={22}
          color={accent}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
