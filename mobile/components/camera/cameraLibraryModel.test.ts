import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCameraLibrarySections,
  buildCameraLibraryFileRows,
  countCategories,
  filterAndSortRemoteFiles,
  isCameraFiltersEmpty,
  isCameraLibraryInteractive,
  librarySubtitle,
  libraryEmptyInstruction,
  libraryEmptyPresentation,
  bumpCameraSessionGeneration,
  isCameraSessionCurrent,
  friendlyConnectionError,
  matchesSearch,
  PRODUCTION_LIBRARY_FORBIDDEN_UI,
  sanitizeDiagnosticLine,
  EMPTY_CAMERA_FILTERS,
  SHOW_CONNECTED_SUCCESS_BANNER,
  shouldShowCameraUnavailableBanner,
  canStartCameraRefresh,
  CAMERA_REFRESH_IN_PROGRESS,
  CONNECTION_HELP_BACK_TITLE,
  containsForbiddenRouteUi,
  formatCameraSectionHeading,
  formatRemoteDateTime,
  CAMERA_UI_LOCALE,
  type CameraLibraryFilters,
} from "./cameraLibraryModel";
import {
  resolveRemoteDownloadState,
  shouldEnqueueOnDownloadPress,
} from "./remoteDownloadState";
import type { RemoteFile } from "../../packages/parsers/src/index";
import type { QueueItem } from "../../packages/local-db/src/index";

function remote(partial: Partial<RemoteFile> & Pick<RemoteFile, "name" | "path">): RemoteFile {
  return {
    category: "normal",
    camera: "front",
    mediaFormat: "mp4",
    sizeBytes: 1_000_000,
    writable: false,
    recordedAt: "2026-07-19 14:02:22",
    ...partial,
  };
}

describe("cameraLibraryModel", () => {
  it("forbids demo/dev chrome strings in production constant", () => {
    assert.ok(PRODUCTION_LIBRARY_FORBIDDEN_UI.includes("Demo Mode"));
    assert.ok(PRODUCTION_LIBRARY_FORBIDDEN_UI.includes("Live · Expo Go"));
    assert.ok(PRODUCTION_LIBRARY_FORBIDDEN_UI.includes("Fetch probe OK"));
  });

  it("counts categories and keeps zeros visible", () => {
    const files = [
      remote({ name: "a.MP4", path: "/SD/a.MP4", category: "normal" }),
      remote({ name: "b.MP4", path: "/SD/b.MP4", category: "parking" }),
      remote({ name: "c.MP4", path: "/SD/c.MP4", category: "parking" }),
    ];
    const counts = countCategories(files);
    assert.equal(counts.all, 3);
    assert.equal(counts.normal, 1);
    assert.equal(counts.parking, 2);
    assert.equal(counts.event, 0);
    assert.equal(counts.photo, 0);
  });

  it("searches name date and category", () => {
    const file = remote({ name: "FILE260719-140222F.MP4", path: "/SD/x.MP4" });
    assert.equal(matchesSearch(file, "140222"), true);
    assert.equal(matchesSearch(file, "2026-07-19"), true);
    assert.equal(matchesSearch(file, "normal"), true);
    assert.equal(matchesSearch(file, "zzz"), false);
  });

  it("sorts newest and by size", () => {
    const files = [
      remote({ name: "B.MP4", path: "/SD/B.MP4", recordedAt: "2026-07-18 10:00:00" }),
      remote({ name: "A.MP4", path: "/SD/A.MP4", recordedAt: "2026-07-19 10:00:00" }),
    ];
    const newest = filterAndSortRemoteFiles({
      files,
      category: "all",
      search: "",
      filters: EMPTY_CAMERA_FILTERS,
      sort: "newest",
      downloadedNames: new Set(),
    });
    assert.equal(newest[0]?.name, "A.MP4");
    const bySize = filterAndSortRemoteFiles({
      files: [
        remote({ name: "A.MP4", path: "/SD/A.MP4", recordedAt: "2026-07-19 10:00:00", sizeBytes: 10 }),
        remote({ name: "B.MP4", path: "/SD/B.MP4", recordedAt: "2026-07-19 11:00:00", sizeBytes: 99 }),
      ],
      category: "all",
      search: "",
      filters: EMPTY_CAMERA_FILTERS,
      sort: "largest",
      downloadedNames: new Set(),
    });
    assert.equal(bySize[0]?.name, "B.MP4");
  });

  it("groups by date for newest and flat for size sort", () => {
    const files = [
      remote({ name: "A.MP4", path: "/SD/A.MP4", recordedAt: "2026-07-19 10:00:00" }),
      remote({ name: "B.MP4", path: "/SD/B.MP4", recordedAt: "2026-07-18 10:00:00" }),
    ];
    const dated = buildCameraLibrarySections(files, "newest");
    assert.equal(dated.length, 2);
    assert.equal(dated[0]?.dayKey, "2026-07-19");
    assert.equal(dated[0]?.key, dated[0]?.dayKey);
    assert.equal(dated[1]?.dayKey, "2026-07-18");
    const oldest = buildCameraLibrarySections(files, "oldest");
    assert.equal(oldest[0]?.dayKey, "2026-07-18");
    assert.equal(oldest[1]?.dayKey, "2026-07-19");
    const flat = buildCameraLibrarySections(files, "largest");
    assert.equal(flat.length, 1);
    assert.equal(flat[0]?.key, "all-largest");
    assert.equal(flat[0]?.dayKey, "all-largest");
  });

  it("section keys stay stable and match dayKey for date groups", () => {
    const files = [
      remote({ name: "A.MP4", path: "/SD/A.MP4", recordedAt: "2026-07-19 10:00:00" }),
      remote({ name: "B.MP4", path: "/SD/B.MP4", recordedAt: "2026-07-19 11:00:00" }),
      remote({ name: "C.MP4", path: "/SD/C.MP4", recordedAt: "2026-07-18 10:00:00" }),
    ];
    const a = buildCameraLibrarySections(files, "newest");
    const b = buildCameraLibrarySections(files, "newest");
    assert.deepEqual(
      a.map((s) => s.key),
      b.map((s) => s.key),
    );
    for (const section of a) {
      assert.equal(section.key, section.dayKey);
      assert.notEqual(section.key, String(a.indexOf(section)));
    }
  });

  it("keeps non-consecutive calendar days adjacent without empty gap section", () => {
    const files = [
      remote({ name: "Sun1.MP4", path: "/SD/Sun1.MP4", recordedAt: "2026-07-19 10:00:00" }),
      remote({ name: "Fri1.MP4", path: "/SD/Fri1.MP4", recordedAt: "2026-07-17 09:00:00" }),
    ];
    const sections = buildCameraLibrarySections(files, "newest");
    assert.equal(sections.length, 2);
    assert.equal(sections[0]?.dayKey, "2026-07-19");
    assert.equal(sections[1]?.dayKey, "2026-07-17");
    assert.ok(!sections.some((s) => s.dayKey === "2026-07-18"));
    assert.ok(!sections.some((s) => s.data.length === 0));
    assert.deepEqual(
      sections.map((s) => s.key),
      ["2026-07-19", "2026-07-17"],
    );
    assert.equal(new Set(sections.map((s) => s.key)).size, sections.length);
  });

  it("stress ~379 files with gap on 18 July stays consecutive and complete", () => {
    const files: RemoteFile[] = [];
    let n = 0;
    const pushDay = (day: string, count: number) => {
      for (let i = 0; i < count; i += 1) {
        n += 1;
        const hh = String(10 + Math.floor(i / 60)).padStart(2, "0");
        const mm = String(i % 60).padStart(2, "0");
        files.push(
          remote({
            name: `F${n}.MP4`,
            path: `/SD/F${n}.MP4`,
            recordedAt: `${day} ${hh}:${mm}:00`,
          }),
        );
      }
    };
    pushDay("2026-07-22", 80);
    pushDay("2026-07-21", 80);
    pushDay("2026-07-20", 80);
    pushDay("2026-07-19", 22);
    // no files on 2026-07-18
    pushDay("2026-07-17", 18);
    pushDay("2026-07-16", 99);
    assert.equal(files.length, 379);

    const sections = buildCameraLibrarySections(files, "newest");
    const keys = sections.map((s) => s.key);
    assert.equal(keys.filter((k) => k === "2026-07-18").length, 0);
    const i19 = keys.indexOf("2026-07-19");
    const i17 = keys.indexOf("2026-07-17");
    assert.ok(i19 >= 0 && i17 >= 0);
    assert.equal(i17, i19 + 1);
    assert.equal(sections[i19]?.data.length, 22);
    assert.equal(sections[i17]?.data.length, 18);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(
      sections.reduce((sum, s) => sum + s.data.length, 0),
      379,
    );

    const rows = buildCameraLibraryFileRows(sections);
    assert.equal(rows.length, 379);
    assert.equal(new Set(rows.map((r) => r.key)).size, 379);
    const row19 = rows.filter((r) => r.sectionKey === "2026-07-19");
    const row17 = rows.filter((r) => r.sectionKey === "2026-07-17");
    assert.equal(row19.length, 22);
    assert.equal(row17.length, 18);
    const last19 = rows.findIndex((r) => r.sectionKey === "2026-07-19");
    // last 19 row is immediately followed by first 17 row
    let boundary = -1;
    for (let i = 0; i < rows.length - 1; i += 1) {
      if (rows[i]?.sectionKey === "2026-07-19" && rows[i + 1]?.sectionKey === "2026-07-17") {
        boundary = i;
        break;
      }
    }
    assert.ok(boundary >= 0, "19 July rows must be adjacent to 17 July rows");
    assert.equal(rows.some((r) => r.sectionKey === "2026-07-18"), false);
    void last19;
  });

  it("filters downloaded state", () => {
    const files = [
      remote({ name: "A.MP4", path: "/SD/A.MP4" }),
      remote({ name: "B.MP4", path: "/SD/B.MP4" }),
    ];
    const filters: CameraLibraryFilters = { ...EMPTY_CAMERA_FILTERS, downloaded: "downloaded" };
    const out = filterAndSortRemoteFiles({
      files,
      category: "all",
      search: "",
      filters,
      sort: "newest",
      downloadedNames: new Set(["A.MP4"]),
    });
    assert.equal(out.length, 1);
    assert.equal(out[0]?.name, "A.MP4");
    assert.equal(isCameraFiltersEmpty(filters), false);
  });

  it("builds library subtitles from real counts", () => {
    assert.equal(
      librarySubtitle({
        linkState: "connected",
        totalCount: 346,
        filteredCount: 346,
        hasActiveFilters: false,
      }),
      "346 recordings on camera",
    );
    assert.equal(
      librarySubtitle({
        linkState: "connected",
        totalCount: 346,
        filteredCount: 24,
        hasActiveFilters: true,
      }),
      "24 of 346 recordings",
    );
    assert.equal(
      librarySubtitle({
        linkState: "connecting",
        totalCount: 0,
        filteredCount: 0,
        hasActiveFilters: false,
      }),
      "Connecting to camera…",
    );
    assert.equal(
      librarySubtitle({
        linkState: "unstable",
        totalCount: 10,
        filteredCount: 10,
        hasActiveFilters: false,
      }),
      "10 recordings on camera",
    );
    assert.equal(
      librarySubtitle({
        linkState: "disconnected",
        totalCount: 0,
        filteredCount: 0,
        hasActiveFilters: false,
      }),
      "Camera not connected",
    );
    assert.equal(
      librarySubtitle({
        linkState: "connection_lost",
        totalCount: 379,
        filteredCount: 379,
        hasActiveFilters: false,
      }),
      "Connection lost",
    );
  });

  it("dedupes empty-state instruction", () => {
    assert.equal(
      libraryEmptyInstruction("disconnected"),
      "Connect to the camera Wi-Fi to view recordings.",
    );
    assert.equal(libraryEmptyInstruction("connected"), undefined);
  });

  it("library empty presentation uses title/subtitle/action", () => {
    const disconnected = libraryEmptyPresentation("disconnected");
    assert.equal(disconnected?.title, "Camera not connected");
    assert.match(disconnected?.subtitle ?? "", /Wi-Fi/);
    assert.equal(disconnected?.actionLabel, "Connect camera");
    assert.equal(disconnected?.icon, "cloud-offline-outline");

    const lost = libraryEmptyPresentation("connection_lost");
    assert.equal(lost?.title, "Camera connection lost");
    assert.equal(lost?.actionLabel, "Reconnect");

    const emptySd = libraryEmptyPresentation("connected");
    assert.equal(emptySd?.title, "No recordings found");
    assert.equal(emptySd?.actionLabel, undefined);
    assert.equal(emptySd?.icon, "folder-open-outline");
  });

  it("never shows a connected success banner", () => {
    assert.equal(SHOW_CONNECTED_SUCCESS_BANNER, false);
  });

  it("disables unavailable banner so list placeholder is primary", () => {
    assert.equal(shouldShowCameraUnavailableBanner("disconnected", 0), false);
    assert.equal(shouldShowCameraUnavailableBanner("idle", 0), false);
    assert.equal(shouldShowCameraUnavailableBanner("connection_lost", 0), false);
    assert.equal(shouldShowCameraUnavailableBanner("connected", 10), false);
  });

  it("filters are interactive only for a live remote session", () => {
    assert.equal(isCameraLibraryInteractive("disconnected"), false);
    assert.equal(isCameraLibraryInteractive("idle"), false);
    assert.equal(isCameraLibraryInteractive("connection_lost"), false);
    assert.equal(isCameraLibraryInteractive("connected"), true);
    assert.equal(isCameraLibraryInteractive("unstable"), true);
  });

  it("camera session generation blocks stale list application", () => {
    const next = bumpCameraSessionGeneration(3);
    assert.equal(next, 4);
    assert.equal(isCameraSessionCurrent(3, 4), false);
    assert.equal(isCameraSessionCurrent(4, 4), true);
  });

  it("prevents concurrent camera refresh", () => {
    assert.equal(canStartCameraRefresh(false), true);
    assert.equal(canStartCameraRefresh(true), false);
    assert.match(CAMERA_REFRESH_IN_PROGRESS, /already in progress/i);
  });

  it("uses English camera locale for dates", () => {
    assert.equal(CAMERA_UI_LOCALE, "en-GB");
    const heading = formatCameraSectionHeading("2026-07-19");
    assert.match(heading, /JULY/i);
    assert.doesNotMatch(heading, /IULIE/i);
    const card = formatRemoteDateTime("2026-07-19 14:02:22");
    assert.match(card, /Jul/i);
    assert.doesNotMatch(card, /iul/i);
  });

  it("never exposes internal route group names in chrome strings", () => {
    assert.equal(containsForbiddenRouteUi("(tabs)"), true);
    assert.equal(containsForbiddenRouteUi(CONNECTION_HELP_BACK_TITLE), false);
    assert.equal(CONNECTION_HELP_BACK_TITLE, "Back");
    assert.equal(containsForbiddenRouteUi("Camera connected"), false);
  });

  it("maps raw errors to friendly connection copy", () => {
    assert.match(friendlyConnectionError("timeout waiting") ?? "", /did not respond/i);
    assert.match(friendlyConnectionError("Camera connection lost") ?? "", /disconnected/i);
    assert.equal(friendlyConnectionError("secret=abc123")?.includes("abc123"), false);
  });

  it("sanitizes diagnostic secrets and paths", () => {
    const line = sanitizeDiagnosticLine(
      "token=abc123 path C:\\Users\\me\\secret and Bearer xyz",
    );
    assert.equal(line.includes("abc123"), false);
    assert.equal(line.includes("xyz"), false);
    assert.match(line, /\[redacted\]/);
    assert.match(line, /\[path\]/);
  });
});

describe("remoteDownloadState", () => {
  const file = remote({ name: "A.MP4", path: "/SD/A.MP4" });

  it("marks downloaded from local names", () => {
    const state = resolveRemoteDownloadState({
      file,
      queueItems: [],
      localNames: new Set(["A.MP4"]),
      queuePosition: () => undefined,
    });
    assert.equal(state.kind, "downloaded");
    assert.equal(shouldEnqueueOnDownloadPress(state), false);
  });

  it("queued and downloading states", () => {
    const queued: QueueItem = {
      id: "1",
      remotePath: "/SD/A.MP4",
      localName: "A.MP4",
      expectedBytes: 100,
      status: "queued",
      createdAt: "",
      updatedAt: "",
    };
    const q = resolveRemoteDownloadState({
      file,
      queueItems: [queued],
      localNames: new Set(),
      queuePosition: () => 2,
    });
    assert.equal(q.kind, "queued");
    if (q.kind === "queued") assert.equal(q.position, 2);

    const active: QueueItem = { ...queued, status: "active", bytesReceived: 50 };
    const d = resolveRemoteDownloadState({
      file,
      queueItems: [active],
      localNames: new Set(),
      queuePosition: () => undefined,
    });
    assert.equal(d.kind, "downloading");
    if (d.kind === "downloading") assert.equal(d.percent, 50);
  });

  it("explicit download only for available and failed", () => {
    assert.equal(shouldEnqueueOnDownloadPress({ kind: "available" }), true);
    assert.equal(shouldEnqueueOnDownloadPress({ kind: "failed", queueId: "1" }), true);
    assert.equal(shouldEnqueueOnDownloadPress({ kind: "queued", position: 1, queueId: "1" }), false);
    assert.equal(shouldEnqueueOnDownloadPress({ kind: "downloaded" }), false);
  });

  it("cancelled returns available", () => {
    const cancelled: QueueItem = {
      id: "1",
      remotePath: "/SD/A.MP4",
      localName: "A.MP4",
      expectedBytes: 100,
      status: "cancelled",
      createdAt: "",
      updatedAt: "",
    };
    const state = resolveRemoteDownloadState({
      file,
      queueItems: [cancelled],
      localNames: new Set(),
      queuePosition: () => undefined,
    });
    assert.equal(state.kind, "available");
  });
});
