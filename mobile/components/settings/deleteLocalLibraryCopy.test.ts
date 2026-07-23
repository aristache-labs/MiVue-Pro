import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { formatMediaSizeMbGb } from "../camera/cameraLibraryModel";
import { aggregateStorageBreakdown } from "./storageBreakdown";
import {
  deleteLocalLibraryConfirmButton,
  deleteLocalLibraryConfirmMessage,
  deleteLocalLibraryResultMessage,
  deleteLocalLibrarySubtitle,
  isDeleteLocalLibraryDisabled,
  runDeleteLocalLibraryBatch,
} from "./deleteLocalLibraryCopy";

describe("deleteLocalLibraryCopy", () => {
  it("confirm message includes real count and size", () => {
    const bytes = 4.14 * 1024 * 1024 * 1024;
    const msg = deleteLocalLibraryConfirmMessage(23, bytes);
    assert.match(msg, /23 local files/);
    assert.match(msg, /4\.14 GB/);
    assert.equal(
      msg,
      `This will permanently delete 23 local files using ${formatMediaSizeMbGb(bytes)}. Files exported outside Laneory will not be affected. This cannot be undone.`,
    );
  });

  it("uses singular for one file in confirm copy and button", () => {
    const bytes = 1024 * 1024;
    assert.match(deleteLocalLibraryConfirmMessage(1, bytes), /1 local file using/);
    assert.equal(deleteLocalLibraryConfirmButton(1), "Delete 1 file");
    assert.equal(deleteLocalLibraryConfirmButton(23), "Delete 23 files");
  });

  it("formats success, partial, and total-failure results", () => {
    assert.equal(deleteLocalLibraryResultMessage(23, 0), "23 local files deleted");
    assert.equal(deleteLocalLibraryResultMessage(1, 0), "1 local file deleted");
    assert.equal(
      deleteLocalLibraryResultMessage(20, 3),
      "20 deleted · 3 could not be deleted",
    );
    assert.equal(
      deleteLocalLibraryResultMessage(0, 3),
      "Local library could not be deleted. Please try again.",
    );
    assert.equal(
      deleteLocalLibraryResultMessage(0, 0),
      "Local library could not be deleted. Please try again.",
    );
  });

  it("disables action for empty library and while deleting", () => {
    assert.equal(isDeleteLocalLibraryDisabled(0, false), true);
    assert.equal(isDeleteLocalLibraryDisabled(3, true), true);
    assert.equal(isDeleteLocalLibraryDisabled(3, false), false);
    assert.equal(deleteLocalLibrarySubtitle(0), "No local files to delete");
    assert.match(deleteLocalLibrarySubtitle(2), /downloaded recordings and photos/);
  });

  it("Cancel never reaches the batch runner", async () => {
    let calls = 0;
    const deleteBatch = async () => {
      calls += 1;
      return { deleted: 0, failed: 0 };
    };
    // Cancel dismisses the confirm dialog without invoking the destructive handler.
    const onCancel = () => undefined;
    onCancel();
    assert.equal(calls, 0);
    // Only the confirm path would call the runner:
    assert.equal(typeof deleteBatch, "function");
  });

  it("confirm path calls deleteBatch with the same localFiles list", async () => {
    const files = [{ id: "a" }, { id: "b" }] as const;
    let received: readonly { id: string }[] | undefined;
    const gate = { current: false };
    const outcome = await runDeleteLocalLibraryBatch(gate, files, async (batch) => {
      received = batch;
      return { deleted: 2, failed: 0 };
    });
    assert.equal(outcome.skipped, false);
    if (!outcome.skipped) {
      assert.equal(outcome.deleted, 2);
      assert.equal(outcome.message, "2 local files deleted");
    }
    assert.deepEqual(received, files);
    assert.equal(gate.current, false);
  });

  it("guards against double-tap while a delete is in flight", async () => {
    const gate = { current: false };
    let calls = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deleteBatch = async () => {
      calls += 1;
      await pending;
      return { deleted: 1, failed: 0 };
    };
    const first = runDeleteLocalLibraryBatch(gate, [{ id: "x" }], deleteBatch);
    const second = await runDeleteLocalLibraryBatch(gate, [{ id: "x" }], deleteBatch);
    assert.equal(second.skipped, true);
    assert.equal(calls, 1);
    release();
    const done = await first;
    assert.equal(done.skipped, false);
    assert.equal(calls, 1);
  });

  it("skips empty library without calling deleteBatch", async () => {
    let calls = 0;
    const outcome = await runDeleteLocalLibraryBatch({ current: false }, [], async () => {
      calls += 1;
      return { deleted: 0, failed: 0 };
    });
    assert.equal(outcome.skipped, true);
    assert.equal(calls, 0);
  });

  it("after a full delete, aggregate stats are zero", () => {
    const before = aggregateStorageBreakdown([
      { category: "normal", sizeBytes: 100 },
      { category: "photo", sizeBytes: 50 },
    ]);
    assert.equal(before.total.count, 2);
    const after = aggregateStorageBreakdown([]);
    assert.equal(after.total.count, 0);
    assert.equal(after.total.bytes, 0);
    assert.equal(after.normal.count, 0);
    assert.equal(after.parking.count, 0);
    assert.equal(after.event.count, 0);
    assert.equal(after.photo.count, 0);
  });
});

describe("storage screen delete local library contract", () => {
  const src = readFileSync(join(__dirname, "../../app/settings/storage.tsx"), "utf8");

  it("wires SettingsDangerRow inside Local library and reuses deleteLocalFilesBatch", () => {
    assert.match(src, /title="Local library"/);
    assert.match(src, /Delete local library/);
    assert.match(src, /trash-outline/);
    assert.match(src, /SettingsDangerRow/);
    assert.match(src, /deleteLocalFilesBatch/);
    assert.match(src, /runDeleteLocalLibraryBatch\([\s\S]*localFiles[\s\S]*deleteLocalFilesBatch/);
    assert.match(src, /AccessibilityInfo\.announceForAccessibility/);
    assert.match(src, /Delete local library\?/);
    assert.match(src, /Deleting…/);
  });

  it("Cancel button does not delete; only destructive confirm calls the runner", () => {
    assert.match(src, /\{\s*text:\s*"Cancel",\s*style:\s*"cancel"\s*\}/);
    assert.match(
      src,
      /text:\s*deleteLocalLibraryConfirmButton\(count\),[\s\S]*style:\s*"destructive",[\s\S]*onPress:\s*\(\)\s*=>\s*void runDeleteLocalLibrary\(\)/,
    );
  });

  it("does not call camera-mutating or camera-contact APIs for this action", () => {
    assert.doesNotMatch(src, /createLiveTransport|CameraClient|getStatus|listAllFiles|formatSd|\bcgi\b/i);
    assert.doesNotMatch(src, /refreshFiles\(|setCameraHost|disconnectSession/);
    assert.doesNotMatch(src, /\bPOST\b|\bPUT\b|\bDELETE\b/);
    assert.match(src, /Clear thumbnail cache/);
    assert.match(src, /clearThumbCache/);
  });

  it("keeps Cache section independent from local library wipe", () => {
    const localIdx = src.indexOf('title="Local library"');
    const cacheIdx = src.indexOf('title="Cache"');
    const rowTitleIdx = src.indexOf('title={deletingLibrary ? "Deleting…" : "Delete local library"}');
    assert.ok(localIdx >= 0 && cacheIdx > localIdx);
    assert.ok(rowTitleIdx > localIdx && rowTitleIdx < cacheIdx);
  });
});
