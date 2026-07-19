import assert from "node:assert/strict";
import { once } from "node:events";
import net from "node:net";
import test from "node:test";
import { HttpTransport } from "../src/transport/httpTransport.js";

test("HTTP transport sends the camera-compatible HTTP/1.0 request", async (context) => {
  let received = "";
  const server = net.createServer((socket) => {
    socket.on("data", (chunk: Buffer) => {
      received += chunk.toString("latin1");
      if (received.includes("\r\n\r\n")) {
        socket.end("HTTP/1.0 200 OK\r\nCONTENT-LENGTH: 13\r\nCONTENT-TYPE: text/plain\r\n\r\n0\nOK\nstatus=\n");
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());

  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");

  const transport = new HttpTransport({ host: "127.0.0.1", port: address.port, attempts: 1 });
  const response = await transport.request({
    method: "GET",
    path: "/cgi-bin/Config.cgi?action=get&property=status",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(Buffer.from(response.body).toString("utf8"), "0\nOK\nstatus=\n");
  assert.match(received, /^GET \/cgi-bin\/Config\.cgi\?action=get&property=status HTTP\/1\.0\r\n/);
  assert.match(received, /User-Agent: MiVuePro-Research\/1\.0\r\n/);
});

test("HTTP transport accepts HEAD with a non-zero Content-Length and no body", async (context) => {
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      socket.end("HTTP/1.0 200 OK\r\nCONTENT-LENGTH: 389402059\r\nCONTENT-TYPE: video/mpeg\r\n\r\n");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");

  const transport = new HttpTransport({ host: "127.0.0.1", port: address.port, attempts: 1 });
  const response = await transport.request({ method: "HEAD", path: "/SD/Normal/F/example.MP4" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-length"], "389402059");
  assert.equal(response.body.byteLength, 0);
});
