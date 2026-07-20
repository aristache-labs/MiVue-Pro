import { Stack, useLocalSearchParams } from "expo-router";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image, Pressable, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
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
      <Stack.Screen options={{ title: name, presentation: "modal" }} />
      <Text style={styles.title}>{name}</Text>

      {!uri ? <Text style={styles.error}>Missing media URI.</Text> : null}

      {uri && isImage ? (
        <Image source={{ uri }} style={styles.image} resizeMode="contain" accessibilityLabel={name} />
      ) : null}

      {uri && isVideo ? <VideoPlayer uri={uri} /> : null}

      {uri && !isVideo && !isImage ? (
        <Text style={styles.meta}>This file type has no in-app preview. Use Share to open elsewhere.</Text>
      ) : null}

      {uri ? (
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() =>
            void shareLocalFile({
              name,
              uri,
              sizeBytes: 0,
              kind: isVideo ? "video" : isImage ? "image" : "other",
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Share ${name}`}
        >
          <Text style={styles.secondaryText}>Share / Save to Files</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function VideoPlayer({ uri }: { readonly uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.play();
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  return (
    <>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />
      <Pressable
        style={styles.button}
        onPress={() => {
          if (isPlaying) player.pause();
          else player.play();
        }}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
      >
        <Text style={styles.buttonText}>{isPlaying ? "Pause" : "Play"}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  meta: { opacity: 0.75, marginBottom: 12 },
  error: { color: "#b00020", marginBottom: 12 },
  image: { width: "100%", height: 360, backgroundColor: "#1113", marginBottom: 12 },
  video: { width: "100%", height: 280, backgroundColor: "#000", marginBottom: 12 },
  button: {
    backgroundColor: "#1f4b3a",
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#1f4b3a",
  },
  secondaryText: { color: "#1f4b3a", fontWeight: "700" },
});
