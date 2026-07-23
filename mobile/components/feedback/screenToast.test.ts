import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("ScreenToast + camera settings toast placement", () => {
  const toastSrc = readFileSync(join(__dirname, "ScreenToast.tsx"), "utf8");
  const cameraSrc = readFileSync(join(__dirname, "../../app/settings/camera.tsx"), "utf8");
  const sheetSrc = readFileSync(
    join(__dirname, "../settings/CameraSettingSheet.tsx"),
    "utf8",
  );
  const shellSrc = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");

  it("ScreenToast is full-width bottom snackbar with safe-area padding", () => {
    assert.match(toastSrc, /position:\s*"absolute"/);
    assert.match(toastSrc, /left:\s*0/);
    assert.match(toastSrc, /right:\s*0/);
    assert.match(toastSrc, /bottom:\s*0/);
    assert.match(toastSrc, /useSafeAreaInsets/);
    assert.match(toastSrc, /paddingBottom:\s*padBottom|Math\.max\(insets\.bottom/);
    assert.match(toastSrc, /width:\s*"100%"/);
    assert.match(toastSrc, /zIndex:\s*40/);
    assert.match(toastSrc, /pointerEvents="none"/);
    assert.doesNotMatch(toastSrc, /readonly top: number/);
    assert.doesNotMatch(toastSrc, /left:\s*Spacing\.xl/);
    assert.match(toastSrc, /checkmark-circle|alert-circle/);
    assert.match(toastSrc, /successSoft|dangerSoft/);
    assert.match(toastSrc, /announceForAccessibility/);
    assert.match(toastSrc, /accessibilityLiveRegion/);
    assert.match(toastSrc, /isReduceMotionEnabled/);
    assert.match(toastSrc, /translateY/);
    assert.match(toastSrc, /clearTimeout/);
  });

  it("Reduce Motion skips translate enter animation", () => {
    assert.match(toastSrc, /reduceMotionRef/);
    assert.match(toastSrc, /\.\.\.\(rm\s*\n\s*\? \[\]/);
    assert.match(toastSrc, /translateY\.setValue\(rm \? 0 : SLIDE_DISTANCE\)/);
    assert.doesNotMatch(toastSrc, /scale\.setValue/);
  });

  it("camera toast is sibling of SettingsScroll at screen bottom", () => {
    assert.match(cameraSrc, /ScreenToast/);
    assert.match(cameraSrc, /testID="camera-settings-toast"/);
    assert.doesNotMatch(cameraSrc, /toastTop|headerBottom|onHeaderLayout/);
    const scrollOpen = cameraSrc.indexOf("<SettingsScroll");
    const scrollClose = cameraSrc.indexOf("</SettingsScroll>");
    const toastIdx = cameraSrc.indexOf("<ScreenToast");
    assert.ok(scrollOpen >= 0 && scrollClose > scrollOpen);
    assert.ok(toastIdx > scrollClose, "toast must render after SettingsScroll");
    const scrollBody = cameraSrc.slice(scrollOpen, scrollClose);
    assert.doesNotMatch(scrollBody, /ScreenToast|toast\?\.message|camera-settings-toast/);
  });

  it("success toast waits for verified apply then sheet onClosed", () => {
    assert.match(cameraSrc, /pendingToastRef/);
    assert.match(cameraSrc, /cameraSettingSuccessMessage/);
    assert.match(cameraSrc, /result\.ok/);
    assert.match(cameraSrc, /setActiveSetting\(null\)/);
    assert.match(cameraSrc, /onClosed=\{flushPendingToastAfterSheet\}/);
    assert.match(sheetSrc, /onClosed=\{onClosed\}/);
    assert.match(shellSrc, /onClosedRef\.current\?\.\(\)/);
    assert.doesNotMatch(cameraSrc, /setTimeout\(\s*\(\)\s*=>\s*setToast/);
  });

  it("failed mutation uses Alert and does not queue success toast", () => {
    const applyFn = cameraSrc.slice(
      cameraSrc.indexOf("const requestApply"),
      cameraSrc.indexOf("const actionsBusy"),
    );
    assert.match(applyFn, /Couldn.t apply setting/);
    const okIdx = applyFn.indexOf("if (result.ok)");
    const failAlertIdx = applyFn.indexOf("Couldn");
    assert.ok(okIdx >= 0 && failAlertIdx > okIdx);
    const okBranch = applyFn.slice(okIdx, failAlertIdx);
    const failBranch = applyFn.slice(failAlertIdx);
    assert.match(okBranch, /pendingToastRef\.current = \{/);
    assert.match(okBranch, /tone:\s*"success"/);
    assert.doesNotMatch(failBranch, /pendingToastRef/);
  });

  it("blur/unmount clears toast and pending toast", () => {
    assert.match(cameraSrc, /useFocusEffect/);
    assert.match(cameraSrc, /pendingToastRef\.current = undefined/);
    assert.match(cameraSrc, /setToast\(undefined\)/);
  });

  it("Camera clock row is always shown and read-only", () => {
    assert.match(cameraSrc, /title="Camera clock"/);
    assert.match(cameraSrc, /cameraClockDisplay/);
    assert.doesNotMatch(cameraSrc, /clockValue \?/);
    assert.doesNotMatch(cameraSrc, /Sync now/);
  });
});
