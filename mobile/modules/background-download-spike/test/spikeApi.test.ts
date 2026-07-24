import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSpikeCameraFileUrl,
  isPrivateIpv4,
  redactSpikeUrlForLog,
} from "../urlHelpers";

test("isPrivateIpv4 accepts MiVue AP and RFC1918 ranges", () => {
  assert.equal(isPrivateIpv4("192.72.1.1"), true);
  assert.equal(isPrivateIpv4("192.168.0.1"), true);
  assert.equal(isPrivateIpv4("10.0.0.1"), true);
  assert.equal(isPrivateIpv4("172.16.0.1"), true);
  assert.equal(isPrivateIpv4("8.8.8.8"), false);
  assert.equal(isPrivateIpv4("not-an-ip"), false);
});

test("buildSpikeCameraFileUrl builds http URL under /SD/", () => {
  assert.equal(
    buildSpikeCameraFileUrl("192.72.1.1", "/SD/Normal/FILE.MP4"),
    "http://192.72.1.1/SD/Normal/FILE.MP4",
  );
  assert.throws(() => buildSpikeCameraFileUrl("8.8.8.8", "/SD/Normal/FILE.MP4"));
  assert.throws(() => buildSpikeCameraFileUrl("192.72.1.1", "/etc/passwd"));
  assert.throws(() => buildSpikeCameraFileUrl("192.72.1.1", "/SD/../x"));
});

test("redactSpikeUrlForLog strips query and fragment", () => {
  assert.equal(
    redactSpikeUrlForLog("http://192.72.1.1/SD/Normal/A.MP4?token=secret#x"),
    "http://192.72.1.1/SD/Normal/A.MP4",
  );
  assert.equal(redactSpikeUrlForLog("not a url"), "<invalid-url>");
});
