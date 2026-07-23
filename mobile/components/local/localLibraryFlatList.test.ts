import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Local Library FlatList sticky overlay wiring", () => {
  const src = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");

  it("uses FlatList listRows without SectionList or native sticky headers", () => {
    assert.match(src, /buildLocalLibraryFileRows/);
    assert.match(src, /const listRows = useMemo/);
    assert.match(src, /data=\{listRows\}/);
    assert.match(src, /<FlatList/);
    assert.doesNotMatch(src, /SectionList/);
    assert.doesNotMatch(src, /stickySectionHeadersEnabled/);
    assert.doesNotMatch(src, /renderSectionHeader/);
  });

  it("wires sticky overlay from local viewability and keeps last key on blank viewables", () => {
    assert.match(src, /stickySectionKeyFromLocalViewableItems/);
    assert.match(src, /styles\.stickyOverlay/);
    assert.match(src, /stickySection\.title/);
    assert.match(src, /if \(!nextKey\) return;/);
    assert.match(src, /viewabilityConfig=\{viewabilityConfig\}/);
    assert.match(src, /onViewableItemsChanged=\{onViewableItemsChanged\}/);
  });

  it("uses Camera-matching virtualization knobs and constrained row width", () => {
    assert.match(src, /LIBRARY_LIST_VIRTUALIZATION/);
    assert.match(src, /removeClippedSubviews=\{false\}/);
    assert.match(src, /style=\{styles\.localFileRow\}/);
    assert.match(src, /startsNewSection/);
    assert.match(src, /renderSectionBreak/);
    const rowStart = src.indexOf("localFileRow:");
    const titleStart = src.indexOf("sectionTitle:", rowStart);
    assert.ok(rowStart >= 0 && titleStart > rowStart);
    const rowStyle = src.slice(rowStart, titleStart);
    assert.match(rowStyle, /width:\s*"100%"/);
    assert.match(rowStyle, /minWidth:\s*0/);
    assert.doesNotMatch(rowStyle, /paddingHorizontal/);
  });

  it("selection extraData includes selected set identity, not only size", () => {
    assert.match(src, /localListExtraData/);
    assert.match(src, /extraData=\{localListExtraData\}/);
    assert.match(src, /selecting,\s*selected/);
    assert.doesNotMatch(src, /selectedSize:\s*selected\.size/);
    assert.doesNotMatch(src, /extraData=\{[\s\S]*stickySectionKey/);
  });

  it("flexGrow only for empty list and keeps pull-to-refresh", () => {
    assert.match(src, /\.\.\.\(listRows\.length === 0 \? \{ flexGrow: 1 \} : null\)/);
    assert.match(src, /RefreshControl/);
    assert.match(src, /onRefresh=\{\(\) => void runRefresh\(\)\}/);
    assert.match(src, /LocalLibraryCard/);
  });
});
