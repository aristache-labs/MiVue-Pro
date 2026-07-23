import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import {
  applyCameraSetting,
  assertCgiMutationSuccess,
  buildSetCameraSettingPath,
  CAMERA_SETTING_PROPERTY,
  CAMERA_SETTING_VALUES,
  CAMERA_SETTING_VERIFY_FAILED,
  CAMERA_SETTING_WIRE,
  formatCameraSettingValue,
  isAllowedCameraSettingValue,
  parseMutationBody,
  truncateBody,
  verifyCameraSetting,
} from "../src/cameraSettings";

function textResponse(statusCode: number, body: string): TransportResponse {
  return {
    statusCode,
    headers: {},
    body: new TextEncoder().encode(body),
  };
}

class RecordingTransport implements Transport {
  readonly calls: TransportRequest[] = [];
  constructor(private readonly handler: (req: TransportRequest) => Promise<TransportResponse>) {}
  async request(req: TransportRequest): Promise<TransportResponse> {
    this.calls.push(req);
    return this.handler(req);
  }
}

describe("cameraSettings allowlist", () => {
  it("maps every UI key to the correct wire property", () => {
    assert.equal(CAMERA_SETTING_WIRE.frequency, "Flicker");
    assert.equal(CAMERA_SETTING_WIRE.ev, "EV");
    assert.equal(CAMERA_SETTING_WIRE.dateTimeMode, "RtcGps");
    assert.equal(CAMERA_SETTING_WIRE.timeZone, "RtcTimezone");
    assert.equal(CAMERA_SETTING_WIRE.daylightSaving, "RtcDaylight");
    assert.equal(CAMERA_SETTING_PROPERTY.frequency, "Camera.Menu.Flicker");
  });

  it("accepts every approved value and builds encoded set paths", () => {
    for (const value of CAMERA_SETTING_VALUES.frequency) {
      assert.equal(isAllowedCameraSettingValue("frequency", value), true);
      const path = buildSetCameraSettingPath("frequency", value);
      assert.match(path, /action=set/);
      assert.match(path, /property=Flicker/);
      assert.match(path, new RegExp(`value=${encodeURIComponent(value)}`));
    }
    for (const value of CAMERA_SETTING_VALUES.ev) {
      assert.equal(isAllowedCameraSettingValue("ev", value), true);
    }
  });

  it("rejects unknown properties and values before transport", () => {
    assert.equal(isAllowedCameraSettingValue("frequency", "HDR"), false);
    assert.equal(isAllowedCameraSettingValue("ev", "VideoRes"), false);
    assert.throws(() => buildSetCameraSettingPath("frequency", "HDR" as "50Hz"), /Unsupported/);
    assert.throws(() => buildSetCameraSettingPath("ev", "ON" as "EV0"), /Unsupported/);
  });

  it("formats labels for UI", () => {
    assert.equal(formatCameraSettingValue("ev", "EVN100"), "-1.0");
    assert.equal(formatCameraSettingValue("dateTimeMode", "MANUAL"), "Manual");
    assert.equal(formatCameraSettingValue("timeZone", "P03"), "GMT +03:00");
    assert.equal(formatCameraSettingValue("daylightSaving", "OFF"), "Off");
  });
});

describe("cameraSettings mutation response validation", () => {
  it("requires HTTP 2xx, CGI 0, and OK message", () => {
    const ok = parseMutationBody(new TextEncoder().encode("0\nOK\n"));
    assertCgiMutationSuccess(200, ok.bodyText, ok.parsed);

    assert.throws(() => assertCgiMutationSuccess(500, "0\nOK\n", ok.parsed), /HTTP 500/);
    const badCode = parseMutationBody(new TextEncoder().encode("701\nERR\n"));
    assert.throws(
      () => assertCgiMutationSuccess(200, badCode.bodyText, badCode.parsed),
      /CGI 701/,
    );
    const badMsg = parseMutationBody(new TextEncoder().encode("0\nNope\n"));
    assert.throws(
      () => assertCgiMutationSuccess(200, badMsg.bodyText, badMsg.parsed),
      /not OK/,
    );
    assert.throws(() => assertCgiMutationSuccess(200, "", undefined), /empty or unparseable/);
  });

  it("truncates response bodies in errors", () => {
    const long = "x".repeat(200);
    assert.ok(truncateBody(long, 40).endsWith("…"));
    assert.ok(truncateBody(long, 40).length <= 41);
  });
});

describe("applyCameraSetting one-shot + verify", () => {
  it("uses retryPolicy mutation and sends only one set request", async () => {
    const transport = new RecordingTransport(async (req) => {
      if (req.path.includes("action=set")) {
        assert.equal(req.retryPolicy, "mutation");
        assert.equal(req.method, "GET");
        return textResponse(200, "0\nOK\n");
      }
      return textResponse(200, "0\nOK\nCamera.Menu.Flicker=50Hz\n");
    });
    const result = await applyCameraSetting(transport, "frequency", "50Hz");
    assert.equal(result.value, "50Hz");
    const sets = transport.calls.filter((c) => c.path.includes("action=set"));
    assert.equal(sets.length, 1);
    assert.equal(sets[0]!.retryPolicy, "mutation");
  });

  it("does not retry on timeout / transport failure", async () => {
    let calls = 0;
    const transport = new RecordingTransport(async () => {
      calls += 1;
      throw new Error("timeout");
    });
    await assert.rejects(
      () => applyCameraSetting(transport, "frequency", "50Hz"),
      /not retried/,
    );
    assert.equal(calls, 1);
  });

  it("rejects HTTP failure and non-OK CGI without a second set", async () => {
    const transport = new RecordingTransport(async () => textResponse(503, "0\nOK\n"));
    await assert.rejects(() => applyCameraSetting(transport, "frequency", "50Hz"), /HTTP 503/);
    assert.equal(transport.calls.filter((c) => c.path.includes("action=set")).length, 1);
  });

  it("verification mismatch never triggers a second mutation", async () => {
    const transport = new RecordingTransport(async (req) => {
      if (req.path.includes("action=set")) return textResponse(200, "0\nOK\n");
      return textResponse(200, "0\nOK\nCamera.Menu.Flicker=60Hz\n");
    });
    await assert.rejects(
      () => applyCameraSetting(transport, "frequency", "50Hz"),
      (err: Error) => err.message === CAMERA_SETTING_VERIFY_FAILED,
    );
    assert.equal(transport.calls.filter((c) => c.path.includes("action=set")).length, 1);
  });

  it("verifyCameraSetting compares reported value", async () => {
    const transport = new RecordingTransport(async () =>
      textResponse(200, "0\nOK\nCamera.Menu.EV=EV0\n"),
    );
    const ok = await verifyCameraSetting(transport, "ev", "EV0");
    assert.equal(ok.ok, true);
    const bad = await verifyCameraSetting(transport, "ev", "EVP100");
    assert.equal(bad.ok, false);
  });
});
