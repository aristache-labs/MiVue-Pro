import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { localDeleteSelectionLabel } from "./localShareSelection";

describe("localShareSelection", () => {
  it("formats delete selection label with count", () => {
    assert.equal(localDeleteSelectionLabel(0), "Delete local");
    assert.equal(localDeleteSelectionLabel(3), "Delete local · 3");
  });

  it("Local selection uses tab Delete chrome; cards keep single-file share", () => {
    const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
    const ctx = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");
    assert.match(local, /kind:\s*"local-delete"/);
    assert.match(local, /setChrome/);
    assert.doesNotMatch(local, /SelectionActionBand|local-selection-action-band|local-dock-share/);
    assert.match(local, /shareLocalFile/);
    assert.match(local, /onShare=\{\(f\) => void actionGateRef\.current\(async \(\) => shareLocalFile\(f\)\)\}/);
    assert.doesNotMatch(local, /localShareActionLabel/);
    assert.doesNotMatch(local, /shareLocalFiles/);
    assert.doesNotMatch(local, /MULTI_SHARE_UNSUPPORTED_MESSAGE/);
    assert.match(ctx, /shareLocalFile/);
    assert.doesNotMatch(ctx, /shareLocalFiles/);
    assert.doesNotMatch(ctx, /supportsNativeMultiFileShare/);
  });
});
