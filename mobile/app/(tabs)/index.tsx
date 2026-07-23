import Ionicons from "@expo/vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
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
import { LOCAL_LIBRARY_LIST_BOTTOM_PADDING } from "@/components/local/localLibrarySections";
import { SheetCloseButton } from "@/components/media/SheetCloseButton";
import { StaticBackdropSheet } from "@/components/media/StaticBackdropSheet";
import { FloatingBackToTop } from "@/components/navigation/FloatingBackToTop";
import { TabScreenHeader } from "@/components/navigation/TabScreenHeader";
import {
  LibraryCategoryTabs,
} from "@/components/library/LibraryCategoryTabs";
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CameraLibraryFilters>(EMPTY_CAMERA_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [detailFile, setDetailFile] = useState<RemoteFile | null>(null);
  const [connectionSheetOpen, setConnectionSheetOpen] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localNames = useMemo(() => new Set(localFiles.map((f) => f.name)), [localFiles]);
  const queuedNames = useMemo(() => {
    const names = new Set<string>();
    for (const item of queueItems) {
      if (
        item.status === "queued" ||
        item.status === "active" ||
        item.status === "paused"
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
  const hasSecondaryFilters = hasAdvanced || search.trim().length > 0;
  const hasActiveFilters = hasAdvanced || category !== "all" || search.trim().length > 0;
  const activeGroups = countCameraFilterGroups(filters);
  const sortOptions = useMemo(() => cameraSortOptionsForCategory(category), [category]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearch(searchInput), 200);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchInput]);

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
        search,
        filters,
        sort,
        downloadedNames: localNames,
        queuedNames: stableQueuedNames,
      }),
    [files, category, search, filters, sort, localNames, stableQueuedNames],
  );

  const sections = useMemo(() => buildCameraLibrarySections(filtered, sort), [filtered, sort]);
  const listRows = useMemo(() => buildCameraLibraryFileRows(sections), [sections]);
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
    setSearchInput("");
    setSearch("");
    setFilters(EMPTY_CAMERA_FILTERS);
    setCategory("all");
  }, [cameraLinkState]);

  const openConnectionSheet = useCallback(() => {
    if (cameraLinkState === "connecting" || isRefreshingCamera) return;
    setConnectionSheetOpen(true);
  }, [cameraLinkState, isRefreshingCamera]);

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
    navigation.setOptions({
      header: () => (
        <TabScreenHeader
          title="Library"
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
  }, [navigation, cameraLinkState, isRefreshingCamera, openConnectionSheet]);

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
      <View
        collapsable={false}
        style={[
          styles.sectionHeader,
          { backgroundColor: colors.bg, borderBottomColor: colors.borderSoft },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
          {row.sectionTitle}
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
          {row.sectionCountLabel}
        </Text>
      </View>
    ),
    [colors.bg, colors.borderSoft, colors.textMuted],
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
          {showSectionBreak ? <View style={{ height: spacing.sm }} /> : null}
          <RemoteRecordingCard
            file={item.file}
            downloadState={downloadState}
            thumbActive={activeThumbnailPaths.has(item.file.path)}
            onDownload={onDownload}
            onResume={onResume}
            onOpenDownloaded={openDownloaded}
            onOpenDetail={setDetailFile}
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
      onDownload,
      onResume,
      openDownloaded,
      renderSectionBreak,
      spacing.sm,
    ],
  );

  const listExtraData = useMemo(
    () => ({ queueItems, localNames, queuePosition, activeThumbnailPaths, stickySectionKey }),
    [queueItems, localNames, queuePosition, activeThumbnailPaths, stickySectionKey],
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
        icon={search.trim() ? "search-outline" : "filter-outline"}
        title={
          search.trim()
            ? "No recordings match your search"
            : "No recordings match these filters."
        }
        subtitle={search.trim() ? undefined : "Try clearing search or filters."}
        actionLabel={search.trim() ? "Clear search" : undefined}
        onAction={search.trim() ? () => { setSearchInput(""); setSearch(""); } : undefined}
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
        onSelect={setCategory}
        disabled={!libraryInteractive}
        testID="camera-category-row"
      />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
        <View style={[styles.toolbar, { opacity: libraryInteractive ? 1 : 0.55 }]}>
          <View
            style={[
              styles.searchWrap,
              { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.sm },
            ]}
            pointerEvents={libraryInteractive ? "auto" : "none"}
          >
            <Ionicons name="search" size={16} color={colors.textFaint} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search name, date or time"
              placeholderTextColor={colors.textFaint}
              style={[styles.searchInput, { color: colors.text }]}
              accessibilityLabel="Search name, date or time"
              accessibilityState={{ disabled: !libraryInteractive }}
              editable={libraryInteractive}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchInput.length > 0 ? (
              <Pressable
                onPress={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={HitSlop44}
                style={styles.searchClear}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            disabled={!libraryInteractive}
            accessibilityRole="button"
            accessibilityState={{ disabled: !libraryInteractive }}
            accessibilityLabel={
              activeGroups > 0 ? `Filter library, ${activeGroups} filters active` : "Filter library"
            }
            hitSlop={HitSlop44}
            style={[styles.toolBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons name="options-outline" size={20} color={colors.textMuted} />
            {activeGroups > 0 ? (
              <View style={[styles.filterDot, { backgroundColor: colors.brand }]}>
                <Text style={{ color: colors.onBrand, fontSize: 9, fontFamily: Type.fontSemi }}>
                  {activeGroups}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => setSortOpen(true)}
            disabled={!libraryInteractive}
            accessibilityRole="button"
            accessibilityState={{ disabled: !libraryInteractive }}
            accessibilityLabel="Sort recordings"
            hitSlop={HitSlop44}
            style={[styles.toolBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Ionicons name="swap-vertical-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {filterChips.length > 0 || hasSecondaryFilters ? (
          <View style={styles.summaryRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {filterChips.map((chip) => (
                <Pressable
                  key={chip.id}
                  onPress={() => setFilters(clearCameraFilterGroup(filters, chip.id))}
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
            {hasSecondaryFilters ? (
              <Pressable
                onPress={() => {
                  setFilters(EMPTY_CAMERA_FILTERS);
                  setSearchInput("");
                  setSearch("");
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
      </View>

      {showSkeleton ? (
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <View style={styles.list}>
          {stickySection && filtered.length > 0 ? (
            <View
              collapsable={false}
              pointerEvents="none"
              style={[
                styles.sectionHeader,
                styles.stickyOverlay,
                { backgroundColor: colors.bg, borderBottomColor: colors.borderSoft },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
                {stickySection.title}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                {stickySection.countLabel}
              </Text>
            </View>
          ) : null}
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

      <CameraConnectionSheet
        visible={connectionSheetOpen}
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
        visible={filterOpen}
        initial={filters}
        categoryScope={category}
        files={files}
        search={search}
        downloadedNames={localNames}
        queuedNames={queuedNames}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
      />

      <StaticBackdropSheet
        visible={sortOpen}
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
            <View style={styles.sortHeader}>
              <View style={styles.sortHeaderSide} />
              <Text
                style={[styles.sortTitle, { color: colors.text }]}
                accessibilityRole="header"
              >
                Sort
              </Text>
              <View style={styles.sortHeaderSide}>
                <SheetCloseButton onPress={requestClose} accessibilityLabel="Close sort" />
              </View>
            </View>
            <ScrollView
              style={styles.sortScroll}
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
        visible={detailFile !== null}
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
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bannerText: { fontSize: 12, fontFamily: Type.fontSemi },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    minHeight: 40,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: Type.font, paddingVertical: 8 },
  searchClear: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  toolBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
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
    paddingTop: 8,
  },
  sortBody: { flexShrink: 1 },
  sortHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
  },
  sortHeaderSide: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sortTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: Type.fontBold,
  },
  sortScroll: { flexShrink: 1 },
  sortRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
});
