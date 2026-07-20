import assert from "node:assert/strict";
import test from "node:test";

import type { QueueItem } from "../../packages/local-db/src/index";
import {
  actionsForStatus,
  createQueueActionGate,
  filterVisibleQueueItems,
  formatQueueSummary,
  isExpandedCard,
  QUEUE_LIST_BOTTOM_PADDING,
  queueActionHitHeight,
  queueDisplayPosition,
  queueThumbSize,
  resolveQueueThumbnailUri,
  showsProgress,
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

test("exactly one expanded Downloading card when one download is active", () => {
  const visible = sortQueueForDisplay(
    filterVisibleQueueItems([
      item("a", "active"),
      item("b", "queued"),
      item("c", "paused"),
      item("n", "queued", "x.NMEA"),
      item("done", "completed"),
    ]),
  );
  assert.equal(visible.filter((i) => isExpandedCard(i.status)).length, 1);
  assert.equal(visible[0]?.status, "active");
  assert.ok(showsProgress("paused"));
  assert.ok(!isExpandedCard("paused"));
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

test("thumb sizes differ by density", () => {
  assert.deepEqual(queueThumbSize("active"), { width: 64, height: 52 });
  assert.deepEqual(queueThumbSize("paused"), { width: 58, height: 46 });
  assert.deepEqual(queueThumbSize("queued"), { width: 58, height: 46 });
});

test("resolveQueueThumbnailUri prefers local library URI", () => {
  const uri = resolveQueueThumbnailUri({
    localName: "FILE.MP4",
    downloadDir: "/downloads",
    localFiles: [{ name: "FILE.MP4", uri: "file:///docs/FILE.MP4" }],
  });
  assert.equal(uri, "file:///docs/FILE.MP4");
});

test("resolveQueueThumbnailUri falls back to download path", () => {
  const uri = resolveQueueThumbnailUri({
    localName: "FILE.MP4",
    downloadDir: "/downloads",
    localFiles: [],
  });
  assert.equal(uri, "/downloads/FILE.MP4");
});

test("maximum one Downloading transfer in visible list", () => {
  const visible = sortQueueForDisplay([
    item("a", "active"),
    item("b", "queued"),
    item("c", "paused"),
  ]);
  assert.equal(visible.filter((i) => i.status === "active").length, 1);
});

test("queued does not show empty progress helpers", () => {
  assert.equal(showsProgress("queued"), false);
  assert.equal(isExpandedCard("queued"), false);
});

test("action hit target stays at least 44pt tall", () => {
  assert.ok(queueActionHitHeight() >= 44);
});

test("list bottom padding clears tab bar", () => {
  assert.ok(QUEUE_LIST_BOTTOM_PADDING >= 80);
});

test("action gate invokes handler only once while busy", async () => {
  const gate = createQueueActionGate();
  let calls = 0;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = gate(async () => {
    calls += 1;
    await blocked;
    return "ok";
  });
  const second = await gate(async () => {
    calls += 1;
    return "nope";
  });
  assert.equal(second, undefined);
  release();
  assert.equal(await first, "ok");
  assert.equal(calls, 1);
});

test("long filename still maps to a single Remove action when queued", () => {
  const long = `${"FILE".repeat(40)}260717-130620F.MP4`;
  const row = item("long", "queued", long);
  assert.deepEqual(actionsForStatus(row.status), ["remove"]);
  assert.ok(row.localName.length > 80);
});
