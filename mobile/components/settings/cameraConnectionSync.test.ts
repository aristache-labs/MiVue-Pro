import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CAMERA_DISCONNECTED,
  resolveCameraSoftwareFields,
} from "./cameraSoftwareInfo";
import {
  connectionStatusLabel,
  isCameraContentLive,
  visibleConnectionStatus,
} from "./settingsSummaries";
import { isCameraLibraryInteractive } from "../camera/cameraLibraryModel";
import {
  linkStateAfterVerifyFailure,
  shouldClearLibraryAfterFailures,
} from "../camera/cameraConnectionSupervisor";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cameraPageSrc = readFileSync(join(__dirname, "../../app/settings/camera.tsx"), "utf8");
const contextSrc = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");

const LIVE_PROPS = {
  "Vendor.DeviceInfo.Version.Firmware": "VI100.24.50.BE1WD.10",
  "Vendor.DeviceInfo.Version.SpeedCam": "V82.0706.01.25",
  "Vendor.DeviceInfo.Version.Voice": "V01.0829.01.RO",
  "Net.WIFI_AP.SSID": "MiVue_db:8c",
  "Camera.Menu.Flicker": "60Hz",
} as const;

describe("Camera & Connection link-state sync", () => {
  it("badge Connected mapping matches content-live for every link state", () => {
    for (const state of [
      "idle",
      "connecting",
      "connected",
      "disconnected",
      "unstable",
      "connection_lost",
    ] as const) {
      const badgeConnected = visibleConnectionStatus(state) === "connected";
      assert.equal(isCameraContentLive(state), badgeConnected, state);
      assert.equal(isCameraLibraryInteractive(state), state === "connected" || state === "unstable");
    }
  });

  it("first health-check failure keeps Connected badge and live content", () => {
    assert.equal(linkStateAfterVerifyFailure(1), "unstable");
    assert.equal(shouldClearLibraryAfterFailures(1), false);
    assert.equal(connectionStatusLabel("unstable"), "Connected");
    assert.equal(isCameraContentLive("unstable"), true);

    const fields = resolveCameraSoftwareFields({
      connected: isCameraContentLive("unstable"),
      demoMode: false,
      loading: false,
      properties: LIVE_PROPS,
      wifiSsid: undefined,
    });
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
    assert.equal(fields.cameraWifi.display, "MiVue_db:8c");
    assert.notEqual(fields.firmware.display, CAMERA_DISCONNECTED);
  });

  it("second consecutive failure disconnects badge and content together", () => {
    assert.equal(linkStateAfterVerifyFailure(2), "connection_lost");
    assert.equal(shouldClearLibraryAfterFailures(2), true);
    assert.equal(connectionStatusLabel("connection_lost"), "Disconnected");
    assert.equal(isCameraContentLive("connection_lost"), false);

    const fields = resolveCameraSoftwareFields({
      connected: isCameraContentLive("connection_lost"),
      demoMode: false,
      loading: false,
      properties: LIVE_PROPS,
      wifiSsid: undefined,
    });
    assert.equal(fields.firmware.display, CAMERA_DISCONNECTED);
    assert.equal(fields.cameraWifi.display, "Unavailable");
  });

  it("individual firmware gap with live session does not imply disconnect", () => {
    assert.equal(isCameraContentLive("connected"), true);
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: { "Camera.Menu.Flicker": "60Hz" },
      wifiSsid: "MiVue_db:8c",
      cgiKeys: {
        firmware: ["Vendor.DeviceInfo.Version.Firmware"],
        safetyCameraData: ["Vendor.DeviceInfo.Version.SpeedCam"],
        voiceVersion: ["Vendor.DeviceInfo.Version.Voice"],
        cameraWifiSsid: ["Net.WIFI_AP.SSID"],
      },
      requestError: true,
      lastConfirmed: { firmware: "VI100.24.50.BE1WD.10" },
    });
    assert.equal(connectionStatusLabel("connected"), "Connected");
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
    assert.notEqual(fields.firmware.display, CAMERA_DISCONNECTED);
  });

  it("reconnect success maps badge and content back to Connected", () => {
    assert.equal(connectionStatusLabel("connected"), "Connected");
    assert.equal(isCameraContentLive("connected"), true);
    const fields = resolveCameraSoftwareFields({
      connected: isCameraContentLive("connected"),
      demoMode: false,
      loading: false,
      properties: LIVE_PROPS,
      wifiSsid: undefined,
    });
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
  });

  it("camera page uses isCameraContentLive — not strict === connected", () => {
    assert.match(cameraPageSrc, /isCameraContentLive\(cameraLinkState\)/);
    assert.doesNotMatch(
      cameraPageSrc,
      /const connected = cameraLinkState === "connected" && !demoMode/,
    );
    assert.match(cameraPageSrc, /sessionLive/);
    assert.match(cameraPageSrc, /!sessionLive/);
  });

  it("context rejects stale health results via seq and session guards", () => {
    assert.match(contextSrc, /healthVerifySeqRef/);
    assert.match(contextSrc, /verifySeq !== healthVerifySeqRef\.current/);
    assert.match(contextSrc, /appStateRef\.current !== "active"/);
    assert.match(contextSrc, /isCameraLibraryInteractive\(cameraLinkState\)/);
    assert.match(contextSrc, /isCameraLibraryInteractive\(linkStateRef\.current\)/);
  });
});
