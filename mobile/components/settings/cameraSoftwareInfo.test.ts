import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CAMERA_DISCONNECTED,
  DEMO_CAMERA_SOFTWARE,
  formatVoicePackageDisplay,
  isApprovedHttpsUrl,
  normalizeWifiSsid,
  NOT_REPORTED_BY_CAMERA,
  OFFICIAL_CAMERA_UPDATE_URLS,
  resolveCameraSoftwareFields,
  resolveCameraWifiDisplay,
  SSID_UNAVAILABLE,
} from "./cameraSoftwareInfo";

describe("formatVoicePackageDisplay", () => {
  it("joins language and version with middle dot", () => {
    assert.equal(
      formatVoicePackageDisplay("Romanian", "V01.0829.01.RO"),
      "Romanian · V01.0829.01.RO",
    );
  });

  it("shows version only when language is missing", () => {
    assert.equal(formatVoicePackageDisplay(undefined, "V01.0829.01.RO"), "V01.0829.01.RO");
  });

  it("returns undefined when both missing", () => {
    assert.equal(formatVoicePackageDisplay(undefined, undefined), undefined);
  });
});

describe("normalizeWifiSsid", () => {
  it("strips Android quotes and rejects unknown placeholders", () => {
    assert.equal(normalizeWifiSsid('"MiVue_db:8c"'), "MiVue_db:8c");
    assert.equal(normalizeWifiSsid("<unknown ssid>"), undefined);
    assert.equal(normalizeWifiSsid("0x"), undefined);
  });
});

describe("resolveCameraWifiDisplay", () => {
  it("uses Demo Mode SSID sample only in demo", () => {
    const view = resolveCameraWifiDisplay({
      connected: true,
      ssid: undefined,
      demoMode: true,
    });
    assert.equal(view.display, DEMO_CAMERA_SOFTWARE.cameraWifiSsid);
    assert.equal(view.source, "demo");
  });

  it("shows exact OS SSID when available", () => {
    const view = resolveCameraWifiDisplay({
      connected: true,
      ssid: "MiVue_db:8c",
      demoMode: false,
    });
    assert.equal(view.display, "MiVue_db:8c");
    assert.equal(view.state, "available");
    assert.equal(view.source, "os");
  });

  it("never uses Camera network fallback", () => {
    const view = resolveCameraWifiDisplay({
      connected: true,
      ssid: undefined,
      demoMode: false,
    });
    assert.notEqual(view.display, "Camera network");
    assert.equal(view.display, SSID_UNAVAILABLE);
    assert.equal(view.state, "ssid_unavailable");
  });

  it("connected without SSID permission still shows SSID unavailable", () => {
    const view = resolveCameraWifiDisplay({
      connected: true,
      ssid: undefined,
      demoMode: false,
      ssidStatus: "permission_denied",
    });
    assert.equal(view.display, SSID_UNAVAILABLE);
    assert.notEqual(view.state, "available");
  });

  it("shows Unavailable when disconnected without SSID", () => {
    const view = resolveCameraWifiDisplay({
      connected: false,
      ssid: undefined,
      demoMode: false,
    });
    assert.equal(view.display, "Unavailable");
    assert.equal(view.state, "disconnected");
  });
});

describe("resolveCameraSoftwareFields", () => {
  it("Demo Mode exposes all four synthetic fields", () => {
    const fields = resolveCameraSoftwareFields({
      connected: false,
      demoMode: true,
      loading: false,
      properties: {},
      wifiSsid: undefined,
    });
    assert.equal(fields.firmware.display, DEMO_CAMERA_SOFTWARE.firmware);
    assert.equal(fields.safetyCameraData.display, DEMO_CAMERA_SOFTWARE.safetyCameraData);
    assert.equal(fields.voicePackage.display, "Romanian · V01.0829.01.RO");
    assert.equal(fields.cameraWifi.display, DEMO_CAMERA_SOFTWARE.cameraWifiSsid);
  });

  it("live connected without matching CGI values shows Not reported by camera", () => {
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: { CameraModel: "MiVue 866" },
      wifiSsid: undefined,
      cgiKeys: {
        firmware: [],
        safetyCameraData: [],
        voiceVersion: [],
        voiceLanguage: [],
        cameraWifiSsid: [],
      },
    });
    assert.equal(fields.firmware.display, NOT_REPORTED_BY_CAMERA);
    assert.equal(fields.safetyCameraData.display, NOT_REPORTED_BY_CAMERA);
    assert.equal(fields.voicePackage.display, NOT_REPORTED_BY_CAMERA);
    assert.equal(fields.cameraWifi.display, SSID_UNAVAILABLE);
    assert.ok(fields.firmware.accessibilityHint);
  });

  it("partial CGI availability surfaces only confirmed values", () => {
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: {
        ConfirmedFirmware: "VI100.24.50.BE1WD.10",
      },
      wifiSsid: "CamSSID",
      cgiKeys: {
        firmware: ["ConfirmedFirmware"],
        safetyCameraData: ["ConfirmedSafety"],
        cameraWifiSsid: [],
      },
    });
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
    assert.equal(fields.safetyCameraData.display, NOT_REPORTED_BY_CAMERA);
    assert.equal(fields.cameraWifi.display, "CamSSID");
  });

  it("disconnected live camera shows disconnected labels", () => {
    const fields = resolveCameraSoftwareFields({
      connected: false,
      demoMode: false,
      loading: false,
      properties: {},
      wifiSsid: undefined,
    });
    assert.equal(fields.firmware.display, CAMERA_DISCONNECTED);
    assert.equal(fields.safetyCameraData.display, CAMERA_DISCONNECTED);
    assert.equal(fields.voicePackage.display, CAMERA_DISCONNECTED);
    assert.equal(fields.cameraWifi.display, "Unavailable");
  });

  it("loading keeps previous CGI value when present", () => {
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: true,
      properties: { ConfirmedFirmware: "VI100.24.50.BE1WD.10" },
      wifiSsid: undefined,
      cgiKeys: { firmware: ["ConfirmedFirmware"] },
    });
    assert.equal(fields.firmware.state, "loading");
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
  });

  it("temporary request error keeps last confirmed value", () => {
    const fields = resolveCameraSoftwareFields({
      connected: true,
      demoMode: false,
      loading: false,
      properties: {},
      wifiSsid: undefined,
      requestError: true,
      lastConfirmed: { firmware: "VI100.24.50.BE1WD.10" },
      cgiKeys: { firmware: ["ConfirmedFirmware"] },
    });
    assert.equal(fields.firmware.state, "error");
    assert.equal(fields.firmware.display, "VI100.24.50.BE1WD.10");
  });

  it("Demo Mode values never appear on the live path", () => {
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
    assert.notEqual(live.cameraWifi.display, DEMO_CAMERA_SOFTWARE.cameraWifiSsid);
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
});

describe("official update URLs", () => {
  it("has no invented official URLs", () => {
    assert.equal(OFFICIAL_CAMERA_UPDATE_URLS.firmware, undefined);
    assert.equal(OFFICIAL_CAMERA_UPDATE_URLS.safety, undefined);
    assert.equal(OFFICIAL_CAMERA_UPDATE_URLS.voice, undefined);
  });

  it("rejects non-https and invalid URLs", () => {
    assert.equal(isApprovedHttpsUrl(undefined), false);
    assert.equal(isApprovedHttpsUrl("http://example.com"), false);
    assert.equal(isApprovedHttpsUrl("https://www.mio.com/support"), true);
  });
});
