import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CAMERA_UPDATE_INFO_TITLE,
  DEMO_CAMERA_SOFTWARE,
  NOT_REPORTED_BY_CAMERA,
  OFFICIAL_CAMERA_UPDATE_URLS,
  resolveCameraSoftwareFields,
  SSID_UNAVAILABLE,
} from "./cameraSoftwareInfo";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cameraPageSrc = readFileSync(join(__dirname, "../../app/settings/camera.tsx"), "utf8");
const sheetSrc = readFileSync(join(__dirname, "CameraUpdateInfoSheet.tsx"), "utf8");
const infoSrc = readFileSync(join(__dirname, "cameraSoftwareInfo.ts"), "utf8");
const contextSrc = readFileSync(join(__dirname, "../../context/DemoModeContext.tsx"), "utf8");
const protocolClientSrc = readFileSync(
  join(__dirname, "../../packages/protocol/src/client.ts"),
  "utf8",
);
const appJson = readFileSync(join(__dirname, "../../app.json"), "utf8");
const wifiPlugin = readFileSync(join(__dirname, "../../plugins/withWifiSsidAccess.js"), "utf8");
const iosModule = readFileSync(
  join(__dirname, "../../modules/wifi-ssid/ios/WifiSsidModule.swift"),
  "utf8",
);

describe("Camera & Connection software info UI wiring", () => {
  it("renders Camera information rows in recommended order without Status duplicates", () => {
    const infoStart = cameraPageSrc.indexOf('title="Camera information"');
    const infoEnd = cameraPageSrc.indexOf('title="Camera settings"');
    assert.ok(infoStart > 0 && infoEnd > infoStart);
    const infoBlock = cameraPageSrc.slice(infoStart, infoEnd);

    const ip = infoBlock.indexOf('title="Camera IP"');
    const wifi = infoBlock.indexOf('title="Camera Wi‑Fi"');
    const firmware = infoBlock.indexOf('title="Firmware"');
    const safety = infoBlock.indexOf('title="Safety camera data"');
    const voice = infoBlock.indexOf('title="Voice package"');
    assert.ok(ip > 0 && wifi > ip && firmware > wifi && safety > firmware && voice > safety);

    assert.doesNotMatch(infoBlock, /title="Connection status"/);
    assert.doesNotMatch(infoBlock, /title="Camera model"/);
    assert.doesNotMatch(infoBlock, /title="Last connected"/);
    assert.doesNotMatch(infoBlock, /title="Camera clock"/);
    assert.doesNotMatch(infoBlock, /title="Compatibility"/);
  });

  it("Status card shows model, last connected, clock badge — without Camera IP", () => {
    const statusStart = cameraPageSrc.indexOf('title="Status"');
    const statusEnd = cameraPageSrc.indexOf('title="Camera information"');
    assert.ok(statusStart > 0 && statusEnd > statusStart);
    const statusBlock = cameraPageSrc.slice(statusStart, statusEnd);

    assert.match(statusBlock, /SettingsStatusBadge/);
    assert.match(statusBlock, /modelRowValue/);
    assert.match(statusBlock, /Last connected · \$\{lastConnectedValue\}/);
    assert.match(statusBlock, /Camera clock/);
    assert.match(statusBlock, /clockValue/);
    assert.doesNotMatch(statusBlock, /title="Camera IP"/);
    assert.doesNotMatch(statusBlock, /\{cameraHost\}/);
  });

  it("Camera IP stays interactive in Camera information", () => {
    const infoStart = cameraPageSrc.indexOf('title="Camera information"');
    const infoEnd = cameraPageSrc.indexOf('title="Camera settings"');
    const infoBlock = cameraPageSrc.slice(infoStart, infoEnd);
    assert.match(infoBlock, /title="Camera IP"/);
    assert.match(infoBlock, /setIpSheetOpen\(true\)/);
    assert.match(cameraPageSrc, /<CameraIpSheet/);
  });

  it("places Camera updates before Actions", () => {
    const updates = cameraPageSrc.indexOf('title="Camera updates"');
    const actions = cameraPageSrc.indexOf('title="Actions"');
    assert.ok(updates > 0 && actions > updates);
  });

  it("wires update rows and clears software data on change camera", () => {
    assert.match(cameraPageSrc, /CameraUpdateInfoSheet/);
    assert.match(cameraPageSrc, /disconnectSession\(\)/);
    assert.match(cameraPageSrc, /setLastConfirmedSoftware\(\{\}\)/);
    assert.match(cameraPageSrc, /accessibilityHint=\{softwareFields\.firmware\.accessibilityHint\}/);
  });

  it("refresh re-reads OS SSID", () => {
    assert.match(cameraPageSrc, /refreshWifiSsid/);
    assert.match(cameraPageSrc, /await refreshWifiSsid\(\)/);
  });
});

describe("SSID native source wiring", () => {
  it("configures Apple wifi-info entitlement and location purpose string", () => {
    assert.match(appJson, /com\.apple\.developer\.networking\.wifi-info/);
    assert.match(appJson, /NSLocationWhenInUseUsageDescription/);
    assert.match(wifiPlugin, /com\.apple\.developer\.networking\.wifi-info/);
    assert.match(iosModule, /NEHotspotNetwork\.fetchCurrent/);
  });

  it("does not hardcode Camera network fallback anymore", () => {
    assert.doesNotMatch(infoSrc, /Camera network/);
    assert.match(infoSrc, /SSID unavailable/);
  });
});

describe("Camera updates sheet copy and URL policy", () => {
  it("uses approved informational copy without forbidden CTAs", () => {
    assert.match(
      sheetSrc,
      /Updates for this camera are currently managed through the official Mio software/,
    );
    assert.doesNotMatch(sheetSrc, /Check for updates/);
    assert.doesNotMatch(sheetSrc, /Update now/);
    assert.doesNotMatch(sheetSrc, /\bDownload\b/);
    assert.doesNotMatch(sheetSrc, /\bInstall\b/);
  });

  it("omits Open update instructions when official URL is absent", () => {
    assert.equal(OFFICIAL_CAMERA_UPDATE_URLS.firmware, undefined);
    assert.match(sheetSrc, /Close/);
  });

  it("exposes correct sheet titles", () => {
    assert.equal(CAMERA_UPDATE_INFO_TITLE.firmware, "Firmware update");
    assert.equal(CAMERA_UPDATE_INFO_TITLE.safety, "Safety camera data");
    assert.equal(CAMERA_UPDATE_INFO_TITLE.voice, "Voice package");
  });
});

describe("read-only and no package transfer", () => {
  it("uses camera-confirmed CGI software keys (GET-only)", () => {
    assert.match(infoSrc, /Vendor\.DeviceInfo\.Version\.Firmware/);
    assert.match(infoSrc, /Vendor\.DeviceInfo\.Version\.SpeedCam/);
    assert.match(infoSrc, /Vendor\.DeviceInfo\.Version\.Voice/);
    assert.match(infoSrc, /Net\.WIFI_AP\.SSID/);
  });

  it("camera host change clears properties so another camera cannot reuse them", () => {
    assert.match(contextSrc, /setCameraProperties\(\{\}\)/);
  });

  it("camera page does not call set/del/upload for software packages", () => {
    assert.doesNotMatch(cameraPageSrc, /uploadFirmware|installFirmware|downloadFirmware/);
    assert.doesNotMatch(sheetSrc, /upload|installFirmware|downloadPackage/);
  });

  it("protocol info refresh remains GET/HEAD oriented in client", () => {
    assert.match(protocolClientSrc, /READONLY_INFO_PROPERTIES|getInfo|method:\s*["']GET["']/);
    assert.doesNotMatch(protocolClientSrc, /uploadFirmware|installPackage/);
  });
});

describe("resolveCameraSoftwareFields scenarios", () => {
  it("maps confirmed properties when keys are provided", () => {
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: {
        ConfirmedFirmware: "VI100.24.50.BE1WD.10",
        ConfirmedSafety: "V82.0706.01.25",
        ConfirmedVoiceLang: "Romanian",
        ConfirmedVoiceVer: "V01.0829.01.RO",
      },
      wifiSsid: "MiVue_db:8c",
      cgiKeys: {
        firmware: ["ConfirmedFirmware"],
        safetyCameraData: ["ConfirmedSafety"],
        voiceLanguage: ["ConfirmedVoiceLang"],
        voiceVersion: ["ConfirmedVoiceVer"],
        cameraWifiSsid: [],
      },
    });
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
    assert.equal(fields.safetyCameraData.display, "V82.0706.01.25");
    assert.equal(fields.voicePackage.display, "Romanian · V01.0829.01.RO");
    assert.equal(fields.cameraWifi.display, "MiVue_db:8c");
    assert.equal(fields.cameraWifi.source, "os");
  });

  it("maps live MiVue 866 CGI property names", () => {
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: {
        "Vendor.DeviceInfo.Version.Firmware": "VI100.24.50.BE1WD.10",
        "Vendor.DeviceInfo.Version.SpeedCam": "V82.0706.01.25",
        "Vendor.DeviceInfo.Version.Voice": "V01.0829.01.RO",
        "Net.WIFI_AP.SSID": "MiVue_db:8c",
      },
      wifiSsid: undefined,
    });
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
    assert.equal(fields.safetyCameraData.display, "V82.0706.01.25");
    assert.equal(fields.voicePackage.display, "V01.0829.01.RO");
    assert.equal(fields.cameraWifi.display, "MiVue_db:8c");
    assert.equal(fields.cameraWifi.source, "cgi");
  });

  it("empty or unsupported CGI responses become Not reported by camera", () => {
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: {},
      wifiSsid: undefined,
      cgiKeys: { firmware: ["MissingProp"] },
    });
    assert.equal(fields.firmware.display, NOT_REPORTED_BY_CAMERA);
    assert.equal(fields.cameraWifi.display, SSID_UNAVAILABLE);
  });

  it("Demo Mode never leaks into live unavailable path", () => {
    const live = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: {},
      wifiSsid: undefined,
      cgiKeys: {
        firmware: [],
        safetyCameraData: [],
        voiceVersion: [],
        voiceLanguage: [],
        cameraWifiSsid: [],
      },
    });
    assert.notEqual(live.firmware.display, DEMO_CAMERA_SOFTWARE.firmware);
    assert.equal(live.firmware.display, NOT_REPORTED_BY_CAMERA);
  });
});
