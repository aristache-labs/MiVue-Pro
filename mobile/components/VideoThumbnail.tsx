import Ionicons from "@expo/vector-icons/Ionicons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/constants/Theme";

const cache = new Map<string, string>();

interface VideoThumbnailProps {
  readonly uri: string;
  readonly kind: "video" | "image" | "other";
  /** Square size when width/height omitted. */
  readonly size?: number;
  readonly width?: number;
  readonly height?: number;
}

/** Local video/image preview; falls back to a brand icon. */
export function VideoThumbnail({ uri, kind, size = 56, width, height }: VideoThumbnailProps) {
  const { colors, radius } = useAppTheme();
  const [thumb, setThumb] = useState<string | undefined>(() => cache.get(uri));
  const w = width ?? size;
  const h = height ?? size;

  useEffect(() => {
    if (kind === "image") {
      setThumb(uri);
      return;
    }
    if (kind !== "video") {
      setThumb(undefined);
      return;
    }
    const cached = cache.get(uri);
    if (cached) {
      setThumb(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await VideoThumbnails.getThumbnailAsync(uri, { time: 800, quality: 0.6 });
        if (cancelled) return;
        cache.set(uri, result.uri);
        setThumb(result.uri);
      } catch {
        if (!cancelled) setThumb(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri, kind]);

  return (
    <View
      style={[
        styles.box,
        {
          width: w,
          height: h,
          borderRadius: radius.sm,
          backgroundColor: colors.brandSoft,
        },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.image} accessibilityIgnoresInvertColors />
      ) : (
        <Ionicons
          name={kind === "image" ? "image" : kind === "video" ? "videocam" : "document"}
          size={Math.min(w, h) * 0.36}
          color={colors.brand}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
});
