import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Library SectionList sticky stability", () => {
  const src = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");

  it("passes memoized sections without inline clone map", () => {
    assert.match(src, /const sections = useMemo\(\(\) => buildCameraLibrarySections/);
    assert.match(src, /sections=\{sections\}/);
    assert.doesNotMatch(src, /sections=\{sections\.map\(/);
    assert.doesNotMatch(src, /data:\s*\[\.\.\.s\.data\]/);
  });

  it("keeps sticky headers with removeClippedSubviews off and collapsable false", () => {
    assert.match(src, /stickySectionHeadersEnabled=\{LOCAL_LIBRARY_STICKY_HEADERS\}/);
    assert.match(src, /removeClippedSubviews=\{false\}/);
    assert.match(src, /collapsable=\{false\}/);
    assert.match(src, /keyExtractor=\{\(item\) => item\.path\}/);
  });

  it("section header uses opaque background, center align, and elevation", () => {
    const headerStart = src.indexOf("sectionHeader:");
    const headerEnd = src.indexOf("sectionTitle:", headerStart);
    assert.ok(headerStart >= 0 && headerEnd > headerStart);
    const headerStyle = src.slice(headerStart, headerEnd);
    assert.match(src, /backgroundColor:\s*colors\.bg/);
    assert.match(headerStyle, /alignItems:\s*"center"/);
    assert.match(headerStyle, /zIndex:\s*10/);
    assert.match(headerStyle, /elevation:\s*10/);
    assert.doesNotMatch(headerStyle, /alignItems:\s*"baseline"/);
    assert.doesNotMatch(headerStyle, /position:\s*"absolute"/);
    assert.doesNotMatch(headerStyle, /opacity:/);
    assert.match(src, /collapsable=\{false\}/);
  });

  it("stabilizes queued membership so progress ticks do not rebuild sections", () => {
    assert.match(src, /stableQueuedNames/);
    assert.match(src, /queuedNamesKey/);
    assert.match(src, /queuedNames:\s*stableQueuedNames/);
  });

  it("does not remount SectionList via connection or count keys", () => {
    assert.doesNotMatch(src, /<SectionList[^>]*\bkey=\{/);
    assert.doesNotMatch(src, /key=\{`library-/);
  });
});
