import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Library list sticky stability", () => {
  const src = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");

  it("uses FlatList file rows from memoized sections without SectionList sticky", () => {
    assert.match(src, /const sections = useMemo\(\(\) => buildCameraLibrarySections/);
    assert.match(src, /const listRows = useMemo\(\(\) => buildCameraLibraryFileRows\(sections\)/);
    assert.match(src, /data=\{listRows\}/);
    assert.match(src, /<FlatList/);
    assert.doesNotMatch(src, /<SectionList/);
    assert.doesNotMatch(src, /stickySectionHeadersEnabled/);
    assert.doesNotMatch(src, /sections=\{sections\.map\(/);
  });

  it("keeps removeClippedSubviews off and stable path keys", () => {
    assert.match(src, /removeClippedSubviews=\{false\}/);
    assert.match(src, /keyExtractor=\{\(item\) => item\.key\}/);
  });

  it("uses deterministic sticky overlay from viewability", () => {
    assert.match(src, /stickySectionKeyFromViewableItems/);
    assert.match(src, /styles\.stickyOverlay/);
    assert.match(src, /stickySection\.title/);
    assert.match(src, /collapsable=\{false\}/);
    const headerStart = src.indexOf("sectionHeader:");
    const headerEnd = src.indexOf("sectionTitle:", headerStart);
    assert.ok(headerStart >= 0 && headerEnd > headerStart);
    const headerStyle = src.slice(headerStart, headerEnd);
    assert.match(headerStyle, /alignItems:\s*"center"/);
    assert.match(headerStyle, /zIndex:\s*10/);
    assert.doesNotMatch(headerStyle, /alignItems:\s*"baseline"/);
    assert.doesNotMatch(headerStyle, /position:\s*"absolute"/);
  });

  it("stabilizes queued membership so progress ticks do not rebuild sections", () => {
    assert.match(src, /stableQueuedNames/);
    assert.match(src, /queuedNamesKey/);
    assert.match(src, /queuedNames:\s*stableQueuedNames/);
  });

  it("does not remount list via connection or count keys", () => {
    assert.doesNotMatch(src, /<FlatList[^>]*\bkey=\{/);
    assert.doesNotMatch(src, /key=\{`library-/);
  });
});
