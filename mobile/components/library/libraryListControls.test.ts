import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("LibraryListControls contracts", () => {
  const controls = readFileSync(join(__dirname, "LibraryListControls.tsx"), "utf8");
  const library = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");

  it("Library no longer renders search UI or search state", () => {
    assert.doesNotMatch(library, /TextInput/);
    assert.doesNotMatch(library, /searchInput/);
    assert.doesNotMatch(library, /setSearch\(/);
    assert.doesNotMatch(library, /Search name/);
    assert.doesNotMatch(library, /searchTimerRef/);
    assert.doesNotMatch(library, /Clear search/);
    assert.match(library, /search:\s*""/);
  });

  it("Camera and Local use header Filters + section Sort; no Filters/Newest bar", () => {
    assert.doesNotMatch(library, /LibraryListControls/);
    assert.doesNotMatch(local, /LibraryListControls/);
    assert.match(library, /library-header-filters/);
    assert.match(local, /local-header-filters/);
    assert.match(library, /LocalDateSectionHeader/);
    assert.match(local, /LocalDateSectionHeader/);
    assert.match(controls, /Filters/);
    assert.match(controls, /LIBRARY_LIST_CONTROLS_HEIGHT = 48/);
  });

  it("Local and Library headers expose Filters; no Select chrome", () => {
    assert.match(local, /Refresh local library/);
    assert.match(local, /accessibilityLabel="Filters"/);
    assert.match(library, /accessibilityLabel="Filters"/);
    assert.doesNotMatch(local, /accessibilityLabel="Select files"/);
    assert.doesNotMatch(library, /accessibilityLabel="Select recordings"/);
    assert.match(local, /setFilterOpen\(true\)/);
    assert.match(library, /setFilterOpen\(true\)/);
    assert.match(local, /setSortOpen\(true\)/);
    assert.match(library, /setSortOpen\(true\)/);
  });

  it("Library keeps camera connection button", () => {
    assert.match(library, /CameraConnectionHeaderButton/);
  });

  it("preserves FlatList sticky overlay, refresh, and Back to top", () => {
    assert.match(library, /stickySectionKeyFromViewableItems/);
    assert.match(library, /RefreshControl/);
    assert.match(library, /FloatingBackToTop/);
    assert.match(local, /stickySectionKeyFromLocalViewableItems/);
    assert.match(local, /RefreshControl/);
    assert.match(local, /FloatingBackToTop/);
  });
});
