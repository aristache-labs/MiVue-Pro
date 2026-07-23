import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("DemoModeContext remote library clear", () => {
  const src = readFileSync(join(__dirname, "DemoModeContext.tsx"), "utf8");
  const library = readFileSync(join(__dirname, "../app/(tabs)/index.tsx"), "utf8");

  it("centralizes clearRemoteCameraLibrary and bumps session generation", () => {
    assert.match(src, /clearRemoteCameraLibrary/);
    assert.match(src, /cameraSessionGenRef/);
    assert.match(src, /bumpCameraSessionGeneration/);
    assert.match(src, /isCameraSessionCurrent/);
    assert.match(src, /setFiles\(\[\]\)/);
  });

  it("clears remote files on refresh failure, invalid IP, host change, background, queue drop, disconnect", () => {
    assert.match(src, /clearRemoteCameraLibrary\("disconnected"/);
    assert.match(src, /clearRemoteCameraLibrary\("connection_lost"/);
    assert.match(src, /clearRemoteCameraLibrary\("disconnected", error\)/);
    assert.match(src, /clearRemoteCameraLibrary\("disconnected", message\)/);
    assert.match(src, /setCameraHost[\s\S]*clearRemoteCameraLibrary\("disconnected"\)/);
    assert.match(src, /AppState\.addEventListener[\s\S]*clearRemoteCameraLibrary\("disconnected"\)/);
    assert.match(src, /disconnectSession = useCallback\(\(\) => \{\s*clearRemoteCameraLibrary\("disconnected"\)/);
    // Queue connection drop clears remote files without wiping the download queue
    assert.match(src, /isConnectionDropError[\s\S]*setFiles\(\[\]\)/);
  });

  it("rejects stale async list responses before setFiles", () => {
    assert.match(
      src,
      /if \(!isCameraSessionCurrent\(requestGen, cameraSessionGenRef\.current\)\)/,
    );
    assert.match(src, /Camera session changed/);
  });

  it("does not clear localFiles or queue on remote clear", () => {
    const clearBody = src.slice(
      src.indexOf("const clearRemoteCameraLibrary"),
      src.indexOf("const downloadDir"),
    );
    assert.doesNotMatch(clearBody, /setLocalFiles|setQueueItems|deleteAsync|queue\.cancel/);
    assert.doesNotMatch(src, /method:\s*"DELETE"|cgi.*del/i);
  });

  it("Library shows placeholders and disables chrome without camera", () => {
    assert.match(library, /libraryEmptyPresentation/);
    assert.match(library, /Camera not connected|libraryEmptyPresentation/);
    assert.match(library, /isCameraLibraryInteractive\(cameraLinkState\)/);
    assert.doesNotMatch(library, /CameraUnavailableBanner/);
    assert.match(library, /setFilters\(EMPTY_CAMERA_FILTERS\)/);
    assert.match(library, /setDetailFile\(null\)/);
    assert.match(library, /actionLabel=\{emptyPresentation\.actionLabel\}/);
  });
});
