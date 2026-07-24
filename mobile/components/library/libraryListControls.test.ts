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

  it("Camera and Local both use LibraryListControls", () => {
    assert.match(library, /LibraryListControls/);
    assert.match(local, /LibraryListControls/);
    assert.doesNotMatch(local, /LocalLibraryUtilityBar/);
    assert.match(controls, /Filters/);
    assert.match(controls, /sortLabel/);
    assert.match(controls, /LIBRARY_LIST_CONTROLS_HEIGHT = 48/);
    assert.match(controls, /styles\.half/);
    assert.match(controls, /flex:\s*1/);
    const filtersIdx = controls.indexOf('accessibilityLabel="Filters"');
    const sortIdx = controls.indexOf("sortA11yLabel");
    assert.ok(filtersIdx > 0 && sortIdx > 0);
  });

  it("Local header has no Select; Filter/Sort live in LibraryListControls", () => {
    assert.match(local, /Refresh local library/);
    assert.doesNotMatch(local, /accessibilityLabel="Select files"/);
    assert.doesNotMatch(local, /headerRightRow[\s\S]*setFilterOpen\(true\)/);
    assert.match(local, /sortLabel=\{localSortBarLabel\(sort\)\}/);
    assert.match(local, /disabled=\{selecting\}/);
  });

  it("Library keeps camera connection and wires existing filter/sort handlers", () => {
    assert.match(library, /CameraConnectionHeaderButton/);
    assert.match(library, /onPressFilters=\{\(\) => setFilterOpen\(true\)\}/);
    assert.match(library, /onPressSort=\{\(\) => setSortOpen\(true\)\}/);
    assert.match(library, /activeFilterCount=\{activeGroups\}/);
    assert.match(library, /sortActive=\{sort !== "newest"\}/);
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
