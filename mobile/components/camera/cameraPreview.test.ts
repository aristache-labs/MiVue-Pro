import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RemoteFile } from "@/packages/parsers/src/index";
import {
  buildCameraPreviewUrl,
  cameraPreviewAvailability,
  cameraReportsVideoPreview,
} from "./cameraPreview";

const video: RemoteFile = {
  path: "/SD/Normal/F/FILE 01.MP4",
  name: "FILE 01.MP4",
  sizeBytes: 10,
  category: "normal",
  camera: "front",
  mediaFormat: "video",
  writable: true,
  recordedAt: "2026-08-01T12:00:00.000Z",
};

const photo: RemoteFile = {
  path: "/SD/Photo/PHOTO.JPG",
  name: "PHOTO.JPG",
  sizeBytes: 10,
  category: "photo",
  camera: "front",
  mediaFormat: "image",
  writable: true,
  recordedAt: "2026-08-01T12:00:00.000Z",
};

describe("cameraPreview", () => {
  it("accepts explicit camera preview capability values", () => {
    for (const value of ["YES", "true", "1", "supported"]) {
      assert.equal(
        cameraReportsVideoPreview({ "Vendor.DeviceInfo.SupportPlaybackPreview": value }),
        true,
      );
    }
    assert.equal(cameraReportsVideoPreview({}), false);
    assert.equal(
      cameraReportsVideoPreview({ "Vendor.DeviceInfo.SupportPlaybackPreview": "NO" }),
      false,
    );
  });

  it("allows connected photos without the video capability flag", () => {
    assert.deepEqual(
      cameraPreviewAvailability({
        file: photo,
        linkState: "connected",
        cameraHost: "192.72.1.1",
        cameraProperties: {},
        demoMode: false,
      }),
      { available: true, kind: "image" },
    );
  });

  it("gates video on connection, capability and the native cleartext host", () => {
    const supported = { "Vendor.DeviceInfo.SupportPlaybackPreview": "YES" };
    assert.deepEqual(
      cameraPreviewAvailability({
        file: video,
        linkState: "connected",
        cameraHost: "192.72.1.1",
        cameraProperties: supported,
        demoMode: false,
      }),
      { available: true, kind: "video" },
    );
    assert.equal(
      cameraPreviewAvailability({
        file: video,
        linkState: "disconnected",
        cameraHost: "192.72.1.1",
        cameraProperties: supported,
        demoMode: false,
      }).available,
      false,
    );
    assert.equal(
      cameraPreviewAvailability({
        file: video,
        linkState: "connected",
        cameraHost: "192.72.1.1",
        cameraProperties: {},
        demoMode: false,
      }).available,
      false,
    );
    assert.equal(
      cameraPreviewAvailability({
        file: video,
        linkState: "connected",
        cameraHost: "192.168.1.1",
        cameraProperties: supported,
        demoMode: false,
      }).available,
      false,
    );
  });

  it("builds an encoded SD URL and rejects traversal or unsupported hosts", () => {
    assert.equal(
      buildCameraPreviewUrl("192.72.1.1", video.path),
      "http://192.72.1.1/SD/Normal/F/FILE%2001.MP4",
    );
    assert.throws(() => buildCameraPreviewUrl("192.72.1.1", "/SD/../secret.MP4"));
    assert.throws(() => buildCameraPreviewUrl("192.168.1.1", video.path));
    assert.throws(() => buildCameraPreviewUrl("192.72.1.1", "/SD/Photo/PHOTO.JPG"));
  });
});
