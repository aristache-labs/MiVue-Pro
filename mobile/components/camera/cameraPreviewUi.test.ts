import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Camera Library preview wiring", () => {
  const detail = readFileSync(join(__dirname, "RemoteDetailSheet.tsx"), "utf8");
  const library = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const context = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");
  const player = readFileSync(join(__dirname, "../../app/player.tsx"), "utf8");

  it("adds View photo / Preview video without replacing Download", () => {
    assert.match(detail, /"View photo" : "Preview video"/);
    assert.match(detail, /loadingLabel="Preparing preview…"/);
    assert.match(detail, /label=\{primary\}/);
    assert.match(detail, /variant=\{showRemotePreview \? "outline" : "filled"\}/);
  });

  it("resolves preview before routing and exposes a clear failure", () => {
    assert.match(library, /await resolveCameraPreview\(file\)/);
    assert.match(library, /Alert\.alert\("Preview unavailable", result\.error\)/);
    assert.match(library, /source=camera/);
    assert.match(library, /previewAvailability=\{detailPreviewAvailability\}/);
  });

  it("HEAD-verifies video and revalidates session before returning its URL", () => {
    assert.match(context, /await client\.headFile\(file\.path\)/);
    assert.match(context, /isCameraSessionCurrent\(requestGen, cameraSessionGenRef\.current\)/);
    assert.match(context, /cameraHostRef\.current\.trim\(\) !== hostAtStart/);
    assert.match(context, /queue\.list\(\)\.some\(\(item\) => item\.status === "active"\)/);
    assert.match(context, /fetchCameraPreviewCapability\(client\)/);
    assert.match(context, /client\.getProperty\(CAMERA_PLAYBACK_PREVIEW_PROPERTY\)/);
  });

  it("keeps remote previews read-only and avoids local-only player actions", () => {
    assert.match(player, /const fromCamera = params\.source === "camera"/);
    assert.match(player, /setCameraPreviewActive\(true\)/);
    assert.match(player, /gpsEnabled=\{!fromCamera\}/);
    assert.match(player, /fromCamera \? \(\s*<View style=\{styles\.headerActionSpacer\}/);
    assert.match(context, /if \(cameraPreviewActiveRef\.current\) return/);
    assert.doesNotMatch(context, /resolveCameraPreview[\s\S]{0,3000}(?:action=set|action=del|deleteRemoteFile)/);
  });
});
