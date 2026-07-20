import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCameraLibrarySections,
  countCategories,
  filterAndSortRemoteFiles,
  isCameraFiltersEmpty,
  isCameraLibraryInteractive,
  librarySubtitle,
  libraryEmptyInstruction,
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

  it("sorts newest and by name", () => {
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
    const byName = filterAndSortRemoteFiles({
      files,
      category: "all",
      search: "",
      filters: EMPTY_CAMERA_FILTERS,
      sort: "nameAsc",
      downloadedNames: new Set(),
    });
    assert.equal(byName[0]?.name, "A.MP4");
  });

  it("groups by date for newest and flat for name sort", () => {
    const files = [
      remote({ name: "A.MP4", path: "/SD/A.MP4", recordedAt: "2026-07-19 10:00:00" }),
      remote({ name: "B.MP4", path: "/SD/B.MP4", recordedAt: "2026-07-18 10:00:00" }),
    ];
    const dated = buildCameraLibrarySections(files, "newest");
    assert.equal(dated.length, 2);
    assert.equal(dated[0]?.dayKey, "2026-07-19");
    const flat = buildCameraLibrarySections(files, "nameAsc");
    assert.equal(flat.length, 1);
    assert.equal(flat[0]?.key, "all");
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
  });

  it("dedupes empty-state instruction", () => {
    assert.equal(
      libraryEmptyInstruction("disconnected"),
      "Connect to the camera Wi-Fi to view recordings.",
    );
    assert.equal(libraryEmptyInstruction("connected"), undefined);
  });

  it("never shows a connected success banner", () => {
    assert.equal(SHOW_CONNECTED_SUCCESS_BANNER, false);
  });

  it("shows unavailable banner only when disconnected", () => {
    assert.equal(shouldShowCameraUnavailableBanner("disconnected", 0), true);
    assert.equal(shouldShowCameraUnavailableBanner("idle", 0), true);
    assert.equal(shouldShowCameraUnavailableBanner("connected", 10), false);
    assert.equal(shouldShowCameraUnavailableBanner("connecting", 0), false);
    assert.equal(shouldShowCameraUnavailableBanner("unstable", 5), false);
    assert.equal(shouldShowCameraUnavailableBanner("connection_lost", 0), true);
    assert.equal(shouldShowCameraUnavailableBanner("connection_lost", 3), false);
  });

  it("keeps filters interactive when a list exists", () => {
    assert.equal(isCameraLibraryInteractive("disconnected", 0), false);
    assert.equal(isCameraLibraryInteractive("connected", 0), true);
    assert.equal(isCameraLibraryInteractive("unstable", 2), true);
    assert.equal(isCameraLibraryInteractive("connection_lost", 4), true);
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
