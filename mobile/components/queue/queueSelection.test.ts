import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { QueueItem } from "../../packages/local-db/src/index";
import {
  canCancelQueueEntry,
  canPauseQueueEntry,
  canRemoveQueueEntry,
  classifyQueueSelection,
  pruneSelectionToIds,
  queueCancelConfirmMessage,
  queueRemoveConfirmMessage,
  queueSelectionTitle,
  revalidateQueueSelection,
} from "./queueSelection";

function item(partial: Partial<QueueItem> & Pick<QueueItem, "id" | "status">): QueueItem {
  return {
    remotePath: `/SD/${partial.id}.MP4`,
    localName: `${partial.id}.MP4`,
    expectedBytes: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("queueSelection helpers", () => {
  it("titles and prune use stable Queue IDs", () => {
    assert.equal(queueSelectionTitle(0), "Select downloads");
    assert.equal(queueSelectionTitle(1), "1 selected");
    assert.equal(queueSelectionTitle(4), "4 selected");
    assert.deepEqual(
      [...pruneSelectionToIds(new Set(["a", "gone"]), ["a", "b"])].sort(),
      ["a"],
    );
  });

  it("eligibility follows Queue status, not progress labels", () => {
    assert.equal(canPauseQueueEntry({ status: "active" }), true);
    assert.equal(canPauseQueueEntry({ status: "queued" }), true);
    assert.equal(canPauseQueueEntry({ status: "paused" }), false);
    assert.equal(canPauseQueueEntry({ status: "failed" }), false);

    assert.equal(canCancelQueueEntry({ status: "active" }), true);
    assert.equal(canCancelQueueEntry({ status: "paused" }), true);
    assert.equal(canCancelQueueEntry({ status: "queued" }), true);
    assert.equal(canCancelQueueEntry({ status: "cancelled" }), false);

    assert.equal(canRemoveQueueEntry({ status: "failed" }), true);
    assert.equal(canRemoveQueueEntry({ status: "cancelled" }), true);
    assert.equal(canRemoveQueueEntry({ status: "active" }), true);
  });

  it("mixed selection produces separate action counts", () => {
    const breakdown = classifyQueueSelection([
      item({ id: "1", status: "active" }),
      item({ id: "2", status: "failed" }),
      item({ id: "3", status: "paused" }),
    ]);
    assert.equal(breakdown.pauseEligibleCount, 1);
    assert.equal(breakdown.cancelEligibleCount, 2);
    assert.equal(breakdown.removeEligibleCount, 3);
    assert.match(queueCancelConfirmMessage(2), /remain available/);
    assert.match(queueRemoveConfirmMessage(2), /will not be deleted/);
  });

  it("revalidates eligibility against live Queue items", () => {
    const live = [
      item({ id: "1", status: "completed" }),
      item({ id: "2", status: "active" }),
    ];
    const selected = new Set(["1", "2", "missing"]);
    assert.deepEqual(
      revalidateQueueSelection(selected, live, canPauseQueueEntry).map((i) => i.id),
      ["2"],
    );
  });

  it("Queue screen wires selection mode contracts", () => {
    const src = readFileSync(join(__dirname, "../../app/(tabs)/two.tsx"), "utf8");
    const queueSrc = readFileSync(join(__dirname, "../../packages/download-queue/src/queue.ts"), "utf8");
    assert.match(src, /Select downloads/);
    assert.match(src, /queueSelectionTitle/);
    assert.match(src, /SelectionActionBand/);
    assert.match(src, /queue-selection-action-band/);
    assert.match(src, /keyExtractor=\{\(item\) => item\.id\}/);
    assert.match(src, /if \(selecting\) return;/);
    assert.match(src, /if \(selecting\) return null;/);
    assert.match(src, /revalidateQueueSelection/);
    assert.match(src, /removeQueueEntrySafely/);
    assert.match(src, /!selecting/);
    assert.match(src, /FloatingBackToTop/);
    assert.match(src, /scrollEnabled=\{hasOverflow\}/);
    assert.doesNotMatch(src, /cameraMutate|format SD|del\?/i);
    assert.match(queueSrc, /cleanupPartial/);
    assert.match(queueSrc, /status !== "completed"/);
  });
});
