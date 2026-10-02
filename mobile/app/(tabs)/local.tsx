import Ionicons from "@expo/vector-icons/Ionicons";
import { useBottomTabBarHeight } from "expo-router/build/react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";

import {
  LIBRARY_LIST_VIRTUALIZATION,
  LIBRARY_THUMB_VIEWABILITY,
} from "@/components/camera/cameraLibraryViewability";
import {
  cameraSortOptionsForCategory,
  type CameraLibrarySort,
} from "@/components/camera/cameraLibraryModel";
import {
  deleteLocalA11yLabel,
  deleteLocalButtonLabel,
  deleteLocalPartialMessage,
  deleteLocalSuccessMessage,
  deleteLocalTitle,
  selectAllFilteredA11yLabel,
} from "@/components/local/localCopy";
import { LocalDateSectionHeader } from "@/components/local/LocalDateSectionHeader";
import { LocalFilterSheet } from "@/components/local/LocalFilterSheet";
import {
  localSelectedCountLabel,
  localSelectionModeAnnouncement,
  localSortBarLabel,
} from "@/components/local/localLibrarySelection";
import {
  buildFilterChips,
  clearFilterGroup,
  countActiveFilterGroups,
  countLocalCategories,
  categoryFromLocalName,
  EMPTY_FILTERS,
  filterNormalizedFiles,
  formatResultsSummary,
  formatSelectionSize,
  isFiltersEmpty,
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
  buildLocalLibraryFileRows,
  buildLocalLibrarySections,
  LOCAL_ACTION_HIT,
  LOCAL_LIBRARY_LIST_BOTTOM_PADDING,
  stickySectionKeyFromLocalViewableItems,
  type LocalLibraryFileRow,
} from "@/components/local/localLibrarySections";
import { FloatingBackToTop } from "@/components/navigation/FloatingBackToTop";
import { TabScreenHeader } from "@/components/navigation/TabScreenHeader";
import { LibraryCategoryTabs } from "@/components/library/LibraryCategoryTabs";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { CompactSheetHeader, SHEET_BODY_PAD_TOP } from "@/components/sheets/SheetHeader";
import { createUiActionGate } from "@/components/queue/queuePresentation";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode, type LocalMediaFile } from "@/context/DemoModeContext";
import { Haptics } from "@/src/utils/haptics";
import { SelectionToolbar } from "@/components/selection/SelectionToolbar";
import {
  localDeleteCtaA11yLabel,
  localDeleteCtaLabel,
} from "@/components/selection/selectionLabels";
import { useSelectionTabChrome } from "@/context/SelectionTabChromeContext";
import {
  backToTopListBottomPadding,
  useBackToTop,
} from "@/hooks/useBackToTop";
import {
  listBounceEnabled,
  listContentBottomPadding,
  listOverScrollMode,
  listScrollEnabled,
  useVerticalOverflow,
} from "@/hooks/useVerticalOverflow";
import type { FileCategory } from "@/packages/parsers/src/index";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LocalLibraryScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { setChrome, clearChromeIf } = useSelectionTabChrome();
  const {
    localFiles,
    refreshLocalFiles,
    shareLocalFile,
    deleteLocalFile,
    deleteLocalFilesBatch,
    demoMode,
    files,
  } = useDemoMode();

  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<LocalLibraryFilters>(EMPTY_FILTERS);
  const [category, setCategory] = useState<LocalCategoryScope>("all");
  const [sort, setSort] = useState<CameraLibrarySort>("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const refreshBusyRef = useRef(false);
  const actionGateRef = useRef(createUiActionGate());
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

  const canPullToRefresh = !selecting;
  const { hasOverflow, onViewportLayout, onContentSizeChange } = useVerticalOverflow();
  const {
    hasOverflow: sortHasOverflow,
    onViewportLayout: onSortViewportLayout,
    onContentSizeChange: onSortContentSizeChange,
  } = useVerticalOverflow();
  const listFilledPad = Math.max(LOCAL_LIBRARY_LIST_BOTTOM_PADDING, 24 + tabBarHeight);

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

  const sortOptions = useMemo(() => cameraSortOptionsForCategory(category), [category]);

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

  const sections = useMemo(
    () => buildLocalLibrarySections(filteredFiles, sort, durationByName),
    [filteredFiles, sort, durationByName],
  );
  const listRows = useMemo(() => buildLocalLibraryFileRows(sections), [sections]);
  const [stickySectionKey, setStickySectionKey] = useState<string | null>(null);
  const viewabilityConfig = useRef(LIBRARY_THUMB_VIEWABILITY).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const nextKey = stickySectionKeyFromLocalViewableItems(viewableItems);
      if (!nextKey) return;
      setStickySectionKey((previous) => (previous === nextKey ? previous : nextKey));
    },
  ).current;

  useEffect(() => {
    const firstKey = sections[0]?.key ?? null;
    setStickySectionKey((previous) => {
      if (previous && sections.some((section) => section.key === previous)) {
        return previous;
      }
      return firstKey;
    });
  }, [sections]);

  const stickySection = useMemo(
    () => sections.find((section) => section.key === stickySectionKey) ?? sections[0] ?? null,
    [sections, stickySectionKey],
  );

  const localListExtraData = useMemo(
    () => ({ selecting, selected }),
    [selecting, selected],
  );

  const listItemSeparator = useCallback(() => <View style={{ height: 8 }} />, []);

  useEffect(() => {
    setFilters((prev) => sanitizeLocalFiltersForCategoryScope(prev, category));
  }, [category]);

  useEffect(() => {
    if (category === "photo" && (sort === "longest" || sort === "shortest")) {
      setSort("newest");
    }
  }, [category, sort]);

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
    clearChromeIf("local-delete");
  }, [clearChromeIf]);

  const enterSelection = useCallback(
    (uri: string) => {
      setSelecting(true);
      setSelected(new Set([uri]));
      void AccessibilityInfo.announceForAccessibility(localSelectionModeAnnouncement(1));
    },
    [],
  );

  // Own chrome only while selecting — never clear a sibling tab's chrome when idle.
  useEffect(() => {
    if (!selecting) return;
    setChrome({
      kind: "local-delete",
      selectedCount: selected.size,
      label: localDeleteCtaLabel(selected.size, deleting),
      accessibilityLabel: localDeleteCtaA11yLabel(selected.size, deleting),
      onPress: () => setDeleteConfirmOpen(true),
      disabled: selected.size === 0 || deleting,
      busy: deleting,
    });
  }, [selecting, selected.size, deleting, setChrome]);

  useEffect(() => {
    return () => {
      clearChromeIf("local-delete");
    };
  }, [clearChromeIf]);

  useEffect(() => {
    if (!selecting) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      exitSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, exitSelection]);

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
      if (selecting) return;
      setFilters(sanitizeLocalFiltersForCategoryScope(next, category));
      setFilterOpen(false);
      const count = filterNormalizedFiles(
        scopeNormalizedFiles(normalized, category),
        sanitizeLocalFiltersForCategoryScope(next, category),
      ).length;
      void AccessibilityInfo.announceForAccessibility(`${count} files found`);
    },
    [selecting, normalized, category],
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
      void AccessibilityInfo.announceForAccessibility(localSelectedCountLabel(next.size));
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

  const renderSectionBreak = useCallback(
    (row: LocalLibraryFileRow) => (
      <LocalDateSectionHeader title={row.sectionTitle} countLabel={row.sectionCountLabel} />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LocalLibraryFileRow; index: number }) => {
      const file = item.file;
      const fileCategory: FileCategory =
        categoryByName.get(file.name) ?? categoryFromLocalName(file.name, file.kind);
      const previous = index > 0 ? listRows[index - 1] : undefined;
      const startsNewSection = Boolean(previous && previous.sectionKey !== item.sectionKey);
      return (
        <View collapsable={false} style={styles.localFileRow}>
          {startsNewSection ? renderSectionBreak(item) : null}
          {startsNewSection ? <View style={{ height: 6 }} /> : null}
          <LocalLibraryCard
            item={file}
            category={fileCategory}
            durationSec={durationByName.get(file.name)}
            selecting={selecting}
            selected={selected.has(file.uri)}
            onToggleSelect={toggleSelect}
            onEnterSelection={enterSelection}
            onShare={(f) => void actionGateRef.current(async () => shareLocalFile(f))}
            onDelete={confirmSingleDelete}
          />
        </View>
      );
    },
    [
      listRows,
      categoryByName,
      durationByName,
      selecting,
      selected,
      toggleSelect,
      enterSelection,
      shareLocalFile,
      confirmSingleDelete,
      renderSectionBreak,
    ],
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
    const filtersDisabled = selecting;
    const filtersActive = activeGroups > 0;
    navigation.setOptions({
      header: () => (
        <TabScreenHeader
          title="Local library"
          left={
            <Pressable
              onPress={() => {
                if (filtersDisabled) return;
                setFilterOpen(true);
              }}
              disabled={filtersDisabled}
              accessibilityRole="button"
              accessibilityLabel="Filters"
              accessibilityHint="Opens Local Library filters"
              accessibilityState={{ disabled: filtersDisabled, selected: filtersActive }}
              accessibilityValue={
                filtersActive ? { text: `${activeGroups} active` } : undefined
              }
              hitSlop={HitSlop44}
              style={({ pressed }) => [
                styles.headerIconBtn,
                {
                  opacity: filtersDisabled ? 0.4 : pressed ? 0.65 : 1,
                },
              ]}
              testID="local-header-filters"
            >
              <Ionicons
                name="options-outline"
                size={22}
                color={
                  filtersDisabled
                    ? colors.textMuted
                    : filtersActive
                      ? colors.brand
                      : colors.textMuted
                }
              />
              {filtersActive ? (
                activeGroups > 1 ? (
                  <View
                    pointerEvents="none"
                    style={[styles.filterBadge, { backgroundColor: colors.brand }]}
                  >
                    <Text style={[styles.filterBadgeText, { color: colors.onBrand }]}>
                      {activeGroups > 99 ? "99+" : String(activeGroups)}
                    </Text>
                  </View>
                ) : (
                  <View
                    pointerEvents="none"
                    style={[styles.filterDot, { backgroundColor: colors.brand }]}
                  />
                )
              ) : null}
            </Pressable>
          }
          right={
            <Pressable
              onPress={() => void runRefresh()}
              disabled={refreshing || selecting}
              accessibilityRole="button"
              accessibilityLabel="Refresh local library"
              accessibilityState={{ busy: refreshing, disabled: refreshing || selecting }}
              hitSlop={HitSlop44}
              style={({ pressed }) => [
                styles.headerIconBtn,
                { opacity: refreshing || selecting ? 0.5 : pressed ? 0.65 : 1 },
              ]}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Ionicons name="refresh" size={22} color={colors.textMuted} />
              )}
            </Pressable>
          }
        />
      ),
    });
  }, [navigation, selecting, refreshing, colors, runRefresh, activeGroups]);

  const emptyLibrary = localFiles.length === 0;
  const emptyFiltered = !emptyLibrary && filteredFiles.length === 0;
  const allFilteredSelected =
    selected.size === filteredFiles.length && filteredFiles.length > 0;
  const listPadBottomBase = listContentBottomPadding(
    filteredFiles.length,
    listFilledPad,
    Math.max(spacing.lg, 12),
  );

  const backToTopEnabled =
    !filterOpen &&
    !sortOpen &&
    !selecting &&
    !deleteConfirmOpen &&
    !deleting &&
    listRows.length > 0;

  const {
    listRef: localListRef,
    visible: backToTopVisible,
    onScroll: onLocalScroll,
    onLayout: onBackToTopLayout,
    scrollToTop,
    scrollEventThrottle,
  } = useBackToTop({
    enabled: backToTopEnabled,
    hasOverflow,
    itemCount: listRows.length,
  });

  const listPadBottom = backToTopListBottomPadding(
    listRows.length,
    hasOverflow,
    listPadBottomBase,
  );

  const handleListLayout = useCallback(
    (event: Parameters<typeof onViewportLayout>[0]) => {
      onViewportLayout(event);
      onBackToTopLayout(event);
    },
    [onViewportLayout, onBackToTopLayout],
  );

  const onBackToTopPress = useCallback(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      scrollToTop(!rm);
    });
  }, [scrollToTop]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {statusMessage ? (
        <Text style={[styles.status, { color: colors.textMuted, paddingHorizontal: spacing.lg }]}>
          {statusMessage}
        </Text>
      ) : null}

      <LibraryCategoryTabs
        selectedId={category}
        counts={categoryCounts}
        onSelect={(id) => {
          if (selecting) return;
          setCategory(id);
        }}
        disabled={selecting}
        testID="local-category-row"
      />

      {!isFiltersEmpty(filters) ? (
        <View
          style={[
            styles.chipsBlock,
            selecting ? { opacity: 0.45 } : null,
          ]}
          pointerEvents={selecting ? "none" : "auto"}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {chips.map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => {
                  if (selecting) return;
                  const next = clearFilterGroup(filters, chip.id);
                  setFilters(next);
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
                if (selecting) return;
                setFilters(EMPTY_FILTERS);
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

      <View style={styles.list}>
        {stickySection && listRows.length > 0 ? (
          <View style={[styles.stickyOverlay, { backgroundColor: colors.bg }]}>
            <LocalDateSectionHeader
              title={stickySection.title}
              countLabel={stickySection.countLabel}
              showSort
              sortDisabled={selecting}
              sortValueLabel={localSortBarLabel(sort)}
              sortAccessibilityHint="Opens Local Library sorting options"
              sortTestID="local-section-sort"
              onPressSort={() => {
                if (selecting) return;
                setSortOpen(true);
              }}
              testID="local-sticky-date-header"
            />
          </View>
        ) : null}

        <SelectionToolbar
          visible={selecting}
          selectedCount={selected.size}
          filteredCount={filteredFiles.length}
          allSelected={allFilteredSelected}
          onClose={exitSelection}
          onToggleSelectAll={() => {
            if (allFilteredSelected) deselectAll();
            else selectAllFiltered();
          }}
          selectAllAccessibilityLabel={selectAllFilteredA11yLabel(filteredFiles.length)}
          testID="local-selection-toolbar"
        />

        <FlatList
          ref={localListRef}
          style={styles.list}
          data={listRows}
          keyExtractor={(row) => row.key}
          removeClippedSubviews={false}
          initialNumToRender={LIBRARY_LIST_VIRTUALIZATION.initialNumToRender}
          maxToRenderPerBatch={LIBRARY_LIST_VIRTUALIZATION.maxToRenderPerBatch}
          updateCellsBatchingPeriod={LIBRARY_LIST_VIRTUALIZATION.updateCellsBatchingPeriod}
          windowSize={LIBRARY_LIST_VIRTUALIZATION.windowSize}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          extraData={localListExtraData}
          scrollEnabled={listScrollEnabled(hasOverflow, canPullToRefresh)}
          alwaysBounceVertical={listBounceEnabled(canPullToRefresh)}
          bounces={listBounceEnabled(canPullToRefresh)}
          overScrollMode={listOverScrollMode(canPullToRefresh)}
          showsVerticalScrollIndicator={hasOverflow}
          onLayout={handleListLayout}
          onContentSizeChange={onContentSizeChange}
          onScroll={onLocalScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: listPadBottom,
            ...(listRows.length === 0 ? { flexGrow: 1 } : null),
          }}
          ItemSeparatorComponent={listItemSeparator}
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
              onRefresh={() => {
                Haptics.light();
                void runRefresh();
              }}
              enabled={!selecting}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          renderItem={renderItem}
        />
      </View>

      <FloatingBackToTop
        visible={backToTopVisible && backToTopEnabled}
        onPress={onBackToTopPress}
        reduceMotion={reduceMotion}
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
            <Text style={[styles.selectionHint, { color: colors.textMuted }]}>
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

      <StaticBackdropSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        sheetTestID="local-sort-sheet"
        scrimTestID="local-sort-scrim"
        scrimAccessibilityLabel="Close sort"
        sheetStyle={[
          styles.sortSheet,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
          },
        ]}
      >
        {({ requestClose }) => (
          <View style={styles.sortBody}>
            <CompactSheetHeader
              title="Sort"
              showHandle={false}
              compact
              dividerInset={0}
              onClose={requestClose}
              closeAccessibilityLabel="Close sort"
            />
            <ScrollView
              style={styles.sortScroll}
              contentContainerStyle={{ paddingTop: SHEET_BODY_PAD_TOP }}
              scrollEnabled={sortHasOverflow}
              alwaysBounceVertical={false}
              bounces={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={sortHasOverflow}
              onLayout={onSortViewportLayout}
              onContentSizeChange={onSortContentSizeChange}
            >
              {sortOptions.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setSort(opt.id);
                    requestClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sort === opt.id }}
                  style={styles.sortRow}
                >
                  <Text
                    style={{
                      color: sort === opt.id ? colors.brand : colors.text,
                      fontFamily: Type.fontSemi,
                      fontSize: 15,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {sort === opt.id ? (
                    <Ionicons name="checkmark" size={18} color={colors.brand} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </StaticBackdropSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  demoRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  error: { fontSize: 12, fontFamily: Type.fontSemi, marginTop: 4, marginBottom: 4 },
  status: { fontSize: 12, fontFamily: Type.font, marginBottom: 4 },
  headerIconBtn: {
    width: LOCAL_ACTION_HIT,
    height: LOCAL_ACTION_HIT,
    alignItems: "center",
    justifyContent: "center",
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 9,
    lineHeight: 10,
    fontFamily: Type.fontBold,
  },
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
  sortSheet: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  sortBody: { flexShrink: 1 },
  sortScroll: { flexShrink: 1 },
  sortRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  sectionHeader: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 3,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {},
      default: {},
    }),
  },
  stickyOverlay: {
    zIndex: 20,
    paddingHorizontal: 16,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {},
      default: {},
    }),
  },
  localFileRow: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "stretch",
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
