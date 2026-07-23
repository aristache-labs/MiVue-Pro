import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  cameraClockDisplay,
  cameraSettingOptions,
  displayCameraSettingValue,
  rawCameraSettingValue,
} from "./cameraSettingsUi";
import {
  CAMERA_SETTING_PROPERTY,
  cameraSettingConfirmMessage,
} from "../../packages/protocol/src/cameraSettings";

describe("camera settings UI contracts", () => {
  const cameraSrc = readFileSync(join(__dirname, "../../app/settings/camera.tsx"), "utf8");
  const ctxSrc = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");
  const sheetSrc = readFileSync(join(__dirname, "CameraSettingSheet.tsx"), "utf8");
  const indexSrc = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  const queueSrc = readFileSync(join(__dirname, "../../app/(tabs)/two.tsx"), "utf8");
  const localSrc = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");

  it("renders all five setting rows and disconnected placeholder", () => {
    assert.match(cameraSrc, /Camera settings/);
    assert.match(cameraSrc, /CAMERA_SETTINGS_KEYS\.map/);
    assert.match(cameraSrc, /Camera settings unavailable/);
    assert.match(cameraSrc, /Connect to the camera to view and change its settings/);
    assert.match(cameraSrc, /Frequency|CAMERA_SETTING_TITLE/);
    assert.match(cameraSrc, /CameraSettingSheet/);
    assert.match(cameraSrc, /Change camera setting\?/);
    assert.match(cameraSrc, /Keep current/);
    assert.match(cameraSrc, /Apply change/);
  });

  it("requires confirmation and disables Demo Apply", () => {
    assert.match(cameraSrc, /cameraSettingConfirmMessage/);
    assert.match(cameraSrc, /Camera settings are unavailable in Demo Mode/);
    assert.match(sheetSrc, /Apply/);
    assert.match(sheetSrc, /Cancel/);
    assert.match(sheetSrc, /draft === currentValue/);
    assert.doesNotMatch(cameraSrc, /Save setting/);
  });

  it("wires context apply gates and targeted refresh without setFiles", () => {
    assert.match(ctxSrc, /setCameraSetting/);
    assert.match(ctxSrc, /refreshCameraSettings/);
    assert.match(ctxSrc, /refreshCameraInformation/);
    assert.match(ctxSrc, /applyingCameraSettingKey/);
    assert.match(ctxSrc, /fetchCameraSettingProperties/);
    assert.match(ctxSrc, /applyCameraSetting/);
    assert.match(ctxSrc, /Do not replace Queue transport/);
    const infoFn = ctxSrc.slice(
      ctxSrc.indexOf("const refreshCameraInformation"),
      ctxSrc.indexOf("const setCameraSetting"),
    );
    assert.doesNotMatch(infoFn, /listAllFiles|setFiles\(/);
    assert.match(cameraSrc, /refreshCameraInformation/);
  });

  it("Date & Time copy does not promise phone-time sync", () => {
    assert.match(
      cameraSettingConfirmMessage("dateTimeMode", "USEGPS", "MANUAL"),
      /does not automatically set the clock/i,
    );
    assert.match(cameraSrc, /does not sync the clock from this phone/i);
  });

  it("missing property displays Not reported helper", () => {
    assert.equal(displayCameraSettingValue({}, "frequency"), "Not reported");
    assert.equal(rawCameraSettingValue({}, "frequency"), undefined);
    assert.equal(
      rawCameraSettingValue({ [CAMERA_SETTING_PROPERTY.frequency]: "50Hz" }, "frequency"),
      "50Hz",
    );
    assert.ok(cameraSettingOptions("ev").length === 7);
    assert.equal(cameraClockDisplay({}), undefined);
  });

  it("Camera clock stays read-only and unrelated screens do not mutate", () => {
    assert.match(cameraSrc, /Camera clock/);
    assert.doesNotMatch(cameraSrc, /Sync now/);
    assert.doesNotMatch(indexSrc, /setCameraSetting/);
    assert.doesNotMatch(queueSrc, /setCameraSetting/);
    assert.doesNotMatch(localSrc, /setCameraSetting/);
    assert.doesNotMatch(cameraSrc, /MIVUE_ALLOW_MUTATE|cameraMutate|action=del|formatSd/i);
    assert.doesNotMatch(ctxSrc, /MIVUE_ALLOW_MUTATE/);
  });

  it("success toast is outside SettingsScroll and coordinated with sheet onClosed", () => {
    assert.match(cameraSrc, /ScreenToast/);
    assert.match(cameraSrc, /pendingToastRef/);
    assert.match(cameraSrc, /onClosed=\{flushPendingToastAfterSheet\}/);
    assert.match(sheetSrc, /onClosed/);
    const scrollClose = cameraSrc.indexOf("</SettingsScroll>");
    const toastIdx = cameraSrc.indexOf("<ScreenToast");
    assert.ok(toastIdx > scrollClose);
    assert.doesNotMatch(cameraSrc.slice(0, scrollClose), /<ScreenToast/);
  });
});
