import assert from "node:assert/strict";
import test from "node:test";

import type { QueueItem } from "../../packages/local-db/src/index";
import {
  actionsForStatus,
  filterVisibleQueueItems,
  formatQueueSummary,
  isExpandedCard,
  queueDisplayPosition,
  sortQueueForDisplay,
} from "./queuePresentation";

function item(
  id: string,
  status: QueueItem["status"],
  localName = `${id}.MP4`,
): QueueItem {
  return {
    id,
    remotePath: `/SD/Normal/F/${localName}`,
    localName,
    expectedBytes: 100,
    status,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  };
}

test("exactly one expanded card when one download is active", () => {
  const visible = sortQueueForDisplay(
    filterVisibleQueueItems([
      item("a", "active"),
      item("b", "queued"),
      item("c", "queued"),
      item("n", "queued", "x.NMEA"),
      item("done", "completed"),
    ]),
  );
  assert.equal(visible.filter((i) => isExpandedCard(i.status)).length, 1);
  assert.equal(visible[0]?.status, "active");
  assert.ok(visible.every((i) => !/\.nmea$/i.test(i.localName)));
  assert.ok(visible.every((i) => i.status !== "completed"));
});

test("queued items do not expose Pause", () => {
  assert.deepEqual(actionsForStatus("queued"), ["remove"]);
  assert.ok(!actionsForStatus("queued").includes("pause"));
});

test("paused exposes Resume and Cancel", () => {
  assert.deepEqual(actionsForStatus("paused"), ["resume", "cancel"]);
});

test("failed exposes Retry and Remove", () => {
  assert.deepEqual(actionsForStatus("failed"), ["retry", "remove"]);
});

test("queue positions are consecutive for active + waiting", () => {
  const ordered = sortQueueForDisplay([
    item("a", "active"),
    item("b", "queued"),
    item("c", "queued"),
    item("d", "failed"),
  ]);
  assert.equal(queueDisplayPosition(ordered, "a"), 1);
  assert.equal(queueDisplayPosition(ordered, "b"), 2);
  assert.equal(queueDisplayPosition(ordered, "c"), 3);
  assert.equal(queueDisplayPosition(ordered, "d"), undefined);
});

test("summary uses singular and plural forms", () => {
  assert.equal(formatQueueSummary([]), "Queue is empty");
  assert.equal(formatQueueSummary([item("a", "active"), item("b", "queued"), item("c", "queued")]), "1 downloading · 2 waiting");
  assert.equal(formatQueueSummary([item("a", "paused"), item("b", "queued")]), "1 paused · 1 waiting");
  assert.equal(formatQueueSummary([item("a", "queued"), item("b", "queued"), item("c", "queued"), item("d", "queued")]), "4 waiting");
});

test("active exposes Pause and Cancel only", () => {
  assert.deepEqual(actionsForStatus("active"), ["pause", "cancel"]);
});
