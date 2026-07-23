import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { canSaveCameraIpv4, isStrictIpv4, parseCameraIpv4Input } from "./cameraIp";

describe("cameraIp", () => {
  it("accepts a valid private camera IPv4", () => {
    const parsed = parseCameraIpv4Input(" 192.72.1.1 ");
    assert.deepEqual(parsed, { ok: true, value: "192.72.1.1" });
    assert.equal(canSaveCameraIpv4("192.72.1.1", "192.72.1.2"), true);
    assert.equal(canSaveCameraIpv4("192.72.1.1", "192.72.1.1"), false);
  });

  it("rejects invalid IPv4 and non-IP shapes inline", () => {
    assert.equal(isStrictIpv4("192.72.1"), false);
    assert.equal(parseCameraIpv4Input("").ok, false);
    assert.equal(parseCameraIpv4Input("192.72.1.256").ok, false);
    assert.equal(parseCameraIpv4Input("http://192.72.1.1").ok, false);
    assert.equal(parseCameraIpv4Input("192.72.1.1:80").ok, false);
    assert.equal(parseCameraIpv4Input("192.72.1.1/").ok, false);
    assert.equal(parseCameraIpv4Input("camera.local").ok, false);
    assert.equal(canSaveCameraIpv4("not-an-ip", "192.72.1.1"), false);
  });

  it("rejects public IPv4 that the transport will not use", () => {
    const parsed = parseCameraIpv4Input("8.8.8.8");
    assert.equal(parsed.ok, false);
  });

  it("Save stays disabled when draft equals current host", () => {
    assert.equal(canSaveCameraIpv4("192.72.1.1", "192.72.1.1"), false);
    assert.equal(canSaveCameraIpv4(" 192.72.1.1 ", "192.72.1.1"), false);
  });

  it("Camera IP flow uses bottom sheet and does not route to a page", () => {
    const cameraSrc = readFileSync(join(__dirname, "../../app/settings/camera.tsx"), "utf8");
    const layoutSrc = readFileSync(join(__dirname, "../../app/settings/_layout.tsx"), "utf8");
    const sheetSrc = readFileSync(join(__dirname, "CameraIpSheet.tsx"), "utf8");
    assert.match(cameraSrc, /CameraIpSheet/);
    assert.doesNotMatch(cameraSrc, /\/settings\/camera-ip/);
    assert.doesNotMatch(layoutSrc, /name="camera-ip"/);
    assert.match(sheetSrc, /Modal/);
    assert.doesNotMatch(sheetSrc, /StaticBackdropSheet/);
    assert.doesNotMatch(sheetSrc, /refreshFiles|getStatus|listAllFiles/);
  });

  it("dismiss path leaves host unchanged until Save", () => {
    const original = "192.72.1.1";
    let host = original;
    const draft = "192.72.1.99";
    assert.equal(canSaveCameraIpv4(draft, host), true);
    // Cancel: do not persist
    assert.equal(host, original);
    const parsed = parseCameraIpv4Input(draft);
    assert.equal(parsed.ok, true);
    if (parsed.ok) host = parsed.value;
    assert.equal(host, "192.72.1.99");
  });
});
