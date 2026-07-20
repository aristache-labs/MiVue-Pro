import Ionicons from "@expo/vector-icons/Ionicons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import {
  loadVideoThumb,
  peekVideoThumbCache,
  rememberVideoThumb,
} from "@/components/videoThumbCache";
import { useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";

interface QueueThumbnailProps {
  readonly remotePath: string;
  readonly localName: string;
  readonly kind: "video" | "image" | "other";
  readonly width: number;
  readonly height: number;
}

/**
 * Queue preview: prefer Local Library / completed file frame, else camera SD `/thumb`.
 * Never downloads the full video just for a thumbnail.
 */
export function QueueThumbnail({
  remotePath,
  localName,
  kind,
  width,
  height,
}: QueueThumbnailProps) {
  const { colors, radius } = useAppTheme();
  const { localFiles, resolveCameraThumbUri } = useDemoMode();
  const localUri = localFiles.find((f) => f.name === localName)?.uri;
  const [thumb, setThumb] = useState<string | undefined>(() =>
    localUri ? peekVideoThumbCache(localUri) ?? peekVideoThumbCache(localName) : peekVideoThumbCache(localName),
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (kind === "image" && localUri) {
        if (!cancelled) setThumb(localUri);
        return;
      }

      if (kind === "video" && localUri) {
        const cached = peekVideoThumbCache(localUri) ?? peekVideoThumbCache(localName);
        if (cached) {
          if (!cancelled) setThumb(cached);
          return;
        }
        const generated = await loadVideoThumb(localUri, async (sourceUri) => {
          const result = await VideoThumbnails.getThumbnailAsync(sourceUri, {
            time: 800,
            quality: 0.6,
          });
          return result.uri;
        });
        if (generated && !cancelled) {
          setThumb(generated);
          return;
        }
      }

      const fromCamera = await resolveCameraThumbUri(remotePath);
      if (fromCamera && !cancelled) {
        rememberVideoThumb(localName, fromCamera);
        if (localUri) rememberVideoThumb(localUri, fromCamera);
        setThumb(fromCamera);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, localUri, localName, remotePath, resolveCameraThumbUri]);

  return (
    <View
      style={[
        styles.box,
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: colors.brandSoft,
        },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Ionicons
          name={kind === "image" ? "image" : kind === "video" ? "videocam" : "document"}
          size={Math.min(width, height) * 0.36}
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
