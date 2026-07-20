import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatDuration, parseRecordedParts } from "@/components/mediaMeta";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { CATEGORY_LABEL, categoryColor } from "@/constants/CategoryStyle";
import { Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type LocalMediaFile } from "@/context/DemoModeContext";
import type { FileCategory } from "@/packages/parsers/src/index";

const THUMB_W = 88;
const THUMB_H = 66;

interface LocalSection {
  readonly title: string;
  readonly countLabel: string;
  readonly dayKey: string;
  readonly data: readonly LocalMediaFile[];
}

function dayKeyFromName(name: string): string {
  const parts = parseRecordedParts(name);
  if (!parts) return "unknown";
  return parts.isoLocal.slice(0, 10);
}

function formatSectionHeading(dayKey: string): string {
  if (dayKey === "unknown") return "NECUNOSCUT";
  const d = new Date(`${dayKey}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return dayKey.toUpperCase();
  return d
    .toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

function formatCountLabel(count: number): string {
  return count === 1 ? "1 fișier" : `${count} fișiere`;
}

/** Compact localized card line: `19 iul. 2026 · 13:50`. */
function formatCompactDateTime(name: string): string | undefined {
  const parts = parseRecordedParts(name);
  if (!parts) return undefined;
  const d = new Date(`${parts.isoLocal.replace(" ", "T")}`);
  if (!Number.isFinite(d.getTime())) {
    return `${parts.date} · ${parts.time.slice(0, 5)}`;
  }
  const date = d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date} · ${parts.time.slice(0, 5)}`;
}

function formatSizeMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  }
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

function openLocalMedia(item: LocalMediaFile): void {
  const href =
    `/player?uri=${encodeURIComponent(item.uri)}&name=${encodeURIComponent(item.name)}&kind=${item.kind}` as const;
  router.push(href as Parameters<typeof router.push>[0]);
}

export default function LocalLibraryScreen() {
  const { colors, spacing, radius, scheme } = useAppTheme();
  const { localFiles, refreshLocalFiles, shareLocalFile, deleteLocalFile, lastError, demoMode, files } =
    useDemoMode();

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

  const sections = useMemo<LocalSection[]>(() => {
    const sorted = [...localFiles].sort((a, b) => {
      const ka = dayKeyFromName(a.name);
      const kb = dayKeyFromName(b.name);
      if (ka !== kb) {
        if (ka === "unknown") return 1;
        if (kb === "unknown") return -1;
        return kb.localeCompare(ka);
      }
      const pa = parseRecordedParts(a.name);
      const pb = parseRecordedParts(b.name);
      const ta = pa?.isoLocal ?? a.name;
      const tb = pb?.isoLocal ?? b.name;
      return tb.localeCompare(ta);
    });

    const map = new Map<string, LocalMediaFile[]>();
    for (const file of sorted) {
      const key = dayKeyFromName(file.name);
      const list = map.get(key);
      if (list) list.push(file);
      else map.set(key, [file]);
    }

    return [...map.entries()].map(([dayKey, data]) => ({
      dayKey,
      title: formatSectionHeading(dayKey),
      countLabel: formatCountLabel(data.length),
      data,
    }));
  }, [localFiles]);

  const confirmDelete = (file: LocalMediaFile) => {
    Alert.alert("Delete file?", `${file.name} will be removed from this device. This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteLocalFile(file) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingHorizontal: spacing.lg }]}>
      {demoMode ? (
        <View style={[styles.headerRow, { paddingTop: spacing.lg }]}>
          <Badge label="Demo Mode" tone="demo" icon="flask-outline" />
        </View>
      ) : (
        <View style={{ height: spacing.md }} />
      )}

      <Pressable
        onPress={() => void refreshLocalFiles()}
        accessibilityRole="button"
        accessibilityLabel="Refresh local library"
        style={({ pressed }) => [
          styles.refreshBtn,
          { borderColor: colors.border, borderRadius: radius.sm, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="refresh" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
        <Text style={[styles.refreshText, { color: colors.textMuted }]}>Refresh</Text>
      </Pressable>

      {lastError ? <Text style={[styles.error, { color: colors.danger }]}>{lastError}</Text> : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.uri}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No local files yet"
            subtitle="Download from Library, then check back here."
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
              {section.title}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textFaint }]}>{section.countLabel}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const meta = metaByName.get(item.name);
          const durationSec = meta?.durationSeconds;
          const when = formatCompactDateTime(item.name);
          const sizeLabel = formatSizeMb(item.sizeBytes);
          const category: FileCategory =
            item.kind === "image" ? "photo" : (meta?.category ?? "unknown");
          const typeLabel = CATEGORY_LABEL[category];
          const catAccent = categoryColor(category, scheme);
          const playA11y = item.kind === "image" ? `View ${item.name}` : `Play ${item.name}`;

          return (
            <Card style={[styles.card, { padding: 12, borderRadius: radius.md }]}>
              <View
                style={[styles.typeBadge, { backgroundColor: catAccent + "22" }]}
                accessibilityLabel={typeLabel}
              >
                <Text style={[styles.typeBadgeText, { color: catAccent }]}>{typeLabel}</Text>
              </View>

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
                  <Text
                    style={[styles.name, { color: colors.text, paddingRight: 64 }]}
                    numberOfLines={1}
                  >
                    {item.name}
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

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => void shareLocalFile(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${item.name}`}
                    hitSlop={4}
                    style={({ pressed }) => [styles.iconHit, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name="share-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                    hitSlop={4}
                    style={({ pressed }) => [styles.iconHit, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    minHeight: 0,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  refreshText: { fontSize: 13, fontFamily: Type.fontSemi },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4, marginBottom: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    paddingBottom: 8,
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
  card: { overflow: "hidden", position: "relative" },
  typeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
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
  name: { fontFamily: Type.fontSemi, fontSize: 14, lineHeight: 18 },
  metaLine: { fontSize: 12, fontFamily: Type.font, marginTop: 2, lineHeight: 16 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  iconHit: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
