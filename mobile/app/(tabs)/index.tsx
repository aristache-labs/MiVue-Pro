import Ionicons from "@expo/vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CameraConnectionHeaderButton } from "@/components/camera/CameraConnectionHeaderButton";
import { CameraConnectionSheet } from "@/components/camera/CameraConnectionSheet";
import { CameraFilterSheet } from "@/components/camera/CameraFilterSheet";
import { CameraUnavailableBanner } from "@/components/camera/CameraUnavailableBanner";
import {
  buildCameraFilterChips,
  buildCameraLibrarySections,
  cameraSortOptionsForCategory,
  clearCameraFilterGroup,
  countCameraFilterGroups,
  countCategories,
  EMPTY_CAMERA_FILTERS,
  filterAndSortRemoteFiles,
  formatCountAbbrev,
  formatMediaSizeMbGb,
  friendlyConnectionError,
  isCameraFiltersEmpty,
  isCameraLibraryInteractive,
  libraryEmptyInstruction,
  librarySubtitle,
  sanitizeFiltersForCategoryScope,
  shouldShowCameraUnavailableBanner,
  sumRemoteBytes,
  type CameraLibraryFilters,
  type CameraLibrarySort,
  type CategoryFilter,
} from "@/components/camera/cameraLibraryModel";
import { RemoteDetailSheet } from "@/components/camera/RemoteDetailSheet";
import { RemoteRecordingCard } from "@/components/camera/RemoteRecordingCard";
import {
  resolveRemoteDownloadState,
  shouldEnqueueOnDownloadPress,
} from "@/components/camera/remoteDownloadState";
import {
  LOCAL_LIBRARY_LIST_BOTTOM_PADDING,
  LOCAL_LIBRARY_STICKY_HEADERS,
} from "@/components/local/localLibrarySections";
import { EmptyState } from "@/components/ui/EmptyState";
import { HitSlop44, Type, useAppTheme } from "@/constants/Theme";
import { useDemoMode } from "@/context/DemoModeContext";
import type { RemoteFile } from "@/packages/parsers/src/index";

const CATEGORY_CHIPS: readonly { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "normal", label: "Normal" },
  { id: "parking", label: "Parking" },
  { id: "event", label: "Event" },
  { id: "photo", label: "Photos" },
];

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
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    files,
    queueItems,
    localFiles,
    enqueueDownload,
    resumeDownload,
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
  const [errorBanner, setErrorBanner] = useState<string | undefined>();
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
        queuedNames,
      }),
    [files, category, search, filters, sort, localNames, queuedNames],
  );

  const sections = useMemo(() => buildCameraLibrarySections(filtered, sort), [filtered, sort]);
  const filteredBytes = useMemo(() => sumRemoteBytes(filtered), [filtered]);
  const filterChips = useMemo(() => buildCameraFilterChips(filters), [filters]);

  const subtitle = librarySubtitle({
    linkState: cameraLinkState,
    totalCount: files.length,
    filteredCount: filtered.length,
    hasActiveFilters,
  });

  const showUnavailableBanner = shouldShowCameraUnavailableBanner(
    cameraLinkState,
    files.length,
  );
  const libraryInteractive = isCameraLibraryInteractive(cameraLinkState, files.length);

  const openConnectionSheet = useCallback(() => {
    if (cameraLinkState === "connecting" || isRefreshingCamera) return;
    setConnectionSheetOpen(true);
  }, [cameraLinkState, isRefreshingCamera]);

  const runRefresh = useCallback(async () => {
    setErrorBanner(undefined);
    const result = await refreshFiles();
    if (!result.ok) {
      setErrorBanner(friendlyConnectionError(result.error));
    }
    return result;
  }, [refreshFiles]);

  useEffect(() => {
    if (lastError && (cameraLinkState === "unstable" || cameraLinkState === "connection_lost")) {
      setErrorBanner(friendlyConnectionError(lastError));
    }
  }, [lastError, cameraLinkState]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.navTitleWrap}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Library</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      ),
      headerTitleAlign: "center",
      headerRight: () => (
        <CameraConnectionHeaderButton
          linkState={cameraLinkState}
          refreshing={isRefreshingCamera}
          onPress={openConnectionSheet}
        />
      ),
      headerRightContainerStyle: {
        paddingRight: Platform.OS === "ios" ? 4 : 8,
      },
    });
  }, [
    navigation,
    colors,
    subtitle,
    cameraLinkState,
    isRefreshingCamera,
    openConnectionSheet,
  ]);

  const onDownload = useCallback(
    (file: RemoteFile) => {
      const state = resolveRemoteDownloadState({
        file,
        queueItems,
        localNames,
        queuePosition,
      });
      if (!shouldEnqueueOnDownloadPress(state)) return;
      void enqueueDownload(file);
    },
    [enqueueDownload, queueItems, localNames, queuePosition],
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

  const detailDownloadState = useMemo(() => {
    if (!detailFile) return null;
    return resolveRemoteDownloadState({
      file: detailFile,
      queueItems,
      localNames,
      queuePosition,
    });
  }, [detailFile, queueItems, localNames, queuePosition]);

  const showSkeleton =
    isRefreshingCamera && files.length === 0 && cameraLinkState === "connecting";

  const emptyInstruction = libraryEmptyInstruction(cameraLinkState);

  const listEmpty =
    files.length === 0 && !showSkeleton ? (
      <EmptyState
        icon="cloud-offline-outline"
        title={
          cameraLinkState === "connected"
            ? "No recordings found on this camera."
            : (emptyInstruction ?? "Connect to the camera Wi-Fi to view recordings.")
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
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
        {showUnavailableBanner ? (
          <CameraUnavailableBanner
            connecting={isRefreshingCamera}
            onConnect={() => {
              setConnectionSheetOpen(true);
            }}
          />
        ) : null}

        {errorBanner && !showUnavailableBanner ? (
          <Pressable
            onPress={() => setErrorBanner(undefined)}
            style={[styles.banner, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}
            accessibilityRole="button"
            accessibilityLabel={`Error: ${errorBanner}. Dismiss.`}
          >
            <Text style={[styles.bannerText, { color: colors.danger }]} numberOfLines={2}>
              {errorBanner}
            </Text>
          </Pressable>
        ) : null}

        <View
          style={[styles.catRow, { opacity: libraryInteractive ? 1 : 0.55 }]}
          pointerEvents={libraryInteractive ? "auto" : "none"}
          testID="camera-category-row"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const selected = category === chip.id;
            const value = counts[chip.id];
            const abbrev = formatCountAbbrev(value);
            return (
              <Pressable
                key={chip.id}
                onPress={() => setCategory(chip.id)}
                disabled={!libraryInteractive}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !libraryInteractive }}
                accessibilityLabel={`${chip.label}, ${abbrev.a11y}`}
                style={[
                  styles.catCell,
                  {
                    borderColor: selected ? colors.brand : colors.border,
                    backgroundColor: selected ? colors.brandSoft : colors.surface,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text
                  style={[styles.catChipLabel, { color: selected ? colors.brand : colors.text }]}
                  numberOfLines={1}
                >
                  {chip.label}
                </Text>
                <Text
                  style={[
                    styles.catChipCount,
                    { color: selected ? colors.brandStrong : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {abbrev.display}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
        <SectionList
          style={styles.list}
          sections={sections.map((s) => ({ ...s, data: [...s.data] }))}
          keyExtractor={(item) => item.path}
          stickySectionHeadersEnabled={LOCAL_LIBRARY_STICKY_HEADERS}
          refreshControl={
            cameraLinkState === "connected" || cameraLinkState === "unstable" ? (
              <RefreshControl
                refreshing={isRefreshingCamera}
                onRefresh={() => void runRefresh()}
                tintColor={colors.brand}
              />
            ) : undefined
          }
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(tabBarHeight, LOCAL_LIBRARY_LIST_BOTTOM_PADDING),
            paddingTop: spacing.sm,
          }}
          ListEmptyComponent={listEmpty}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: colors.bg, borderBottomColor: colors.borderSoft },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
                {section.title}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                {section.countLabel}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => {
            const downloadState = resolveRemoteDownloadState({
              file: item,
              queueItems,
              localNames,
              queuePosition,
            });
            return (
              <RemoteRecordingCard
                file={item}
                downloadState={downloadState}
                onDownload={onDownload}
                onResume={onResume}
                onOpenDownloaded={openDownloaded}
                onOpenDetail={setDetailFile}
              />
            );
          }}
        />
      )}

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

      <Modal visible={sortOpen} animationType="fade" transparent onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sortBackdrop} onPress={() => setSortOpen(false)}>
          <View
            style={[
              styles.sortSheet,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sortTitle, { color: colors.text }]}>Sort</Text>
            {sortOptions.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setSort(opt.id);
                  setSortOpen(false);
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
                {sort === opt.id ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

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
  navTitleWrap: {
    alignItems: Platform.OS === "ios" ? "center" : "flex-start",
    marginTop: Platform.OS === "ios" ? -2 : 0,
    paddingBottom: 6,
  },
  navTitle: { fontSize: 17, fontFamily: Type.fontBold },
  navSubtitle: { fontSize: 11, fontFamily: Type.font, marginTop: 0 },
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bannerText: { fontSize: 12, fontFamily: Type.fontSemi },
  catRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    minHeight: 50,
  },
  catCell: {
    flex: 1,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  catChipLabel: { fontSize: 11, fontFamily: Type.fontSemi, textAlign: "center" },
  catChipCount: { fontSize: 11, fontFamily: Type.monoMed, textAlign: "center" },
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
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
  sortBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sortSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    paddingBottom: 28,
  },
  sortTitle: { fontSize: 17, fontFamily: Type.fontBold, marginBottom: 8 },
  sortRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
});
