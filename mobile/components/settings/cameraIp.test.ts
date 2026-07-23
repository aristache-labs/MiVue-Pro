import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  canContinueWithCameraIpv4,
  canSaveCameraIpv4,
  isStrictIpv4,
  parseCameraIpv4Input,
  sanitizeCameraIpv4Draft,
} from "./cameraIp";

describe("cameraIp", () => {
  it("accepts a valid private camera IPv4", () => {
    const parsed = parseCameraIpv4Input(" 192.72.1.1 ");
    assert.deepEqual(parsed, { ok: true, value: "192.72.1.1" });
    assert.equal(canSaveCameraIpv4("192.72.1.1", "192.72.1.2"), true);
    assert.equal(canSaveCameraIpv4("192.72.1.1", "192.72.1.1"), false);
  });

  it("normalizes comma to dot and strips non-IP characters", () => {
    assert.equal(sanitizeCameraIpv4Draft("192,168,1,1"), "192.168.1.1");
    assert.equal(sanitizeCameraIpv4Draft("192.abc.1.1!"), "192..1.1");
    assert.equal(sanitizeCameraIpv4Draft("192.168.1.1extra"), "192.168.1.1");
    assert.equal(sanitizeCameraIpv4Draft("192.168.1.10.20.1"), "192.168.1.10.20");
  });

  it("rejects invalid IPv4 and non-IP shapes inline", () => {
    assert.equal(isStrictIpv4("192.72.1"), false);
    assert.equal(parseCameraIpv4Input("").ok, false);
    assert.equal(parseCameraIpv4Input("192.72.1.256").ok, false);
    assert.equal(parseCameraIpv4Input("192.72.1").ok, false);
    assert.equal(parseCameraIpv4Input("camera.local").ok, false);
    assert.equal(canSaveCameraIpv4("not-an-ip", "192.72.1.1"), false);
  });

  it("accepts 192.168.1.1 and rejects incomplete or public IPs", () => {
    assert.equal(parseCameraIpv4Input("192.168.1.1").ok, true);
    assert.equal(parseCameraIpv4Input("192.168.1").ok, false);
    assert.equal(parseCameraIpv4Input("8.8.8.8").ok, false);
    assert.equal(canContinueWithCameraIpv4("192.168.1.1"), true);
    assert.equal(canContinueWithCameraIpv4("192.168.1"), false);
    assert.equal(canContinueWithCameraIpv4(""), false);
  });

  it("Save stays disabled when draft equals current host", () => {
    assert.equal(canSaveCameraIpv4("192.72.1.1", "192.72.1.1"), false);
    assert.equal(canSaveCameraIpv4(" 192.72.1.1 ", "192.72.1.1"), false);
  });

  it("Camera IP flow uses centered modal and does not route to a page", () => {
    const cameraSrc = readFileSync(join(__dirname, "../../app/settings/camera.tsx"), "utf8");
    const layoutSrc = readFileSync(join(__dirname, "../../app/settings/_layout.tsx"), "utf8");
    const sheetSrc = readFileSync(join(__dirname, "CameraIpSheet.tsx"), "utf8");
    assert.match(cameraSrc, /CameraIpSheet/);
    assert.doesNotMatch(cameraSrc, /\/settings\/camera-ip/);
    assert.doesNotMatch(cameraSrc, /Reconnect camera/);
    assert.match(cameraSrc, /Refresh camera information/);
    assert.equal((cameraSrc.match(/Refresh camera information/g) ?? []).length, 2);
    assert.doesNotMatch(layoutSrc, /name="camera-ip"/);
    assert.match(sheetSrc, /Modal/);
    assert.doesNotMatch(sheetSrc, /StaticBackdropSheet/);
    assert.doesNotMatch(sheetSrc, /refreshFiles|getStatus|listAllFiles/);
  });

  it("select-camera uses numbers-and-punctuation and shared IPv4 helpers", () => {
    const selectSrc = readFileSync(join(__dirname, "../../app/onboarding/select-camera.tsx"), "utf8");
    assert.doesNotMatch(selectSrc, /decimal-pad/);
    assert.doesNotMatch(selectSrc, /inputMode/);
    assert.match(selectSrc, /numbers-and-punctuation/);
    assert.match(selectSrc, /sanitizeCameraIpv4Draft/);
    assert.match(selectSrc, /canContinueWithCameraIpv4/);
  });

  it("connection-help uses SettingsChromeHeader without native Back title", () => {
    const helpSrc = readFileSync(join(__dirname, "../../app/connection-help.tsx"), "utf8");
    const rootLayout = readFileSync(join(__dirname, "../../app/_layout.tsx"), "utf8");
    const chromeSrc = readFileSync(join(__dirname, "./SettingsChromeHeader.tsx"), "utf8");
    assert.match(helpSrc, /SettingsChromeHeader/);
    assert.match(helpSrc, /headerShown:\s*false/);
    assert.doesNotMatch(helpSrc, /headerBackTitle/);
    assert.match(rootLayout, /name="connection-help"/);
    assert.match(rootLayout, /headerShown:\s*false/);
    assert.match(chromeSrc, /backLabel/);
    assert.match(chromeSrc, /chevron-back/);
    assert.match(chromeSrc, /\{backLabel\}/);
  });

  it("dismiss path leaves host unchanged until Save", () => {
    const original = "192.72.1.1";
    let host = original;
    const draft = "192.72.1.99";
    assert.equal(canSaveCameraIpv4(draft, host), true);
    assert.equal(host, original);
    const parsed = parseCameraIpv4Input(draft);
    assert.equal(parsed.ok, true);
    if (parsed.ok) host = parsed.value;
    assert.equal(host, "192.72.1.99");
  });
});
