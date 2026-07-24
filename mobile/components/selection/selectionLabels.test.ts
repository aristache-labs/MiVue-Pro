import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  libraryDownloadCtaA11yLabel,
  libraryDownloadCtaLabel,
  localDeleteCtaA11yLabel,
  localDeleteCtaLabel,
  SELECTION_TAB_ANIM_MS,
  SELECTION_TOOLBAR_ANIM_MS,
  sumKnownSelectedBytes,
} from "./selectionLabels";

describe("selectionLabels", () => {
  it("formats Local Delete CTA with count (not top toolbar)", () => {
    assert.equal(localDeleteCtaLabel(0), "Delete · 0 selected");
    assert.equal(localDeleteCtaLabel(1), "Delete · 1 selected");
    assert.equal(localDeleteCtaLabel(3), "Delete · 3 selected");
    assert.equal(localDeleteCtaLabel(2, true), "Deleting…");
    assert.match(localDeleteCtaA11yLabel(3), /Delete 3 selected items/);
  });

  it("formats Library Download CTA with count and optional size", () => {
    assert.equal(libraryDownloadCtaLabel(0), "Download · 0 selected");
    assert.equal(
      libraryDownloadCtaLabel(3, "1.09 GB"),
      "Download · 3 selected · 1.09 GB",
    );
    assert.equal(libraryDownloadCtaLabel(1, "371.2 MB"), "Download · 1 selected · 371.2 MB");
    assert.equal(libraryDownloadCtaLabel(2, null), "Download · 2 selected");
    assert.equal(libraryDownloadCtaLabel(2, "—"), "Download · 2 selected");
    assert.equal(libraryDownloadCtaLabel(1, "100 MB", true), "Adding to queue…");
    assert.match(libraryDownloadCtaA11yLabel(3, "1.09 GB"), /1\.09 GB/);
  });

  it("sumKnownSelectedBytes refuses unknown sizes", () => {
    assert.equal(sumKnownSelectedBytes([]), 0);
    assert.equal(sumKnownSelectedBytes([{ sizeBytes: 10 }, { sizeBytes: 20 }]), 30);
    assert.equal(sumKnownSelectedBytes([{ sizeBytes: 10 }, { sizeBytes: 0 }]), null);
    assert.equal(sumKnownSelectedBytes([{ sizeBytes: NaN }]), null);
  });

  it("animation durations stay in the premium window", () => {
    assert.ok(SELECTION_TOOLBAR_ANIM_MS >= 180 && SELECTION_TOOLBAR_ANIM_MS <= 220);
    assert.ok(SELECTION_TAB_ANIM_MS >= 200 && SELECTION_TAB_ANIM_MS <= 250);
  });
});

describe("selection chrome ownership (no auto-hide)", () => {
  const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const tabBar = readFileSync(join(__dirname, "../navigation/LaneoryTabBar.tsx"), "utf8");
  const ctx = readFileSync(join(__dirname, "../../context/SelectionTabChromeContext.tsx"), "utf8");

  it("inactive screens do not setChrome(null) on !selecting", () => {
    assert.match(local, /if \(!selecting\) return;/);
    assert.match(index, /if \(!selecting\) return;/);
    assert.doesNotMatch(local, /if \(!selecting\) \{\s*setChrome\(null\)/);
    assert.doesNotMatch(index, /if \(!selecting\) \{\s*setChrome\(null\)/);
    assert.match(local, /clearChromeIf\("local-delete"\)/);
    assert.match(index, /clearChromeIf\("library-download"\)/);
    assert.match(ctx, /prev\?\.kind === kind \? null : prev/);
  });

  it("tab bar animates only on selectionModeActive, not chrome identity", () => {
    assert.match(tabBar, /selectionModeActive/);
    assert.match(tabBar, /\[selectionModeActive, progress, reduceMotion\]/);
    assert.doesNotMatch(tabBar, /deps: \[chrome/);
    assert.match(tabBar, /Content updates without restarting/);
    assert.doesNotMatch(tabBar, /setTimeout|setInterval/);
  });

  it("Local and Library share SelectionToolbar + ContextualTabAction", () => {
    assert.match(local, /SelectionToolbar/);
    assert.match(index, /SelectionToolbar/);
    assert.match(tabBar, /ContextualTabAction/);
    assert.match(tabBar, /colors\.danger|tone=\{displayChrome\.kind === "local-delete"/);
  });
});
