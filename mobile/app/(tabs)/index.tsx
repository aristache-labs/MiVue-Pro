import Ionicons from "@expo/vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CameraConnectionHeaderButton } from "@/components/camera/CameraConnectionHeaderButton";
import { CameraConnectionSheet } from "@/components/camera/CameraConnectionSheet";
import { CameraFilterSheet } from "@/components/camera/CameraFilterSheet";
import {
  buildCameraFilterChips,
  buildCameraLibraryFileRows,
  buildCameraLibrarySections,
  cameraSortOptionsForCategory,
  clearCameraFilterGroup,
  countCameraFilterGroups,
  countCategories,
  EMPTY_CAMERA_FILTERS,
  filterAndSortRemoteFiles,
  formatMediaSizeMbGb,
  friendlyConnectionError,
  isCameraFiltersEmpty,
  isCameraLibraryInteractive,
  libraryEmptyPresentation,
  sanitizeFiltersForCategoryScope,
  sumRemoteBytes,
  type CameraLibraryFileRow,
  type CameraLibraryFilters,
  type CameraLibrarySort,
  type CategoryFilter,
} from "@/components/camera/cameraLibraryModel";
import {
  LIBRARY_LIST_VIRTUALIZATION,
  LIBRARY_THUMB_VIEWABILITY,
  pathsFromViewableItems,
  samePathSet,
  stickySectionKeyFromViewableItems,
} from "@/components/camera/cameraLibraryViewability";
import { RemoteDetailSheet } from "@/components/camera/RemoteDetailSheet";
import { RemoteRecordingCard } from "@/components/camera/RemoteRecordingCard";
import {
  resolveRemoteDownloadState,
  shouldEnqueueOnDownloadPress,
} from "@/components/camera/remoteDownloadState";
import { LOCAL_ACTION_HIT, LOCAL_LIBRARY_LIST_BOTTOM_PADDING } from "@/components/local/localLibrarySections";
import { LocalDateSectionHeader } from "@/components/local/LocalDateSectionHeader";
import { LocalSelectionContextBar } from "@/components/local/LocalSelectionContextBar";
import { localSortBarLabel } from "@/components/local/localLibrarySelection";
import { selectAllFilteredA11yLabel } from "@/components/local/localCopy";
import {
  LibraryCategoryTabs,
} from "@/components/library/LibraryCategoryTabs";
import {
  classifyLibrarySelection,
  libraryCancelActionLabel,
  libraryCancelConfirmMessage,
  libraryCancelConfirmTitle,
  libraryDownloadActionLabel,
  libraryDownloadA11yLabel,
  pruneSelectionToPaths,
} from "@/components/library/librarySelection";
import { SelectionActionBand } from "@/components/library/SelectionActionBand";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { CompactSheetHeader, SHEET_BODY_PAD_TOP } from "@/components/sheets/SheetHeader";
import { FloatingBackToTop } from "@/components/navigation/FloatingBackToTop";
import { TabScreenHeader } from "@/components/navigation/TabScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
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
import type { RemoteFile } from "@/packages/parsers/src/index";

function SkeletonRow() {
  const { colors, radius } = useAppTheme();
  return (
    <View
      style={[
        styles.skeleton,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
      ]}
    >
      <View style={[styles.skelThumb, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skelLine, { backgroundColor: colors.surfaceMuted, width: "70%" }]} />
        <View style={[styles.skelLine, { backgroundColor: colors.surfaceMuted, width: "45%" }]} />
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    files,
    queueItems,
    localFiles,
    enqueueDownload,
    cancelDownload,
    resumeDownload,
    retryDownload,
    refreshFiles,
    lastError,
    cameraLinkState,
    isRefreshingCamera,
    cameraModel,
    cameraHost,
    lastConnectedAt,
    queuePosition,
  } = useDemoMode();

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<CameraLibrarySort>("newest");
  const [filters, setFilters] = useState<CameraLibraryFilters>(EMPTY_CAMERA_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [detailFile, setDetailFile] = useState<RemoteFile | null>(null);
  const [connectionSheetOpen, setConnectionSheetOpen] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  const localNames = useMemo(() => new Set(localFiles.map((f) => f.name)), [localFiles]);
  const queuedNames = useMemo(() => {
    const names = new Set<string>();
    for (const item of queueItems) {
      if (
        item.status === "queued" ||
        item.status === "active" ||
        item.status === "paused" ||
        item.status === "waiting_for_connection"
      ) {
        names.add(item.localName);
      }
    }
    return names;
  }, [queueItems]);
  const queuedNamesKey = useMemo(
    () => [...queuedNames].sort().join("\0"),
    [queuedNames],
  );
  /** Stable Set identity while queue membership is unchanged (progress ticks must not rebuild sections). */
  const stableQueuedNames = useMemo(() => queuedNames, [queuedNamesKey]);
  const counts = useMemo(() => countCategories(files), [files]);
  const hasAdvanced = !isCameraFiltersEmpty(filters);
  const activeGroups = countCameraFilterGroups(filters);
  const sortOptions = useMemo(() => cameraSortOptionsForCategory(category), [category]);

  useEffect(() => {
    setFilters((prev) => sanitizeFiltersForCategoryScope(prev, category));
  }, [category]);

  useEffect(() => {
    if (category === "photo" && (sort === "longest" || sort === "shortest")) {
      setSort("newest");
    }
  }, [category, sort]);

  const filtered = useMemo(
    () =>
      filterAndSortRemoteFiles({
        files,
        category,
        search: "",
        filters: selecting
          ? { ...filters, downloaded: "not_downloaded" }
          : filters,
        sort,
        downloadedNames: localNames,
        queuedNames: stableQueuedNames,
      }),
    [files, category, filters, sort, localNames, stableQueuedNames, selecting],
  );

  const sections = useMemo(() => buildCameraLibrarySections(filtered, sort), [filtered, sort]);
  const listRows = useMemo(() => buildCameraLibraryFileRows(sections), [sections]);
  const filteredPaths = useMemo(() => filtered.map((f) => f.path), [filtered]);

  useEffect(() => {
    setSelected((prev) => pruneSelectionToPaths(prev, filteredPaths));
  }, [filteredPaths]);

  const selectedFiles = useMemo(
    () => filtered.filter((f) => selected.has(f.path)),
    [filtered, selected],
  );

  const selectionBreakdown = useMemo(
    () =>
      classifyLibrarySelection({
        selectedFiles,
        queueItems,
        localNames,
        queuePosition,
      }),
    [selectedFiles, queueItems, localNames, queuePosition],
  );

  const showSelectionBar = selecting;
  const allFilteredSelected =
    selected.size === filtered.length && filtered.length > 0;
  const [activeThumbnailPaths, setActiveThumbnailPaths] = useState(() => new Set<string>());
  const [stickySectionKey, setStickySectionKey] = useState<string | null>(null);
  const viewabilityConfig = useRef(LIBRARY_THUMB_VIEWABILITY).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const next = pathsFromViewableItems(viewableItems);
      setActiveThumbnailPaths((prev) => (samePathSet(prev, next) ? prev : next));
      const nextSticky = stickySectionKeyFromViewableItems(viewableItems);
      if (nextSticky) {
        setStickySectionKey((prev) => (prev === nextSticky ? prev : nextSticky));
      }
    },
  ).current;

  useEffect(() => {
    const first = sections[0]?.key ?? null;
    setStickySectionKey((prev) => {
      if (prev && sections.some((s) => s.key === prev)) return prev;
      return first;
    });
  }, [sections]);

  const stickySection = useMemo(() => {
    if (sections.length === 0) return null;
    return sections.find((s) => s.key === stickySectionKey) ?? sections[0] ?? null;
  }, [sections, stickySectionKey]);

  const listItemSeparator = useCallback(
    () => <View style={{ height: spacing.sm }} />,
    [spacing.sm],
  );
  const filteredBytes = useMemo(() => sumRemoteBytes(filtered), [filtered]);
  const filterChips = useMemo(() => buildCameraFilterChips(filters), [filters]);

  const libraryInteractive = isCameraLibraryInteractive(cameraLinkState);
  const canPullToRefresh = cameraLinkState === "connected";
  const { hasOverflow, onViewportLayout, onContentSizeChange } = useVerticalOverflow();
  const {
    hasOverflow: sortHasOverflow,
    onViewportLayout: onSortViewportLayout,
    onContentSizeChange: onSortContentSizeChange,
  } = useVerticalOverflow();
  const listFilledPad = Math.max(tabBarHeight, LOCAL_LIBRARY_LIST_BOTTOM_PADDING);
  const listPadBottomBase = listContentBottomPadding(
    filtered.length,
    listFilledPad,
    Math.max(spacing.lg, 12),
  );

  const showSkeleton =
    isRefreshingCamera && files.length === 0 && cameraLinkState === "connecting";

  const backToTopEnabled =
    !showSkeleton &&
    !filterOpen &&
    !sortOpen &&
    !connectionSheetOpen &&
    !selecting &&
    detailFile === null &&
    filtered.length > 0;

  const {
    listRef: libraryListRef,
    visible: backToTopVisible,
    onScroll: onLibraryScroll,
    onLayout: onBackToTopLayout,
    scrollToTop,
    scrollEventThrottle,
  } = useBackToTop({
    enabled: backToTopEnabled,
    hasOverflow,
    itemCount: filtered.length,
  });

  const listPadBottom = backToTopListBottomPadding(
    filtered.length,
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
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      scrollToTop(!reduceMotion);
    });
  }, [scrollToTop]);

  useEffect(() => {
    if (
      cameraLinkState !== "idle" &&
      cameraLinkState !== "disconnected" &&
      cameraLinkState !== "connection_lost"
    ) {
      return;
    }
    setDetailFile(null);
    setFilterOpen(false);
    setSortOpen(false);
    setFilters(EMPTY_CAMERA_FILTERS);
    setCategory("all");
    setSelecting(false);
    setSelected(new Set());
    setCancelConfirmOpen(false);
  }, [cameraLinkState]);

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
    setCancelConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (!selecting) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      exitSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, exitSelection]);

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      void AccessibilityInfo.announceForAccessibility(`${next.size} selected`);
      return next;
    });
  }, []);

  const enterSelectionWith = useCallback((path: string) => {
    setSelecting(true);
    setSelected(new Set([path]));
    setDetailFile(null);
    setFilterOpen(false);
    setSortOpen(false);
    setConnectionSheetOpen(false);
    void AccessibilityInfo.announceForAccessibility("Selection mode. 1 item selected");
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected(new Set(filteredPaths));
    void AccessibilityInfo.announceForAccessibility(
      selectAllFilteredA11yLabel(filteredPaths.length),
    );
  }, [filteredPaths]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const openConnectionSheet = useCallback(() => {
    if (selecting) return;
    if (cameraLinkState === "connecting" || isRefreshingCamera) return;
    setConnectionSheetOpen(true);
  }, [selecting, cameraLinkState, isRefreshingCamera]);

  const runRefresh = useCallback(async () => {
    const result = await refreshFiles();
    return result;
  }, [refreshFiles]);

  useEffect(() => {
    setErrorDismissed(false);
  }, [lastError, cameraLinkState]);

  const showConnectionError = cameraLinkState === "connection_lost";
  const errorBanner =
    showConnectionError && !errorDismissed
      ? friendlyConnectionError(lastError)
      : undefined;

  useLayoutEffect(() => {
    const filtersDisabled = selecting || !libraryInteractive;
    const filtersActive = activeGroups > 0;
    navigation.setOptions({
      header: () => (
        <TabScreenHeader
          title="Library"
          left={
            <Pressable
              onPress={() => {
                if (filtersDisabled) return;
                setFilterOpen(true);
              }}
              disabled={filtersDisabled}
              accessibilityRole="button"
              accessibilityLabel="Filters"
              accessibilityHint="Opens Library filters"
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
              testID="library-header-filters"
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
            <CameraConnectionHeaderButton
              key={`${cameraLinkState}-${isRefreshingCamera ? "1" : "0"}`}
              linkState={cameraLinkState}
              refreshing={isRefreshingCamera}
              onPress={openConnectionSheet}
            />
          }
        />
      ),
    });
  }, [
    navigation,
    selecting,
    libraryInteractive,
    activeGroups,
    cameraLinkState,
    isRefreshingCamera,
    openConnectionSheet,
    colors,
  ]);

  const onDownload = useCallback(
    (file: RemoteFile) => {
      const state = resolveRemoteDownloadState({
        file,
        queueItems,
        localNames,
        queuePosition,
      });
      if (state.kind === "failed") {
        void retryDownload(state.queueId);
        return;
      }
      if (!shouldEnqueueOnDownloadPress(state)) return;
      void enqueueDownload(file);
    },
    [enqueueDownload, retryDownload, queueItems, localNames, queuePosition],
  );

  const onResume = useCallback(
    (file: RemoteFile) => {
      const state = resolveRemoteDownloadState({
        file,
        queueItems,
        localNames,
        queuePosition,
      });
      if (state.kind !== "paused") return;
      void resumeDownload(state.queueId);
    },
    [queueItems, localNames, queuePosition, resumeDownload],
  );

  const runBatchDownload = useCallback(async () => {
    if (batchBusy) return;
    const targets = selectionBreakdown.downloadEligible;
    if (targets.length === 0) return;
    setBatchBusy(true);
    try {
      for (const file of targets) {
        const state = resolveRemoteDownloadState({
          file,
          queueItems,
          localNames,
          queuePosition,
        });
        if (state.kind === "failed") {
          await retryDownload(state.queueId);
        } else if (shouldEnqueueOnDownloadPress(state)) {
          await enqueueDownload(file);
        }
      }
      void AccessibilityInfo.announceForAccessibility(
        `${targets.length} ${targets.length === 1 ? "recording" : "recordings"} added to download queue`,
      );
      exitSelection();
    } finally {
      setBatchBusy(false);
    }
  }, [
    batchBusy,
    selectionBreakdown.downloadEligible,
    queueItems,
    localNames,
    queuePosition,
    retryDownload,
    enqueueDownload,
    exitSelection,
  ]);

  const runBatchCancel = useCallback(async () => {
    if (batchBusy) return;
    const targets = selectionBreakdown.cancelEligible;
    if (targets.length === 0) return;
    setBatchBusy(true);
    try {
      for (const entry of targets) {
        await cancelDownload(entry.queueId);
      }
      void AccessibilityInfo.announceForAccessibility(
        `${targets.length} ${targets.length === 1 ? "download" : "downloads"} cancelled`,
      );
      setCancelConfirmOpen(false);
      exitSelection();
    } finally {
      setBatchBusy(false);
    }
  }, [batchBusy, selectionBreakdown.cancelEligible, cancelDownload, exitSelection]);

  const openDownloaded = useCallback(
    (file: RemoteFile) => {
      const local = localFiles.find((f) => f.name === file.name);
      if (!local) return;
      const href =
        `/player?uri=${encodeURIComponent(local.uri)}&name=${encodeURIComponent(local.name)}&kind=${local.kind}` as const;
      router.push(href as Parameters<typeof router.push>[0]);
      setDetailFile(null);
    },
    [localFiles],
  );

  const renderSectionBreak = useCallback(
    (row: CameraLibraryFileRow) => (
      <LocalDateSectionHeader title={row.sectionTitle} countLabel={row.sectionCountLabel} />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CameraLibraryFileRow; index: number }) => {
      const downloadState = resolveRemoteDownloadState({
        file: item.file,
        queueItems,
        localNames,
        queuePosition,
      });
      const prev = index > 0 ? listRows[index - 1] : undefined;
      const showSectionBreak = Boolean(prev && prev.sectionKey !== item.sectionKey);
      return (
        <View collapsable={false} style={styles.libraryFileRow}>
          {showSectionBreak ? renderSectionBreak(item) : null}
          {showSectionBreak ? <View style={{ height: 6 }} /> : null}
          <RemoteRecordingCard
            file={item.file}
            downloadState={downloadState}
            thumbActive={activeThumbnailPaths.has(item.file.path)}
            selecting={selecting}
            selected={selected.has(item.file.path)}
            onToggleSelect={toggleSelect}
            onLongPressSelect={enterSelectionWith}
            onDownload={onDownload}
            onResume={onResume}
            onOpenDownloaded={openDownloaded}
            onOpenDetail={selecting ? undefined : setDetailFile}
          />
        </View>
      );
    },
    [
      listRows,
      activeThumbnailPaths,
      queueItems,
      localNames,
      queuePosition,
      selecting,
      selected,
      toggleSelect,
      enterSelectionWith,
      onDownload,
      onResume,
      openDownloaded,
      renderSectionBreak,
    ],
  );

  const listExtraData = useMemo(
    () => ({
      queueItems,
      localNames,
      queuePosition,
      activeThumbnailPaths,
      stickySectionKey,
      selecting,
      selected,
    }),
    [queueItems, localNames, queuePosition, activeThumbnailPaths, stickySectionKey, selecting, selected],
  );

  const detailDownloadState = useMemo(() => {
    if (!detailFile) return null;
    return resolveRemoteDownloadState({
      file: detailFile,
      queueItems,
      localNames,
      queuePosition,
    });
  }, [detailFile, queueItems, localNames, queuePosition]);

  const emptyPresentation =
    files.length === 0 && !showSkeleton ? libraryEmptyPresentation(cameraLinkState) : undefined;

  const listEmpty =
    emptyPresentation ? (
      <EmptyState
        icon={emptyPresentation.icon}
        title={emptyPresentation.title}
        subtitle={emptyPresentation.subtitle}
        actionLabel={emptyPresentation.actionLabel}
        onAction={
          emptyPresentation.actionLabel
            ? () => {
                setConnectionSheetOpen(true);
              }
            : undefined
        }
      />
    ) : filtered.length === 0 && files.length > 0 ? (
      <EmptyState
        icon="filter-outline"
        title="No recordings match these filters."
        subtitle="Try clearing filters or changing category."
      />
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {errorBanner ? (
        <Pressable
          onPress={() => setErrorDismissed(true)}
          style={[
            styles.banner,
            {
              marginHorizontal: spacing.lg,
              marginTop: spacing.sm,
              backgroundColor: colors.dangerSoft,
              borderColor: colors.danger,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Error: ${errorBanner}. Dismiss.`}
        >
          <Text style={[styles.bannerText, { color: colors.danger }]} numberOfLines={2}>
            {errorBanner}
          </Text>
        </Pressable>
      ) : null}

      <LibraryCategoryTabs
        selectedId={category}
        counts={counts}
        onSelect={(id) => {
          if (selecting) return;
          setCategory(id);
        }}
        disabled={!libraryInteractive || selecting}
        testID="camera-category-row"
      />

      {filterChips.length > 0 || hasAdvanced ? (
        <View
          style={[
            styles.summaryRow,
            { paddingHorizontal: spacing.lg },
            selecting ? { opacity: 0.45 } : null,
          ]}
          pointerEvents={selecting ? "none" : "auto"}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {filterChips.map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => {
                  if (selecting) return;
                  setFilters(clearCameraFilterGroup(filters, chip.id));
                }}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter ${chip.label}`}
                style={[styles.remChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.text, fontSize: 12, fontFamily: Type.fontSemi }}>
                  {chip.label}
                </Text>
                <Ionicons name="close" size={12} color={colors.textMuted} />
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.summaryText, { color: colors.textMuted }]}>
            {filtered.length} results · {formatMediaSizeMbGb(filteredBytes)}
          </Text>
          {hasAdvanced ? (
            <Pressable
              onPress={() => {
                if (selecting) return;
                setFilters(EMPTY_CAMERA_FILTERS);
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              hitSlop={HitSlop44}
            >
              <Text style={{ color: colors.brand, fontFamily: Type.fontSemi, fontSize: 12 }}>
                Clear all
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {selecting ? (
        <LocalSelectionContextBar
          selectedCount={selected.size}
          filteredCount={filtered.length}
          allSelected={allFilteredSelected}
          onClose={exitSelection}
          onToggleSelectAll={() => {
            if (allFilteredSelected) deselectAll();
            else selectAllFiltered();
          }}
          selectAllAccessibilityLabel={selectAllFilteredA11yLabel(filtered.length)}
          testID="library-selection-context-bar"
        />
      ) : null}

      {showSkeleton ? (
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <View style={styles.list}>
          {stickySection && filtered.length > 0 ? (
            <View style={[styles.stickyOverlay, { backgroundColor: colors.bg }]}>
              <LocalDateSectionHeader
                title={stickySection.title}
                countLabel={stickySection.countLabel}
                showSort
                sortDisabled={selecting || !libraryInteractive}
                sortValueLabel={localSortBarLabel(sort)}
                sortAccessibilityHint="Opens Library sorting options"
                sortTestID="library-section-sort"
                onPressSort={() => {
                  if (selecting || !libraryInteractive) return;
                  setSortOpen(true);
                }}
                testID="library-sticky-date-header"
              />
            </View>
          ) : null}

          <SelectionActionBand
            visible={showSelectionBar}
            testID="library-selection-action-band"
            mutedMessage={
              selected.size === 0
                ? "Select recordings"
                : selectionBreakdown.downloadEligibleCount === 0 &&
                    selectionBreakdown.cancelEligibleCount === 0
                  ? "Already downloaded"
                  : undefined
            }
            actions={
              selected.size === 0
                ? []
                : [
                    ...(selectionBreakdown.downloadEligibleCount > 0
                      ? [
                          {
                            key: "download",
                            tone: "brand" as const,
                            icon: "cloud-download-outline" as const,
                            label: libraryDownloadActionLabel(
                              selectionBreakdown.downloadEligibleCount,
                              formatMediaSizeMbGb(
                                selectionBreakdown.downloadEligible.reduce(
                                  (n, f) => n + f.sizeBytes,
                                  0,
                                ),
                              ),
                              selected.size,
                            ),
                            accessibilityLabel: libraryDownloadA11yLabel(
                              selectionBreakdown.downloadEligibleCount,
                              selected.size,
                            ),
                            accessibilityHint: `${selectionBreakdown.downloadEligibleCount} of ${selected.size} recordings will be added to Queue`,
                            onPress: () => void runBatchDownload(),
                            disabled: batchBusy,
                            busy: batchBusy,
                          },
                        ]
                      : []),
                    ...(selectionBreakdown.cancelEligibleCount > 0
                      ? [
                          {
                            key: "cancel",
                            tone: "warn" as const,
                            icon: "close-circle-outline" as const,
                            label: libraryCancelActionLabel(
                              selectionBreakdown.cancelEligibleCount,
                              selectionBreakdown.downloadEligibleCount > 0,
                            ),
                            accessibilityLabel: libraryCancelActionLabel(
                              selectionBreakdown.cancelEligibleCount,
                            ),
                            accessibilityHint: `${selectionBreakdown.cancelEligibleCount} Queue downloads will be cancelled`,
                            onPress: () => setCancelConfirmOpen(true),
                            disabled: batchBusy,
                          },
                        ]
                      : []),
                  ]
            }
          />

          <FlatList
            ref={libraryListRef}
            style={styles.list}
            data={listRows}
            keyExtractor={(item) => item.key}
            removeClippedSubviews={false}
            initialNumToRender={LIBRARY_LIST_VIRTUALIZATION.initialNumToRender}
            maxToRenderPerBatch={LIBRARY_LIST_VIRTUALIZATION.maxToRenderPerBatch}
            updateCellsBatchingPeriod={LIBRARY_LIST_VIRTUALIZATION.updateCellsBatchingPeriod}
            windowSize={LIBRARY_LIST_VIRTUALIZATION.windowSize}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            extraData={listExtraData}
            scrollEnabled={listScrollEnabled(hasOverflow, canPullToRefresh)}
            alwaysBounceVertical={listBounceEnabled(canPullToRefresh)}
            bounces={listBounceEnabled(canPullToRefresh)}
            overScrollMode={listOverScrollMode(canPullToRefresh)}
            showsVerticalScrollIndicator={hasOverflow}
            onLayout={handleListLayout}
            onContentSizeChange={onContentSizeChange}
            onScroll={onLibraryScroll}
            scrollEventThrottle={scrollEventThrottle}
            refreshControl={
              canPullToRefresh ? (
                <RefreshControl
                  refreshing={isRefreshingCamera}
                  onRefresh={() => void runRefresh()}
                  tintColor={colors.brand}
                />
              ) : undefined
            }
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingBottom: listPadBottom,
              paddingTop: spacing.sm,
              ...(filtered.length === 0 ? { flexGrow: 1 } : null),
            }}
            ListEmptyComponent={listEmpty}
            ItemSeparatorComponent={listItemSeparator}
            renderItem={renderItem}
          />
        </View>
      )}

      <FloatingBackToTop
        visible={backToTopVisible && backToTopEnabled}
        onPress={onBackToTopPress}
      />

      <Modal
        visible={cancelConfirmOpen && selecting && selectionBreakdown.cancelEligibleCount > 0}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!batchBusy) setCancelConfirmOpen(false);
        }}
      >
        <View style={styles.modalScrim}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.xl,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {libraryCancelConfirmTitle(selectionBreakdown.cancelEligibleCount)}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: Type.font, fontSize: 14, marginTop: 8 }}>
              {libraryCancelConfirmMessage(selectionBreakdown.cancelEligibleCount)}
            </Text>
            <Pressable
              onPress={() => void runBatchCancel()}
              disabled={batchBusy}
              accessibilityRole="button"
              accessibilityLabel={libraryCancelActionLabel(selectionBreakdown.cancelEligibleCount)}
              style={({ pressed }) => [
                styles.modalPrimary,
                {
                  backgroundColor: colors.warnSoft,
                  borderColor: colors.warn,
                  borderRadius: radius.md,
                  opacity: batchBusy || pressed ? 0.7 : 1,
                  minHeight: LOCAL_ACTION_HIT,
                },
              ]}
            >
              {batchBusy ? (
                <ActivityIndicator size="small" color={colors.warn} />
              ) : (
                <Text style={{ color: colors.warn, fontFamily: Type.fontBold, fontSize: 16 }}>
                  {libraryCancelActionLabel(selectionBreakdown.cancelEligibleCount)}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                if (!batchBusy) setCancelConfirmOpen(false);
              }}
              disabled={batchBusy}
              accessibilityRole="button"
              accessibilityLabel="Keep downloads"
              style={({ pressed }) => [
                styles.modalSecondary,
                { opacity: pressed ? 0.65 : 1, minHeight: LOCAL_ACTION_HIT },
              ]}
            >
              <Text style={{ color: colors.textMuted, fontFamily: Type.fontSemi, fontSize: 15 }}>
                Keep downloads
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <CameraConnectionSheet
        visible={connectionSheetOpen && !selecting}
        linkState={cameraLinkState}
        refreshing={isRefreshingCamera}
        cameraModel={cameraModel}
        cameraHost={cameraHost}
        lastConnectedAt={lastConnectedAt}
        recordingCount={files.length}
        onClose={() => setConnectionSheetOpen(false)}
        onTryConnect={runRefresh}
        onRefresh={runRefresh}
      />

      <CameraFilterSheet
        visible={filterOpen && !selecting}
        initial={filters}
        categoryScope={category}
        files={files}
        search=""
        downloadedNames={localNames}
        queuedNames={queuedNames}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
      />

      <StaticBackdropSheet
        visible={sortOpen && !selecting}
        onClose={() => setSortOpen(false)}
        sheetTestID="sort-sheet"
        scrimTestID="sort-scrim"
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

      <RemoteDetailSheet
        file={detailFile}
        downloadState={detailDownloadState}
        visible={detailFile !== null && !selecting}
        onClose={() => setDetailFile(null)}
        onDownload={onDownload}
        onResume={onResume}
        onPlay={openDownloaded}
        onViewQueue={() => {
          setDetailFile(null);
          router.push("/(tabs)/two" as Parameters<typeof router.push>[0]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bannerText: { fontSize: 12, fontFamily: Type.fontSemi },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28, marginBottom: 4 },
  remChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryText: { fontSize: 11, fontFamily: Type.font, flexShrink: 0 },
  list: { flex: 1 },
  libraryFileRow: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "stretch",
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
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Type.fontBold,
  },
  modalPrimary: {
    marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingVertical: 12,
  },
  modalSecondary: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
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
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 10 },
      ios: {},
      default: {},
    }),
  },
  sectionTitle: { flex: 1, fontSize: 11, fontFamily: Type.fontSemi, letterSpacing: 0.5 },
  sectionCount: { fontSize: 11, fontFamily: Type.font },
  skeleton: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  skelThumb: { width: 84, height: 63 },
  skelLine: { height: 10, borderRadius: 4 },
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
});
