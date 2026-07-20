import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image, StyleSheet, Text, View } from "react-native";

import { IconButton } from "@/components/ui";
import { useDemoMode } from "@/context/DemoModeContext";

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ uri?: string; name?: string; kind?: string }>();
  const uri = typeof params.uri === "string" ? params.uri : "";
  const name = typeof params.name === "string" ? params.name : "Media";
  const kind = typeof params.kind === "string" ? params.kind : "other";
  const { shareLocalFile } = useDemoMode();

  const isVideo = kind === "video" || name.toLowerCase().endsWith(".mp4");
  const isImage =
    kind === "image" ||
    name.toLowerCase().endsWith(".jpg") ||
    name.toLowerCase().endsWith(".jpeg");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: "modal" }} />

      {uri && isImage ? (
        <Image source={{ uri }} style={styles.media} resizeMode="contain" accessibilityLabel={name} />
      ) : null}

      {uri && isVideo ? <VideoPlayer uri={uri} /> : null}

      {!uri || (!isVideo && !isImage) ? (
        <View style={styles.centerMessage}>
          <Ionicons name="document-outline" size={40} color="#8A93A1" />
          <Text style={styles.centerText}>
            {uri ? "This file type has no in-app preview. Use Share to open elsewhere." : "Missing media URI."}
          </Text>
        </View>
      ) : null}

      <BlurView intensity={60} tint="dark" style={styles.topBar}>
        <IconButton icon="close" tone="neutral" onPress={() => router.back()} accessibilityLabel="Close player" />
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {name}
        </Text>
        <IconButton
          icon="share-outline"
          tone="neutral"
          onPress={() =>
            void shareLocalFile({
              name,
              uri,
              sizeBytes: 0,
              kind: isVideo ? "video" : isImage ? "image" : "other",
            })
          }
          accessibilityLabel={`Share ${name}`}
        />
      </BlurView>
    </View>
  );
}

function VideoPlayer({ uri }: { readonly uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.play();
  });

  return (
    <View style={styles.media}>
      <VideoView style={styles.videoView} player={player} allowsFullscreen allowsPictureInPicture nativeControls />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  media: { flex: 1, backgroundColor: "#000" },
  videoView: { flex: 1 },
  centerMessage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  centerText: { color: "#A7AFBC", textAlign: "center", marginTop: 12, fontSize: 13, lineHeight: 18 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  topBarTitle: { color: "#F2F4F7", fontSize: 14, fontWeight: "700", flex: 1, textAlign: "center", marginHorizontal: 8 },
});
