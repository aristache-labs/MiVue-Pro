import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { QueueItem } from "@/packages/local-db/src/index";
import type { RemoteFile } from "@/packages/parsers/src/index";

import {
  classifyLibrarySelection,
  isCancellableQueueStatus,
  libraryCancelActionLabel,
  libraryCancelConfirmMessage,
  libraryDownloadActionLabel,
  librarySelectionTitle,
  pruneSelectionToPaths,
} from "./librarySelection";

function remote(partial: Partial<RemoteFile> & Pick<RemoteFile, "name" | "path">): RemoteFile {
  return {
    sizeBytes: 1_000_000,
    recordedAt: "2026-07-19 10:00:00",
    durationSeconds: 20,
    category: "normal",
    camera: "front",
    mediaFormat: "H264",
    writable: false,
    ...partial,
  };
}

function queueItem(
  partial: Partial<QueueItem> & Pick<QueueItem, "id" | "remotePath" | "localName" | "status">,
): QueueItem {
  return {
    expectedBytes: 1_000_000,
    createdAt: "2026-07-19T10:00:00.000Z",
    updatedAt: "2026-07-19T10:00:00.000Z",
    ...partial,
  };
}

describe("librarySelection helpers", () => {
  it("titles and action labels", () => {
    assert.equal(librarySelectionTitle(0), "Select recordings");
    assert.equal(librarySelectionTitle(1), "1 selected");
    assert.equal(librarySelectionTitle(4), "4 selected");
    assert.equal(libraryDownloadActionLabel(1), "Download · 1");
    assert.equal(libraryDownloadActionLabel(4), "Download · 4");
    assert.equal(libraryDownloadActionLabel(4, "1.45 GB"), "Download · 4 · 1.45 GB");
    assert.equal(libraryCancelActionLabel(1), "Cancel download · 1");
    assert.equal(libraryCancelActionLabel(2), "Cancel downloads · 2");
    assert.equal(libraryCancelActionLabel(2, true), "Cancel · 2");
    assert.match(libraryCancelConfirmMessage(2), /2 selected downloads/);
  });

  it("prunes selection to stable paths", () => {
    const next = pruneSelectionToPaths(new Set(["/a", "/b", "/c"]), ["/a", "/c"]);
    assert.deepEqual([...next].sort(), ["/a", "/c"]);
  });

  it("classifies mixed download and cancel eligibility", () => {
    const files = [
      remote({ name: "NEW.MP4", path: "/SD/NEW.MP4" }),
      remote({ name: "Q.MP4", path: "/SD/Q.MP4" }),
      remote({ name: "LOCAL.MP4", path: "/SD/LOCAL.MP4" }),
      remote({ name: "FAIL.MP4", path: "/SD/FAIL.MP4" }),
    ];
    const queueItems = [
      queueItem({
        id: "q1",
        remotePath: "/SD/Q.MP4",
        localName: "Q.MP4",
        status: "queued",
      }),
      queueItem({
        id: "f1",
        remotePath: "/SD/FAIL.MP4",
        localName: "FAIL.MP4",
        status: "failed",
      }),
    ];
    const breakdown = classifyLibrarySelection({
      selectedFiles: files,
      queueItems,
      localNames: new Set(["LOCAL.MP4"]),
      queuePosition: () => 1,
    });
    assert.equal(breakdown.downloadEligibleCount, 2); // NEW + FAIL(retry)
    assert.deepEqual(
      breakdown.downloadEligible.map((f) => f.path).sort(),
      ["/SD/FAIL.MP4", "/SD/NEW.MP4"],
    );
    assert.equal(breakdown.cancelEligibleCount, 1);
    assert.equal(breakdown.cancelEligible[0]?.queueId, "q1");
    assert.equal(breakdown.unavailableCount, 1); // LOCAL only
    assert.equal(isCancellableQueueStatus("queued"), true);
    assert.equal(isCancellableQueueStatus("failed"), false);
    assert.equal(isCancellableQueueStatus("completed"), false);
  });

  it("Library screen wires Select and selection mode contracts", () => {
    const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
    const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
    const band = readFileSync(join(__dirname, "SelectionActionBand.tsx"), "utf8");
    const card = readFileSync(join(__dirname, "../camera/RemoteRecordingCard.tsx"), "utf8");
    assert.match(index, /accessibilityLabel="Select recordings"/);
    assert.match(index, /setSelecting\(true\)/);
    assert.match(index, /librarySelectionTitle/);
    assert.match(index, /classifyLibrarySelection/);
    assert.match(index, /pruneSelectionToPaths/);
    assert.match(index, /exitSelection/);
    assert.match(index, /!selecting/);
    assert.match(index, /stickySectionKeyFromViewableItems/);
    assert.match(index, /RefreshControl/);
    assert.match(index, /FloatingBackToTop/);
    assert.match(index, /disabled=\{selecting \|\| !libraryInteractive\}/);
    assert.match(index, /SelectionActionBand/);
    assert.match(index, /library-selection-action-band/);
    assert.doesNotMatch(index, /selectionBarWrap/);
    assert.doesNotMatch(index, /position:\s*"absolute"[\s\S]{0,80}selection/);
    assert.doesNotMatch(index, /bottom:\s*tabBarHeight/);
    assert.match(local, /SelectionActionBand/);
    assert.match(local, /local-selection-action-band/);
    assert.match(local, /localDeleteSelectionLabel|Delete local/);
    assert.match(local, /shareLocalFile/);
    assert.doesNotMatch(local, /localShareActionLabel/);
    assert.doesNotMatch(local, /shareLocalFiles/);
    assert.match(band, /SELECTION_ACTION_BAND_H = 44/);
    assert.match(card, /selecting/);
    assert.match(card, /accessibilityRole="checkbox"/);
    assert.match(card, /onLongPressSelect/);
    assert.match(card, /inert=\{selecting\}/);
    assert.match(card, /CompactDownloadAction/);
    assert.doesNotMatch(card, /actions=\{!selecting/);
    assert.doesNotMatch(index, /cameraMutate|format SD|del\?/i);
  });
});
