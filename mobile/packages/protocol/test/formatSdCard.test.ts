import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import {
  buildFormatSdCardPath,
  formatSdCard,
  FORMAT_SD_CONFIRM_TOKEN,
  FORMAT_SD_STATUS_PROPERTY,
  FORMAT_SD_WIRE_PROPERTY,
  FORMAT_SD_WIRE_VALUE,
  isSdCardStatusReadyForFormat,
} from "../src/formatSdCard";

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

describe("formatSdCard path + gates", () => {
  it("builds SET SD0=format", () => {
    const path = buildFormatSdCardPath();
    assert.match(path, /action=set/);
    assert.match(path, new RegExp(`property=${FORMAT_SD_WIRE_PROPERTY}`));
    assert.match(path, new RegExp(`value=${FORMAT_SD_WIRE_VALUE}`));
    assert.equal(FORMAT_SD_CONFIRM_TOKEN, "FORMAT");
    assert.equal(FORMAT_SD_STATUS_PROPERTY, "Camera.Menu.SD0");
  });

  it("READY gate", () => {
    assert.equal(isSdCardStatusReadyForFormat("READY"), true);
    assert.equal(isSdCardStatusReadyForFormat("ready"), true);
    assert.equal(isSdCardStatusReadyForFormat("FAIL"), false);
    assert.equal(isSdCardStatusReadyForFormat(undefined), false);
  });

  it("refuses SET when SD status is not READY", async () => {
    const transport = new RecordingTransport(async () =>
      textResponse(200, `0\nOK\n${FORMAT_SD_STATUS_PROPERTY}=FAIL\n`),
    );
    await assert.rejects(() => formatSdCard(transport), /not READY/);
    assert.equal(transport.calls.length, 1);
    assert.match(transport.calls[0]!.path, /action=get/);
  });

  it("sends one SET then re-reads status on success", async () => {
    const transport = new RecordingTransport(async (req) => {
      if (req.path.includes("action=get")) {
        return textResponse(200, `0\nOK\n${FORMAT_SD_STATUS_PROPERTY}=READY\n`);
      }
      assert.equal(req.retryPolicy, "mutation");
      return textResponse(200, "0\nOK\n");
    });
    const result = await formatSdCard(transport);
    assert.equal(result.outcome, "success");
    assert.equal(transport.calls.filter((c) => c.path.includes("action=set")).length, 1);
    assert.equal(transport.calls.filter((c) => c.path.includes("action=get")).length, 2);
  });

  it("classifies transport error after SET as unknown without retry", async () => {
    let sets = 0;
    const transport = new RecordingTransport(async (req) => {
      if (req.path.includes("action=get")) {
        return textResponse(200, `0\nOK\n${FORMAT_SD_STATUS_PROPERTY}=READY\n`);
      }
      sets += 1;
      throw new Error("socket hang up");
    });
    const result = await formatSdCard(transport);
    assert.equal(result.outcome, "unknown");
    assert.equal(sets, 1);
    assert.match(result.message, /not retried/i);
  });
});
