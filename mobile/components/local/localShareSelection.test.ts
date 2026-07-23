import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  filterShareEligibleLocalFiles,
  isShareEligibleLocalFile,
  localShareActionLabel,
  MULTI_SHARE_UNSUPPORTED_MESSAGE,
  supportsNativeMultiFileShare,
} from "./localShareSelection";

describe("localShareSelection", () => {
  it("accepts complete local files and rejects camera / partial URIs", () => {
    assert.equal(
      isShareEligibleLocalFile({
        name: "A.MP4",
        uri: "file:///data/A.MP4",
        sizeBytes: 12,
        kind: "video",
      }),
      true,
    );
    assert.equal(
      isShareEligibleLocalFile({
        name: "A.MP4",
        uri: "https://192.168.1.1/A.MP4",
        sizeBytes: 12,
        kind: "video",
      }),
      false,
    );
    assert.equal(
      isShareEligibleLocalFile({
        name: "A.MP4.part",
        uri: "file:///data/A.MP4.part",
        sizeBytes: 12,
        kind: "video",
      }),
      false,
    );
    assert.equal(
      isShareEligibleLocalFile({
        name: "A.MP4",
        uri: "file:///data/A.MP4",
        sizeBytes: 0,
        kind: "video",
      }),
      false,
    );
  });

  it("reports multi-file share unsupported for current expo-sharing binary", () => {
    assert.equal(supportsNativeMultiFileShare(), false);
    assert.match(MULTI_SHARE_UNSUPPORTED_MESSAGE, /newer app build/i);
    assert.equal(localShareActionLabel(2), "Share · 2");
    assert.equal(
      filterShareEligibleLocalFiles([
        { name: "A.MP4", uri: "file:///A.MP4", sizeBytes: 1, kind: "video" },
        { name: "B.MP4.part", uri: "file:///B.MP4.part", sizeBytes: 1, kind: "video" },
      ]).length,
      1,
    );
  });

  it("Local screen wires Share beside Delete under Filters/Sort", () => {
    const local = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
    const ctx = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");
    assert.match(local, /localShareActionLabel/);
    assert.match(local, /localDeleteSelectionLabel/);
    assert.match(local, /shareLocalFiles/);
    assert.match(local, /MULTI_SHARE_UNSUPPORTED_MESSAGE/);
    assert.match(local, /SelectionActionBand/);
    assert.match(local, /local-selection-action-band/);
    assert.doesNotMatch(local, /position:\s*"absolute"[\s\S]{0,120}selection/);
    assert.doesNotMatch(local, /bottom:\s*tabBarHeight/);
    assert.match(ctx, /shareLocalFiles/);
    assert.match(ctx, /unsupportedMulti/);
    assert.match(ctx, /supportsNativeMultiFileShare/);
  });
});
