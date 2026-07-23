import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("queueSelection helpers", () => {
  it("exports safe-remove utilities", () => {
    const src = readFileSync(join(__dirname, "./queueSelection.ts"), "utf8");
    assert.match(src, /waitForQueueStatus/);
    assert.match(src, /removeQueueEntrySafely/);
    assert.doesNotMatch(src, /queueSelectionTitle/);
    assert.doesNotMatch(src, /classifyQueueSelection/);
  });

  it("Queue screen has no multi-selection mode", () => {
    const src = readFileSync(join(__dirname, "../../app/(tabs)/two.tsx"), "utf8");
    const queueSrc = readFileSync(join(__dirname, "../../packages/download-queue/src/queue.ts"), "utf8");

    assert.doesNotMatch(src, /Select downloads/);
    assert.doesNotMatch(src, /SelectionActionBand/);
    assert.doesNotMatch(src, /queue-selection-action-band/);
    assert.doesNotMatch(src, /queueSelectionTitle/);
    assert.doesNotMatch(src, /setSelecting/);
    assert.doesNotMatch(src, /toggleSelect/);
    assert.doesNotMatch(src, /selectAll/);
    assert.doesNotMatch(src, /deselectAll/);
    assert.doesNotMatch(src, /exitSelection/);
    assert.doesNotMatch(src, /revalidateQueueSelection/);
    assert.doesNotMatch(src, /if \(selecting\)/);
    assert.doesNotMatch(src, /selected\.has/);

    assert.match(src, /title="Download queue"/);
    assert.match(src, /width: 44/);
    assert.match(src, /keyExtractor=\{\(item\) => item\.id\}/);
    assert.match(src, /FloatingBackToTop/);
    assert.match(src, /scrollEnabled=\{hasOverflow\}/);
    assert.match(src, /No downloads in queue/);
    assert.match(src, /Files added from Library will appear here/);
    assert.match(src, /backToTopEnabled = visibleItems\.length > 0 && !actionBusy/);
    assert.match(src, /runAction/);
    assert.match(src, /renderActions/);
    assert.match(src, /Pause download/);
    assert.match(src, /Resume download/);
    assert.match(src, /Cancel download/);
    assert.match(src, /Retry download/);
    assert.match(src, /Remove .* from queue/);
    assert.doesNotMatch(src, /cameraMutate|format SD|del\?/i);
    assert.match(queueSrc, /cleanupPartial/);
    assert.match(queueSrc, /status !== "completed"/);
  });
});
