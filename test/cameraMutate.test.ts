import assert from "node:assert/strict";
import test from "node:test";
import { MiVueProtocolError } from "../src/protocol/errors.js";
import {
  assertRemoteSdPath,
  buildCgiPath,
  deleteRemoteFile,
  isMutateAllowed,
  probeCgi,
  setCameraProperty,
  truncateBody,
} from "../src/protocol/cameraMutate.js";
import type { Transport, TransportRequest, TransportResponse } from "../src/transport/types.js";

class MockTransport implements Transport {
  readonly requests: TransportRequest[] = [];

  constructor(private readonly response: TransportResponse) {}

  async request(request: TransportRequest): Promise<TransportResponse> {
    this.requests.push(request);
    return this.response;
  }
}

test("assertRemoteSdPath rejects traversal and non-SD paths", () => {
  assert.throws(() => assertRemoteSdPath("/SD/../x.MP4"), MiVueProtocolError);
  assert.throws(() => assertRemoteSdPath("/local/x.MP4"), MiVueProtocolError);
  assert.throws(() => assertRemoteSdPath("/SD/a\nb.MP4"), MiVueProtocolError);
  assert.doesNotThrow(() => assertRemoteSdPath("/SD/Normal/F/FILE.MP4"));
});

test("isMutateAllowed requires MIVUE_ALLOW_MUTATE=1", () => {
  assert.equal(isMutateAllowed({}), false);
  assert.equal(isMutateAllowed({ MIVUE_ALLOW_MUTATE: "0" }), false);
  assert.equal(isMutateAllowed({ MIVUE_ALLOW_MUTATE: "1" }), true);
});

test("deleteRemoteFile builds action=del with validated path", async () => {
  const transport = new MockTransport({
    statusCode: 200,
    headers: {},
    body: Buffer.from("0\nOK\n"),
  });
  const result = await deleteRemoteFile(transport, "/SD/Normal/F/FILE.MP4");
  assert.equal(result.statusCode, 200);
  assert.equal(
    transport.requests[0]?.path,
    "/cgi-bin/Config.cgi?action=del&property=%2FSD%2FNormal%2FF%2FFILE.MP4",
  );
  assert.equal(result.parsed?.code, 0);
});

test("deleteRemoteFile rejects unsafe paths before transport", async () => {
  const transport = new MockTransport({ statusCode: 200, headers: {}, body: new Uint8Array() });
  await assert.rejects(deleteRemoteFile(transport, "/SD/../x.MP4"), MiVueProtocolError);
  assert.equal(transport.requests.length, 0);
});

test("setCameraProperty builds action=set query", async () => {
  const transport = new MockTransport({
    statusCode: 200,
    headers: {},
    body: Buffer.from("0\nOK\nCamera.Menu.UIMode=MENU\n"),
  });
  const result = await setCameraProperty(transport, "Camera.Menu.UIMode", "MENU");
  assert.equal(
    transport.requests[0]?.path,
    "/cgi-bin/Config.cgi?action=set&property=Camera.Menu.UIMode&value=MENU",
  );
  assert.equal(result.parsed?.code, 0);
});

test("setCameraProperty requireAllowlist rejects unknown property", async () => {
  const transport = new MockTransport({ statusCode: 200, headers: {}, body: Buffer.from("0\nOK\n") });
  await assert.rejects(
    setCameraProperty(transport, "Vendor.Evil.Format", "YES", { requireAllowlist: true }),
    /allowlist/,
  );
  assert.equal(transport.requests.length, 0);
});

test("setCameraProperty requireAllowlist allows Camera.Menu.UIMode", async () => {
  const transport = new MockTransport({ statusCode: 200, headers: {}, body: Buffer.from("0\nOK\n") });
  await setCameraProperty(transport, "Camera.Menu.UIMode", "MENU", { requireAllowlist: true });
  assert.equal(transport.requests.length, 1);
  assert.equal(transport.requests[0]?.retryPolicy, "mutation");
});

test("setCameraProperty rejects non-OK CGI even with HTTP 200", async () => {
  const transport = new MockTransport({
    statusCode: 200,
    headers: {},
    body: Buffer.from("703\nUnknown CGI-PARAM\n"),
  });
  await assert.rejects(setCameraProperty(transport, "Camera.Menu.UIMode", "MENU"), /CGI 703/);
});

test("probeCgi returns truncated body and status on error HTTP", async () => {
  const long = `1\nERROR\n${"x".repeat(500)}`;
  const transport = new MockTransport({
    statusCode: 404,
    headers: {},
    body: Buffer.from(long),
  });
  const result = await probeCgi(transport, "get", { property: "status" });
  assert.equal(result.statusCode, 404);
  assert.ok(result.bodyText.endsWith("…"));
  assert.ok(result.bodyText.length <= 401);
});

test("buildCgiPath and truncateBody helpers", () => {
  assert.equal(buildCgiPath("get", { property: "status" }), "/cgi-bin/Config.cgi?action=get&property=status");
  assert.equal(truncateBody("abc", 10), "abc");
  assert.equal(truncateBody("abcdefghij", 5), "abcde…");
});
