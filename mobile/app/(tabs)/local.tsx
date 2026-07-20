import Ionicons from "@expo/vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
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

import { formatCountAbbrev } from "@/components/camera/cameraLibraryModel";
import {
  deleteLocalA11yLabel,
  deleteLocalButtonLabel,
  deleteLocalPartialMessage,
  deleteLocalSuccessMessage,
  deleteLocalTitle,
  selectAllFilteredA11yLabel,
} from "@/components/local/localCopy";
import { LocalFilterSheet } from "@/components/local/LocalFilterSheet";
import {
  buildFilterChips,
  clearFilterGroup,
  countActiveFilterGroups,
  countLocalCategories,
  EMPTY_FILTERS,
  filterNormalizedFiles,
  formatResultsSummary,
  formatSelectionSize,
  isFiltersEmpty,
  LOCAL_CATEGORY_CHIPS,
  normalizeLocalFiles,
  pruneSelectionToUris,
  sanitizeLocalFiltersForCategoryScope,
  scopeNormalizedFiles,
  sumBytes,
  type LocalCategoryScope,
  type LocalLibraryFilters,
} from "@/components/local/localLibraryFilters";
import { LocalLibraryCard } from "@/components/local/LocalLibraryCard";
import {
  buildLocalLibrarySections,
  LOCAL_ACTION_HIT,
  LOCAL_LIBRARY_LIST_BOTTOM_PADDING,
  LOCAL_LIBRARY_STICKY_HEADERS,
} from "@/components/local/localLibrarySections";
import { createUiActionGate } from "@/components/queue/queuePresentation";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type LocalMediaFile } from "@/context/DemoModeContext";
import type { FileCategory } from "@/packages/parsers/src/index";

/** Compact sticky delete strip under the nav header (wide, not tall). */
const SELECTION_DELETE_BAR_H = 44;

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
  const [category, setCategory] = useState<LocalCategoryScope>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const refreshBusyRef = useRef(false);
  const actionGateRef = useRef(createUiActionGate());
  const deleteBarAnim = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      // RN versions differ: subscription may be EventSubscription or void
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);

  const showDeleteBar = selecting && selected.size > 0;

  useEffect(() => {
    Animated.timing(deleteBarAnim, {
      toValue: showDeleteBar ? 1 : 0,
      duration: reduceMotion ? 0 : 220,
      useNativeDriver: false,
    }).start();
  }, [showDeleteBar, reduceMotion, deleteBarAnim]);

  const selectionBarH = 0;
  const listBottomPad = Math.max(LOCAL_LIBRARY_LIST_BOTTOM_PADDING, 24 + tabBarHeight);

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

  const categoryCounts = useMemo(() => countLocalCategories(normalized), [normalized]);

  const scoped = useMemo(
    () => scopeNormalizedFiles(normalized, category),
    [normalized, category],
  );

  const filtered = useMemo(
    () => filterNormalizedFiles(scoped, filters),
    [scoped, filters],
  );

  const filteredFiles = useMemo(() => filtered.map((n) => n.file), [filtered]);

  const sections = useMemo(() => buildLocalLibrarySections(filteredFiles), [filteredFiles]);

  useEffect(() => {
    setFilters((prev) => sanitizeLocalFiltersForCategoryScope(prev, category));
  }, [category]);

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
    setDeleteConfirmOpen(false);
  }, []);

  // Leaving Local Library (tab change / blur) clears selection — no file changes.
  useFocusEffect(
    useCallback(() => {
      return () => {
        exitSelection();
      };
    }, [exitSelection]),
  );

  const applyFilters = useCallback(
    (next: LocalLibraryFilters) => {
      setFilters(sanitizeLocalFiltersForCategoryScope(next, category));
      setFilterOpen(false);
      if (selecting) exitSelection();
      const count = filterNormalizedFiles(
        scopeNormalizedFiles(normalized, category),
        sanitizeLocalFiltersForCategoryScope(next, category),
      ).length;
      void AccessibilityInfo.announceForAccessibility(`${count} files found`);
    },
    [selecting, exitSelection, normalized, category],
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
      void AccessibilityInfo.announceForAccessibility(`${next.size} selected`);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const uris = filteredFiles.map((f) => f.uri);
    setSelected(new Set(uris));
    void AccessibilityInfo.announceForAccessibility(
      `Selected ${uris.length} filtered results`,
    );
  }, [filteredFiles]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
    setDeleteConfirmOpen(false);
    void AccessibilityInfo.announceForAccessibility("Deselect all");
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
    void actionGateRef.current(async () => {
      setDeleting(true);
      try {
        const result = await deleteLocalFilesBatch(selectedFiles);
        const msg =
          result.failed === 0
            ? deleteLocalSuccessMessage(result.deleted)
            : deleteLocalPartialMessage(result.deleted, result.failed);
        setStatusMessage(msg);
        void AccessibilityInfo.announceForAccessibility(msg);
        setDeleteConfirmOpen(false);
        exitSelection();
      } finally {
        setDeleting(false);
      }
    });
  }, [selectedFiles, deleting, deleteLocalFilesBatch, exitSelection]);

  useLayoutEffect(() => {
    if (selecting) {
      const allSelected = selected.size === filteredFiles.length && filteredFiles.length > 0;
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
              if (allSelected) deselectAll();
              else selectAllFiltered();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              allSelected ? "Deselect all" : selectAllFilteredA11yLabel(filteredFiles.length)
            }
            hitSlop={HitSlop44}
            style={styles.headerSideBtn}
          >
            <Text
              style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 15 }}
              numberOfLines={1}
            >
              {allSelected ? "Deselect all" : "Select all"}
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

      <View
        style={[styles.catRow, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}
        testID="local-category-row"
      >
        {LOCAL_CATEGORY_CHIPS.map((chip) => {
          const selectedChip = category === chip.id;
          const value = categoryCounts[chip.id];
          const abbrev = formatCountAbbrev(value);
          return (
            <Pressable
              key={chip.id}
              onPress={() => {
                setCategory(chip.id);
                if (selecting) exitSelection();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedChip }}
              accessibilityLabel={`${chip.label}, ${abbrev.a11y}`}
              style={[
                styles.catCell,
                {
                  borderColor: selectedChip ? colors.brand : colors.border,
                  backgroundColor: selectedChip ? colors.brandSoft : colors.surface,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Text
                style={[styles.catChipLabel, { color: selectedChip ? colors.brand : colors.text }]}
                numberOfLines={1}
              >
                {chip.label}
              </Text>
              <Text
                style={[
                  styles.catChipCount,
                  { color: selectedChip ? colors.brandStrong : colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {abbrev.display}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

      <Animated.View
        style={[
          styles.selectionDeleteWrap,
          {
            height: deleteBarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SELECTION_DELETE_BAR_H],
            }),
            opacity: deleteBarAnim,
            borderBottomColor: colors.border,
            backgroundColor: colors.dangerSoft,
          },
        ]}
        pointerEvents={showDeleteBar ? "auto" : "none"}
      >
        <Pressable
          onPress={() => setDeleteConfirmOpen(true)}
          disabled={!showDeleteBar || deleting}
          accessibilityRole="button"
          accessibilityLabel={deleteLocalA11yLabel(selected.size)}
          style={({ pressed }) => [
            styles.selectionDeleteBtn,
            {
              opacity: pressed || deleting ? 0.75 : 1,
              minHeight: LOCAL_ACTION_HIT,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.danger, fontFamily: Type.fontBold, fontSize: 14 }}>
            Delete local
            {selected.size > 0 ? ` · ${selected.size}` : ""}
            {selectedBytes > 0 ? ` · ${formatSelectionSize(selectedBytes)}` : ""}
          </Text>
        </Pressable>
      </Animated.View>

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
            <LocalLibraryCard
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

      <Modal
        transparent
        animationType="fade"
        visible={deleteConfirmOpen && selecting && selected.size > 0}
        statusBarTranslucent
        onRequestClose={() => {
          if (!deleting) setDeleteConfirmOpen(false);
        }}
      >
        <View style={styles.selectionOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null}
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,12,20,0.55)" }]}
            onPress={() => {
              if (!deleting) setDeleteConfirmOpen(false);
            }}
            accessibilityLabel="Cancel deletion"
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
              {deleteLocalTitle(selected.size)}
            </Text>
            <Text style={[styles.selectionSub, { color: colors.textMuted }]}>
              This will remove {formatSelectionSize(selectedBytes)} from this device.
            </Text>
            <Text style={[styles.selectionHint, { color: colors.textFaint }]}>
              Files on the camera will not be deleted.
            </Text>
            <Pressable
              onPress={confirmBatchDelete}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel={deleteLocalA11yLabel(selected.size)}
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
                    {deleteLocalButtonLabel(selected.size)}
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                if (!deleting) setDeleteConfirmOpen(false);
              }}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel="Cancel deletion"
              hitSlop={8}
              style={({ pressed }) => [
                styles.selectionSecondary,
                { opacity: pressed ? 0.65 : 1, minHeight: LOCAL_ACTION_HIT },
              ]}
            >
              <Text style={{ color: colors.textMuted, fontFamily: Type.fontSemi, fontSize: 15 }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LocalFilterSheet
        visible={filterOpen}
        initial={filters}
        normalized={scoped}
        categoryScope={category}
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
  catRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  catCell: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: LOCAL_ACTION_HIT,
  },
  catChipLabel: { fontSize: 11, fontFamily: Type.fontSemi },
  catChipCount: { fontSize: 10, fontFamily: Type.font, marginTop: 1 },
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
  selectionDeleteWrap: {
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  selectionDeleteBtn: {
    height: SELECTION_DELETE_BAR_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // Above list cards; delete strip sits outside the list under the nav.
    zIndex: 3,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {},
      default: {},
    }),
  },
  sectionTitle: { flex: 1, fontSize: 11, fontFamily: Type.fontSemi, letterSpacing: 0.5 },
  sectionCount: { fontSize: 11, fontFamily: Type.font },
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
});
