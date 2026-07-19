import assert from "node:assert/strict";
import test from "node:test";
import { MiVueProtocolError } from "../src/protocol/errors.js";
import { MiVueClient } from "../src/protocol/mivueClient.js";
import type { Transport, TransportRequest, TransportResponse } from "../src/transport/types.js";

class MockTransport implements Transport {
  readonly requests: TransportRequest[] = [];

  constructor(private readonly response: TransportResponse) {}

  async request(request: TransportRequest): Promise<TransportResponse> {
    this.requests.push(request);
    return this.response;
  }
}

class SequenceTransport implements Transport {
  readonly requests: TransportRequest[] = [];

  constructor(private readonly responses: TransportResponse[]) {}

  async request(request: TransportRequest): Promise<TransportResponse> {
    this.requests.push(request);
    const response = this.responses.shift();
    if (response === undefined) throw new Error("Unexpected request");
    return response;
  }
}

test("listFiles builds the confirmed CGI query", async () => {
  const transport = new MockTransport({
    statusCode: 200,
    headers: { "content-type": "text/xml" },
    body: Buffer.from("<DCIM><amount>0</amount></DCIM>"),
  });
  const client = new MiVueClient({ host: "192.72.1.1", httpPort: 80, rtspPort: 554 }, transport);
  const result = await client.listFiles({ count: 5, from: 0 });

  assert.equal(result.amount, 0);
  assert.equal(
    transport.requests[0]?.path,
    "/cgi-bin/Config.cgi?action=dir&property=DCIM&format=all&count=5&from=0",
  );
});

test("listFiles requests a category-specific property", async () => {
  const transport = new MockTransport(xmlResponse("<Parking><amount>0</amount></Parking>"));
  const client = new MiVueClient({ host: "192.72.1.1", httpPort: 80, rtspPort: 554 }, transport);

  await client.listFiles({ count: 5, from: 10, category: "parking" });
  assert.equal(
    transport.requests[0]?.path,
    "/cgi-bin/Config.cgi?action=dir&property=Parking&format=all&count=5&from=10",
  );
});

test("headFile rejects traversal paths before transport", async () => {
  const transport = new MockTransport({ statusCode: 200, headers: {}, body: new Uint8Array() });
  const client = new MiVueClient({ host: "192.72.1.1", httpPort: 80, rtspPort: 554 }, transport);
  await assert.rejects(client.headFile("/SD/../firmware.bin"), MiVueProtocolError);
  assert.equal(transport.requests.length, 0);
});

test("listAllFiles advances from by the received page size", async () => {
  const transport = new SequenceTransport([
    xmlResponse(fileListXml(["/SD/Normal/F/one.MP4", "/SD/Normal/F/two.MP4"])),
    xmlResponse(fileListXml(["/SD/Normal/F/three.MP4"])),
  ]);
  const client = new MiVueClient({ host: "192.72.1.1", httpPort: 80, rtspPort: 554 }, transport);

  const result = await client.listAllFiles({ pageSize: 2, categories: ["normal"] });
  assert.equal(result.amount, 3);
  assert.equal(result.pages, 2);
  assert.equal(result.truncated, false);
  assert.deepEqual(result.files.map((file) => file.path), [
    "/SD/Normal/F/one.MP4",
    "/SD/Normal/F/two.MP4",
    "/SD/Normal/F/three.MP4",
  ]);
  assert.match(transport.requests[0]?.path ?? "", /from=0$/);
  assert.match(transport.requests[1]?.path ?? "", /from=2$/);
});

test("listAllFiles rejects a repeated full page", async () => {
  const repeated = fileListXml(["/SD/Normal/F/one.MP4"]);
  const transport = new SequenceTransport([xmlResponse(repeated), xmlResponse(repeated)]);
  const client = new MiVueClient({ host: "192.72.1.1", httpPort: 80, rtspPort: 554 }, transport);
  await assert.rejects(client.listAllFiles({ pageSize: 1, categories: ["normal"] }), /repetat pagina/);
});

test("listAllFiles starts pagination at zero for every category", async () => {
  const transport = new SequenceTransport([
    xmlResponse(fileListXml(["/SD/Normal/F/one.MP4"], "Normal")),
    xmlResponse(fileListXml(["/SD/Event/F/two.MP4"], "Event")),
    xmlResponse(fileListXml([], "Parking")),
    xmlResponse(fileListXml([], "Photo")),
  ]);
  const client = new MiVueClient({ host: "192.72.1.1", httpPort: 80, rtspPort: 554 }, transport);

  const result = await client.listAllFiles({ pageSize: 2 });
  assert.equal(result.amount, 2);
  assert.equal(result.pages, 4);
  assert.equal(result.truncated, false);
  assert.deepEqual(
    transport.requests.map((request) => request.path.match(/property=([^&]+).*from=(\d+)/)?.slice(1)),
    [["Normal", "0"], ["Event", "0"], ["Parking", "0"], ["Photo", "0"]],
  );
});

test("getInfo skips properties rejected by the camera", async () => {
  const ok = (body: string) => ({ statusCode: 200, headers: {}, body: Buffer.from(body) });
  const responses = [
    { statusCode: 200, headers: { server: "AIT" }, body: Buffer.from("0\nOK\n") },
    ok("799\nInternal Error\n"), // broadcast
  ];
  // Remaining readable props after broadcast in READABLE_CAMERA_PROPERTIES
  for (let i = 0; i < 10; i += 1) responses.push(ok("0\nOK\nCamera.Menu.UIMode=VIDEO\n"));
  const transport = new SequenceTransport(responses);
  const client = new MiVueClient({ host: "192.72.1.1", httpPort: 80, rtspPort: 554 }, transport);
  const info = await client.getInfo();
  assert.equal(info.properties["Camera.Menu.UIMode"], "VIDEO");
  assert.equal(info.properties.broadcast, undefined);
  assert.equal(info.server, "AIT");
});

function xmlResponse(xml: string): TransportResponse {
  return { statusCode: 200, headers: { "content-type": "text/xml" }, body: Buffer.from(xml) };
}

function fileListXml(paths: readonly string[], root = "DCIM"): string {
  const entries = paths.map((path) => `<file><name>${path}</name><format size="1920x1080" fps="60" time="1">MP4</format><size>100</size><attr>RW</attr><time>2026-01-01 00:00:00</time></file>`).join("");
  return `<${root}>${entries}<amount>${paths.length}</amount></${root}>`;
}
