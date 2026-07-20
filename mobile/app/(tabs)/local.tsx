import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatDuration } from "@/components/mediaMeta";
import {
  buildLocalLibrarySections,
  formatCompactDateTime,
  LOCAL_ACTION_HIT,
  LOCAL_LIBRARY_LIST_BOTTOM_PADDING,
  LOCAL_LIBRARY_STICKY_HEADERS,
} from "@/components/local/localLibrarySections";
import { createUiActionGate } from "@/components/queue/queuePresentation";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type LocalMediaFile } from "@/context/DemoModeContext";
import type { FileCategory } from "@/packages/parsers/src/index";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const THUMB_W = 84;
const THUMB_H = 63;

function displayMediaName(name: string): string {
  return name.replace(/\.(mp4|mov|m4v|jpg|jpeg|png|webp)$/iu, "");
}

function openLocalMedia(item: LocalMediaFile): void {
  const href =
    `/player?uri=${encodeURIComponent(item.uri)}&name=${encodeURIComponent(item.name)}&kind=${item.kind}` as const;
  router.push(href as Parameters<typeof router.push>[0]);
}

export default function LocalLibraryScreen() {
  const { colors, spacing, radius, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { localFiles, refreshLocalFiles, shareLocalFile, deleteLocalFile, lastError, demoMode, files } =
    useDemoMode();

  const [refreshing, setRefreshing] = useState(false);
  const refreshBusyRef = useRef(false);
  const actionGateRef = useRef(createUiActionGate());
  const listBottomPad = Math.max(LOCAL_LIBRARY_LIST_BOTTOM_PADDING, 64 + insets.bottom);

  const metaByName = useMemo(() => {
    const map = new Map<string, { durationSeconds?: number; category: FileCategory }>();
    for (const f of files) {
      map.set(f.name, {
        category: f.category,
        ...(f.durationSeconds !== undefined ? { durationSeconds: f.durationSeconds } : {}),
      });
    }
    return map;
  }, [files]);

  const sections = useMemo(() => buildLocalLibrarySections(localFiles), [localFiles]);

  const runRefresh = useCallback(async () => {
    if (refreshBusyRef.current) return;
    refreshBusyRef.current = true;
    setRefreshing(true);
    try {
      await refreshLocalFiles();
      void AccessibilityInfo.announceForAccessibility("Local library refreshed");
    } catch {
      void AccessibilityInfo.announceForAccessibility("Local library refresh failed");
    } finally {
      refreshBusyRef.current = false;
      setRefreshing(false);
    }
  }, [refreshLocalFiles]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => void runRefresh()}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh local library"
          accessibilityState={{ busy: refreshing, disabled: refreshing }}
          hitSlop={HitSlop44}
          style={({ pressed }) => [
            styles.headerRefresh,
            {
              width: LOCAL_ACTION_HIT,
              height: LOCAL_ACTION_HIT,
              opacity: refreshing ? 0.5 : pressed ? 0.65 : 1,
            },
          ]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons name="refresh" size={22} color={colors.textMuted} />
          )}
        </Pressable>
      ),
      headerRightContainerStyle: {
        paddingRight: Platform.OS === "ios" ? 8 : 12,
      },
    });
  }, [navigation, runRefresh, refreshing, colors.textMuted]);

  const confirmDelete = (file: LocalMediaFile) => {
    Alert.alert("Delete file?", `${file.name} will be removed from this device. This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteLocalFile(file) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {lastError ? (
        <Text style={[styles.error, { color: colors.danger, paddingHorizontal: spacing.lg }]}>
          {lastError}
        </Text>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.uri}
        stickySectionHeadersEnabled={LOCAL_LIBRARY_STICKY_HEADERS}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: listBottomPad,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          demoMode ? (
            <View style={styles.demoRow}>
              <Badge label="Demo Mode" tone="demo" icon="flask-outline" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No local files yet"
            subtitle="Download from Library, then check back here."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void runRefresh()}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              {
                backgroundColor: colors.bg,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
              {section.title}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{section.countLabel}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const meta = metaByName.get(item.name);
          const durationSec = meta?.durationSeconds;
          const when = formatCompactDateTime(item.name);
          const sizeLabel =
            item.sizeBytes > 0
              ? `${(item.sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
              : "—";
          const category: FileCategory =
            item.kind === "image" ? "photo" : (meta?.category ?? "unknown");
          const typeLabel = CATEGORY_LABEL[category];
          const catAccent = categoryColor(category, scheme);
          const playA11y = item.kind === "image" ? `View ${item.name}` : `Play ${item.name}`;

          return (
            <Card style={[styles.card, { padding: 12, borderRadius: radius.md }]}>
              <View style={styles.row}>
                <Pressable
                  onPress={() => openLocalMedia(item)}
                  accessibilityRole="button"
                  accessibilityLabel={playA11y}
                  style={({ pressed }) => [styles.thumbPress, { opacity: pressed ? 0.82 : 1 }]}
                >
                  <VideoThumbnail uri={item.uri} kind={item.kind} width={THUMB_W} height={THUMB_H} />
                  <View
                    pointerEvents="none"
                    style={[styles.thumbScrim, { backgroundColor: colors.bg, opacity: 0.35 }]}
                  />
                  <View pointerEvents="none" style={styles.playHit}>
                    <View
                      style={[
                        styles.playGlyph,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons
                        name={item.kind === "image" ? "eye" : "play"}
                        size={16}
                        color={colors.brand}
                        style={item.kind === "image" ? undefined : { marginLeft: 2 }}
                      />
                    </View>
                  </View>
                  {durationSec !== undefined && durationSec > 0 ? (
                    <View
                      pointerEvents="none"
                      style={[styles.durationBadge, { backgroundColor: colors.bg }]}
                    >
                      <Text style={[styles.durationText, { color: colors.text }]}>
                        {formatDuration(durationSec)}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>

                <View style={styles.body}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {displayMediaName(item.name)}
                  </Text>
                  {when ? (
                    <Text style={[styles.metaLine, { color: colors.textMuted }]} numberOfLines={1}>
                      {when}
                    </Text>
                  ) : null}
                  <Text style={[styles.metaLine, { color: colors.textMuted }]} numberOfLines={1}>
                    {sizeLabel}
                  </Text>
                </View>

                <View style={styles.side}>
                  <View
                    style={[styles.typeBadge, { backgroundColor: catAccent + "22" }]}
                    accessibilityLabel={typeLabel}
                  >
                    <Text style={[styles.typeBadgeText, { color: catAccent }]}>{typeLabel}</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() =>
                        void actionGateRef.current(async () => {
                          await shareLocalFile(item);
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Share ${item.name}`}
                      hitSlop={4}
                      style={({ pressed }) => [
                        styles.iconHit,
                        {
                          width: LOCAL_ACTION_HIT,
                          height: LOCAL_ACTION_HIT,
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="share-outline" size={22} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void actionGateRef.current(async () => {
                          confirmDelete(item);
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.name}`}
                      hitSlop={4}
                      style={({ pressed }) => [
                        styles.iconHit,
                        {
                          width: LOCAL_ACTION_HIT,
                          height: LOCAL_ACTION_HIT,
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={22} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  demoRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  headerRefresh: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4, marginBottom: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // Opaque sticky surface so cards do not show through.
    zIndex: 2,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {},
      default: {},
    }),
  },
  sectionTitle: {
    flex: 1,
    fontSize: 11,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: Type.font,
  },
  card: { overflow: "hidden" },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-end",
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: Type.fontSemi,
    letterSpacing: 0.3,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumbPress: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbScrim: {
    ...StyleSheet.absoluteFillObject,
    top: undefined,
    height: 28,
  },
  playHit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    opacity: 0.88,
  },
  durationText: { fontSize: 10, fontFamily: Type.monoMed },
  body: { flex: 1, minWidth: 0, justifyContent: "center" },
  name: { fontFamily: Type.fontSemi, fontSize: 13, lineHeight: 17 },
  metaLine: { fontSize: 12, fontFamily: Type.font, marginTop: 2, lineHeight: 16 },
  side: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    flexShrink: 0,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconHit: {
    width: LOCAL_ACTION_HIT,
    height: LOCAL_ACTION_HIT,
    alignItems: "center",
    justifyContent: "center",
  },
});
