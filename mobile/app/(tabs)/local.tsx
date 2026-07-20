import Ionicons from "@expo/vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { router, useNavigation } from "expo-router";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatDuration } from "@/components/mediaMeta";
import { LocalFilterSheet } from "@/components/local/LocalFilterSheet";
import {
  buildFilterChips,
  clearFilterGroup,
  countActiveFilterGroups,
  EMPTY_FILTERS,
  filterNormalizedFiles,
  formatResultsSummary,
  formatSelectionSize,
  isFiltersEmpty,
  normalizeLocalFiles,
  pruneSelectionToUris,
  sumBytes,
  type LocalLibraryFilters,
} from "@/components/local/localLibraryFilters";
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

interface LibraryCardProps {
  readonly item: LocalMediaFile;
  readonly category: FileCategory;
  readonly durationSec?: number;
  readonly selecting: boolean;
  readonly selected: boolean;
  readonly onToggleSelect: (uri: string) => void;
  readonly onShare: (file: LocalMediaFile) => void;
  readonly onDelete: (file: LocalMediaFile) => void;
}

const LibraryCard = memo(function LibraryCard({
  item,
  category,
  durationSec,
  selecting,
  selected,
  onToggleSelect,
  onShare,
  onDelete,
}: LibraryCardProps) {
  const { colors, radius, scheme } = useAppTheme();
  const when = formatCompactDateTime(item.name);
  const sizeLabel =
    item.sizeBytes > 0
      ? `${(item.sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
      : "—";
  const typeLabel = CATEGORY_LABEL[category];
  const catAccent = categoryColor(category, scheme);
  const playA11y = item.kind === "image" ? `View ${item.name}` : `Play ${item.name}`;

  return (
    <Card
      style={[
        styles.card,
        {
          padding: 12,
          borderRadius: radius.md,
          borderColor: selected ? colors.brand : colors.border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Pressable
        disabled={!selecting}
        onPress={() => onToggleSelect(item.uri)}
        accessibilityRole={selecting ? "checkbox" : undefined}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityLabel={
          selecting
            ? selected
              ? `${item.name}, selected`
              : `Select ${item.name}`
            : undefined
        }
      >
        <View style={styles.row} pointerEvents={selecting ? "box-only" : "auto"}>
          <Pressable
            onPress={() => (selecting ? onToggleSelect(item.uri) : openLocalMedia(item))}
            accessibilityRole="button"
            accessibilityLabel={selecting ? `Select ${item.name}` : playA11y}
            style={({ pressed }) => [styles.thumbPress, { opacity: pressed ? 0.82 : 1 }]}
          >
            <VideoThumbnail uri={item.uri} kind={item.kind} width={THUMB_W} height={THUMB_H} />
            {!selecting ? (
              <>
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
              </>
            ) : (
              <View
                pointerEvents="none"
                style={[
                  styles.selectMark,
                  {
                    backgroundColor: selected ? colors.brand : colors.surface,
                    borderColor: selected ? colors.brand : colors.border,
                  },
                ]}
              >
                {selected ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
              </View>
            )}
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

          {!selecting ? (
            <View style={styles.side}>
              <View
                style={[styles.typeBadge, { backgroundColor: catAccent + "22" }]}
                accessibilityLabel={typeLabel}
              >
                <Text style={[styles.typeBadgeText, { color: catAccent }]}>{typeLabel}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onShare(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${item.name}`}
                  hitSlop={4}
                  style={({ pressed }) => [
                    styles.iconHit,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="share-outline" size={22} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => onDelete(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                  hitSlop={4}
                  style={({ pressed }) => [
                    styles.iconHit,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.side}>
              <View
                style={[styles.typeBadge, { backgroundColor: catAccent + "22" }]}
                accessibilityLabel={typeLabel}
              >
                <Text style={[styles.typeBadgeText, { color: catAccent }]}>{typeLabel}</Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </Card>
  );
});

export default function LocalLibraryScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const {
    localFiles,
    refreshLocalFiles,
    shareLocalFile,
    deleteLocalFile,
    deleteLocalFilesBatch,
    lastError,
    demoMode,
    files,
  } = useDemoMode();

  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<LocalLibraryFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [selectionActionsOpen, setSelectionActionsOpen] = useState(false);

  const refreshBusyRef = useRef(false);
  const actionGateRef = useRef(createUiActionGate());
  const selectionBarH = 0;
  const listBottomPad = Math.max(LOCAL_LIBRARY_LIST_BOTTOM_PADDING, 24 + tabBarHeight) + selectionBarH;

  const categoryByName = useMemo(() => {
    const map = new Map<string, FileCategory>();
    for (const f of files) map.set(f.name, f.category);
    return map;
  }, [files]);

  const durationByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) {
      if (f.durationSeconds !== undefined) map.set(f.name, f.durationSeconds);
    }
    return map;
  }, [files]);

  const normalized = useMemo(
    () => normalizeLocalFiles(localFiles, categoryByName),
    [localFiles, categoryByName],
  );

  const filtered = useMemo(
    () => filterNormalizedFiles(normalized, filters),
    [normalized, filters],
  );

  const filteredFiles = useMemo(() => filtered.map((n) => n.file), [filtered]);

  const sections = useMemo(() => buildLocalLibrarySections(filteredFiles), [filteredFiles]);

  const activeGroups = countActiveFilterGroups(filters);
  const chips = useMemo(() => buildFilterChips(filters), [filters]);
  const resultsSummary = useMemo(
    () => formatResultsSummary(filteredFiles.length, sumBytes(filteredFiles)),
    [filteredFiles],
  );

  const selectedFiles = useMemo(
    () => filteredFiles.filter((f) => selected.has(f.uri)),
    [filteredFiles, selected],
  );
  const selectedBytes = useMemo(() => sumBytes(selectedFiles), [selectedFiles]);

  // Drop vanished URIs after refresh; keep selection otherwise.
  useEffect(() => {
    setSelected((prev) => pruneSelectionToUris(prev, localFiles.map((f) => f.uri)));
  }, [localFiles]);

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
    setSelectionActionsOpen(false);
  }, []);

  const applyFilters = useCallback(
    (next: LocalLibraryFilters) => {
      setFilters(next);
      setFilterOpen(false);
      if (selecting) exitSelection();
      const count = filterNormalizedFiles(normalized, next).length;
      void AccessibilityInfo.announceForAccessibility(`${count} files found`);
    },
    [selecting, exitSelection, normalized],
  );

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

  const toggleSelect = useCallback((uri: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      setSelectionActionsOpen(next.size > 0);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected(new Set(filteredFiles.map((f) => f.uri)));
    setSelectionActionsOpen(true);
  }, [filteredFiles]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
    setSelectionActionsOpen(false);
  }, []);

  const confirmSingleDelete = useCallback(
    (file: LocalMediaFile) => {
      Alert.alert("Delete file?", `${file.name} will be removed from this device. This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void actionGateRef.current(async () => {
              await deleteLocalFile(file);
            }),
        },
      ]);
    },
    [deleteLocalFile],
  );

  const confirmBatchDelete = useCallback(() => {
    const n = selectedFiles.length;
    if (n === 0 || deleting) return;
    const size = formatSelectionSize(selectedBytes);
    Alert.alert(
      `Delete ${n} local files?`,
      `This will remove ${size} from this device.\nFiles on the camera will not be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete local files",
          style: "destructive",
          onPress: () => {
            void actionGateRef.current(async () => {
              setDeleting(true);
              try {
                const result = await deleteLocalFilesBatch(selectedFiles);
                exitSelection();
                const msg =
                  result.failed === 0
                    ? `${result.deleted} local files deleted`
                    : `${result.deleted} deleted · ${result.failed} could not be deleted`;
                setStatusMessage(msg);
                void AccessibilityInfo.announceForAccessibility(msg);
              } finally {
                setDeleting(false);
              }
            });
          },
        },
      ],
    );
  }, [selectedFiles, selectedBytes, deleting, deleteLocalFilesBatch, exitSelection]);

  useLayoutEffect(() => {
    if (selecting) {
      navigation.setOptions({
        headerTitle: () => (
          <Text style={[styles.navCenterTitle, { color: colors.text }]}>
            {selected.size} selected
          </Text>
        ),
        headerLeft: () => (
          <Pressable
            onPress={exitSelection}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={HitSlop44}
            style={styles.headerSideBtn}
          >
            <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 16 }}>Cancel</Text>
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            onPress={() => {
              if (selected.size === filteredFiles.length && filteredFiles.length > 0) deselectAll();
              else selectAllFiltered();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              selected.size === filteredFiles.length && filteredFiles.length > 0
                ? "Deselect all"
                : `Select all ${filteredFiles.length} results`
            }
            hitSlop={HitSlop44}
            style={styles.headerSideBtn}
          >
            <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 15 }} numberOfLines={1}>
              {selected.size === filteredFiles.length && filteredFiles.length > 0
                ? "Deselect all"
                : `Select all results (${filteredFiles.length})`}
            </Text>
          </Pressable>
        ),
        headerTitleAlign: "center",
      });
      return;
    }

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.navTitleWrap}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Local library</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>Saved on this device</Text>
        </View>
      ),
      headerLeft: () =>
        localFiles.length === 0 ? (
          <View style={{ width: LOCAL_ACTION_HIT }} />
        ) : (
          <Pressable
            onPress={() => setSelecting(true)}
            accessibilityRole="button"
            accessibilityLabel="Select files"
            hitSlop={HitSlop44}
            style={styles.headerSideBtn}
          >
            <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 16 }}>Select</Text>
          </Pressable>
        ),
      headerRight: () => (
        <View style={styles.headerRightRow}>
          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={
              activeGroups > 0
                ? `Filter local library, ${activeGroups} filters active`
                : "Filter local library"
            }
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.headerIconBtn,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="options-outline" size={22} color={colors.textMuted} />
            {activeGroups > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: colors.brand }]}>
                <Text style={[styles.filterBadgeText, { color: colors.onBrand }]}>{activeGroups}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => void runRefresh()}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh local library"
            accessibilityState={{ busy: refreshing, disabled: refreshing }}
            hitSlop={HitSlop44}
            style={({ pressed }) => [
              styles.headerIconBtn,
              { opacity: refreshing ? 0.5 : pressed ? 0.65 : 1 },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="refresh" size={22} color={colors.textMuted} />
            )}
          </Pressable>
        </View>
      ),
      headerTitleAlign: "center",
      headerRightContainerStyle: {
        paddingRight: Platform.OS === "ios" ? 4 : 8,
      },
      headerLeftContainerStyle: {
        paddingLeft: Platform.OS === "ios" ? 4 : 8,
      },
    });
  }, [
    navigation,
    selecting,
    selected.size,
    filteredFiles.length,
    localFiles.length,
    activeGroups,
    refreshing,
    colors,
    runRefresh,
    exitSelection,
    selectAllFiltered,
    deselectAll,
  ]);

  const emptyLibrary = localFiles.length === 0;
  const emptyFiltered = !emptyLibrary && filteredFiles.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {lastError ? (
        <Text style={[styles.error, { color: colors.danger, paddingHorizontal: spacing.lg }]}>
          {lastError}
        </Text>
      ) : null}
      {statusMessage ? (
        <Text style={[styles.status, { color: colors.textMuted, paddingHorizontal: spacing.lg }]}>
          {statusMessage}
        </Text>
      ) : null}

      {!isFiltersEmpty(filters) ? (
        <View style={styles.chipsBlock}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {chips.map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => {
                  const next = clearFilterGroup(filters, chip.id);
                  setFilters(next);
                  if (selecting) exitSelection();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${chip.group} filter`}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontFamily: Type.fontSemi, fontSize: 12 }}>
                  {chip.label} ×
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setFilters(EMPTY_FILTERS);
                if (selecting) exitSelection();
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              style={[styles.chip, { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}
            >
              <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 12 }}>
                Clear all
              </Text>
            </Pressable>
          </ScrollView>
          <Text style={[styles.resultsLine, { color: colors.textMuted }]}>{resultsSummary}</Text>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.uri}
        stickySectionHeadersEnabled={LOCAL_LIBRARY_STICKY_HEADERS}
        extraData={{ selecting, selectedSize: selected.size }}
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
          emptyFiltered ? (
            <EmptyState
              icon="funnel-outline"
              title="No files match these filters"
              subtitle="Try changing the date, time, category or media type."
              actionLabel="Clear filters"
              onAction={() => setFilters(EMPTY_FILTERS)}
            />
          ) : (
            <EmptyState
              icon="folder-open-outline"
              title="No local files yet"
              subtitle="Download from Library, then check back here."
            />
          )
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
          const category: FileCategory =
            item.kind === "image" ? "photo" : (categoryByName.get(item.name) ?? "unknown");
          return (
            <LibraryCard
              item={item}
              category={category}
              durationSec={durationByName.get(item.name)}
              selecting={selecting}
              selected={selected.has(item.uri)}
              onToggleSelect={toggleSelect}
              onShare={(f) => void actionGateRef.current(async () => shareLocalFile(f))}
              onDelete={confirmSingleDelete}
            />
          );
        }}
      />

      {selecting && selected.size > 0 && !selectionActionsOpen ? (
        <Pressable
          onPress={() => setSelectionActionsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${selected.size} local files`}
          style={({ pressed }) => [
            styles.selectionFab,
            {
              backgroundColor: colors.danger,
              bottom: tabBarHeight + 16,
              opacity: pressed ? 0.85 : 1,
              borderRadius: radius.lg,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={{ color: "#ffffff", fontFamily: Type.fontBold, fontSize: 15 }}>
            Delete local · {selected.size}
          </Text>
        </Pressable>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={selecting && selected.size > 0 && selectionActionsOpen}
        statusBarTranslucent
        onRequestClose={() => setSelectionActionsOpen(false)}
      >
        <View style={styles.selectionOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null}
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,12,20,0.55)" }]}
            onPress={() => setSelectionActionsOpen(false)}
            accessibilityLabel="Keep selecting"
          />
          <View
            style={[
              styles.selectionCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
            ]}
            accessibilityViewIsModal
          >
            <Text style={[styles.selectionTitle, { color: colors.text }]}>
              {selected.size} selected
            </Text>
            <Text style={[styles.selectionSub, { color: colors.textMuted }]}>
              {formatSelectionSize(selectedBytes)} on this device
            </Text>
            <Text style={[styles.selectionHint, { color: colors.textFaint }]}>
              Camera files will not be deleted.
            </Text>
            <Pressable
              onPress={confirmBatchDelete}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${selected.size} local files`}
              style={({ pressed }) => [
                styles.deleteLocalBtn,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.danger,
                  borderRadius: radius.md,
                  opacity: deleting || pressed ? 0.7 : 1,
                  minHeight: LOCAL_ACTION_HIT,
                },
              ]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.danger, fontFamily: Type.fontBold, fontSize: 16 }}>
                    Delete local
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={() => setSelectionActionsOpen(false)}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel="Keep selecting"
              hitSlop={8}
              style={({ pressed }) => [
                styles.selectionSecondary,
                { opacity: pressed ? 0.65 : 1, minHeight: LOCAL_ACTION_HIT },
              ]}
            >
              <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 15 }}>
                Keep selecting
              </Text>
            </Pressable>
            <Pressable
              onPress={deselectAll}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel="Deselect all"
              hitSlop={8}
              style={({ pressed }) => [
                styles.selectionSecondary,
                { opacity: pressed ? 0.65 : 1, minHeight: 40 },
              ]}
            >
              <Text style={{ color: colors.textMuted, fontFamily: Type.font, fontSize: 14 }}>
                Deselect all
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LocalFilterSheet
        visible={filterOpen}
        initial={filters}
        normalized={normalized}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  demoRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4, marginBottom: 4 },
  status: { fontSize: 12, fontFamily: Type.font, marginBottom: 4 },
  navTitleWrap: {
    alignItems: Platform.OS === "ios" ? "center" : "center",
  },
  navTitle: { fontSize: 17, fontFamily: Type.fontBold },
  navSubtitle: { fontSize: 11, fontFamily: Type.font, marginTop: 1 },
  navCenterTitle: { fontSize: 17, fontFamily: Type.fontBold },
  headerSideBtn: {
    minHeight: LOCAL_ACTION_HIT,
    minWidth: LOCAL_ACTION_HIT,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerRightRow: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: {
    width: LOCAL_ACTION_HIT,
    height: LOCAL_ACTION_HIT,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 10, fontFamily: Type.fontBold },
  chipsBlock: { paddingBottom: 4 },
  chipsRow: { paddingHorizontal: 16, gap: 8, alignItems: "center", paddingVertical: 6 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  resultsLine: {
    fontSize: 12,
    fontFamily: Type.font,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {},
      default: {},
    }),
  },
  sectionTitle: { flex: 1, fontSize: 11, fontFamily: Type.fontSemi, letterSpacing: 0.5 },
  sectionCount: { fontSize: 11, fontFamily: Type.font },
  card: { overflow: "hidden" },
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
  selectMark: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
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
  side: { alignItems: "flex-end", justifyContent: "center", gap: 6, flexShrink: 0 },
  typeBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-end" },
  typeBadgeText: { fontSize: 10, fontFamily: Type.fontSemi, letterSpacing: 0.3 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  iconHit: {
    width: LOCAL_ACTION_HIT,
    height: LOCAL_ACTION_HIT,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  selectionCard: {
    width: "100%",
    maxWidth: 360,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    zIndex: 2,
  },
  selectionTitle: { fontSize: 20, fontFamily: Type.fontBold, textAlign: "center" },
  selectionSub: { fontSize: 14, fontFamily: Type.font, marginTop: 6, textAlign: "center" },
  selectionHint: { fontSize: 12, fontFamily: Type.font, marginTop: 4, marginBottom: 18, textAlign: "center" },
  deleteLocalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  selectionSecondary: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: 4,
  },
  selectionFab: {
    position: "absolute",
    alignSelf: "center",
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: LOCAL_ACTION_HIT,
    paddingHorizontal: 18,
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
});
