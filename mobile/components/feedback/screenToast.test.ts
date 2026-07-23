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
  const headerSrc = readFileSync(
    join(__dirname, "../settings/SettingsChromeHeader.tsx"),
    "utf8",
  );

  it("ScreenToast is absolute screen-level overlay with top offset (not bottom)", () => {
    assert.match(toastSrc, /position:\s*"absolute"/);
    assert.match(toastSrc, /left:\s*Spacing\.xl/);
    assert.match(toastSrc, /right:\s*Spacing\.xl/);
    assert.match(toastSrc, /zIndex:\s*40/);
    assert.match(toastSrc, /pointerEvents="box-none"/);
    assert.match(toastSrc, /pointerEvents="none"/);
    assert.match(toastSrc, /readonly top: number/);
    assert.doesNotMatch(toastSrc, /bottom:\s*\d+/);
    assert.match(toastSrc, /checkmark-circle|alert-circle/);
    assert.match(toastSrc, /successSoft|dangerSoft/);
    assert.match(toastSrc, /announceForAccessibility/);
    assert.match(toastSrc, /accessibilityLiveRegion/);
    assert.match(toastSrc, /accessibilityRole="summary"/);
    assert.match(toastSrc, /isReduceMotionEnabled/);
    assert.match(toastSrc, /translateY/);
    assert.match(toastSrc, /scale/);
    assert.match(toastSrc, /clearTimeout/);
  });

  it("Reduce Motion skips translate/scale enter animation", () => {
    assert.match(toastSrc, /reduceMotionRef/);
    assert.match(toastSrc, /\.\.\.\(rm\s*\n\s*\? \[\]/);
    assert.match(toastSrc, /translateY\.setValue\(rm \? 0 : -8\)/);
    assert.match(toastSrc, /scale\.setValue\(rm \? 1 : 0\.98\)/);
  });

  it("camera toast is sibling of SettingsScroll under measured header", () => {
    assert.match(cameraSrc, /ScreenToast/);
    assert.match(cameraSrc, /testID="camera-settings-toast"/);
    assert.match(cameraSrc, /onHeaderLayout/);
    assert.match(cameraSrc, /headerBottom/);
    assert.match(cameraSrc, /toastTop = headerBottom \+ 12/);
    assert.match(cameraSrc, /SETTINGS_CHROME_HEADER_BAR_H/);
    assert.match(cameraSrc, /onLayout=\{onHeaderLayout\}/);
    assert.match(headerSrc, /onLayout\?:/);
    assert.match(headerSrc, /SETTINGS_CHROME_HEADER_BAR_H = 44/);

    const scrollOpen = cameraSrc.indexOf("<SettingsScroll");
    const scrollClose = cameraSrc.indexOf("</SettingsScroll>");
    const toastIdx = cameraSrc.indexOf("<ScreenToast");
    assert.ok(scrollOpen >= 0 && scrollClose > scrollOpen);
    assert.ok(toastIdx > scrollClose, "toast must render after SettingsScroll");
    const scrollBody = cameraSrc.slice(scrollOpen, scrollClose);
    assert.doesNotMatch(scrollBody, /ScreenToast|toast\?\.message|camera-settings-toast/);
    assert.doesNotMatch(cameraSrc, /bottom:\s*24|styles\.toast/);
  });

  it("success toast waits for verified apply then sheet onClosed", () => {
    assert.match(cameraSrc, /pendingToastRef/);
    assert.match(cameraSrc, /cameraSettingSuccessMessage/);
    assert.match(cameraSrc, /result\.ok/);
    assert.match(cameraSrc, /setActiveSetting\(null\)/);
    assert.match(cameraSrc, /onClosed=\{flushPendingToastAfterSheet\}/);
    assert.match(cameraSrc, /flushPendingToastAfterSheet/);
    assert.match(sheetSrc, /onClosed\?:/);
    assert.match(sheetSrc, /onClosed=\{onClosed\}/);
    assert.match(shellSrc, /onClosed\?:/);
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
    assert.doesNotMatch(failBranch, /tone:\s*"success"/);
  });

  it("blur/unmount clears toast and pending toast", () => {
    assert.match(cameraSrc, /useFocusEffect/);
    assert.match(cameraSrc, /pendingToastRef\.current = undefined/);
    assert.match(cameraSrc, /setToast\(undefined\)/);
  });

  it("does not change SettingsScroll overflow or bottom positioning of toast", () => {
    assert.match(cameraSrc, /overScrollMode="never"/);
    assert.match(cameraSrc, /bounces=\{false\}/);
    assert.doesNotMatch(cameraSrc, /bottom:\s*(24|insets)/);
  });
});
