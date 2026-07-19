import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertCgiMutationSuccess,
  isForbiddenSetProperty,
  setCameraProperty,
} from "../src/protocol/cameraMutate.js";
import { parseConfigResponse } from "../src/protocol/parser.js";
import { HttpTransport } from "../src/transport/httpTransport.js";
import {
  MUTATION_HTTP_ATTEMPTS,
  READONLY_HTTP_ATTEMPTS,
  TransportError,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from "../src/transport/types.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class CountingTransport implements Transport {
  readonly requests: TransportRequest[] = [];
  constructor(
    private readonly handler: (request: TransportRequest, n: number) => Promise<TransportResponse>,
  ) {}

  async request(request: TransportRequest): Promise<TransportResponse> {
    this.requests.push(request);
    return this.handler(request, this.requests.length);
  }
}

function cgiOk(body = "0\nOK\n"): TransportResponse {
  return { statusCode: 200, headers: {}, body: Buffer.from(body) };
}

test("MUTATION_HTTP_ATTEMPTS is exactly 1 and distinct from readonly", () => {
  assert.equal(MUTATION_HTTP_ATTEMPTS, 1);
  assert.ok(READONLY_HTTP_ATTEMPTS >= 1);
  assert.notEqual(MUTATION_HTTP_ATTEMPTS, READONLY_HTTP_ATTEMPTS);
});

test("successful set issues exactly one request with mutation policy", async () => {
  const transport = new CountingTransport(async () => cgiOk());
  await setCameraProperty(transport, "Flicker", "50Hz");
  assert.equal(transport.requests.length, 1);
  assert.equal(transport.requests[0]?.retryPolicy, "mutation");
  assert.match(transport.requests[0]?.path ?? "", /action=set&property=Flicker&value=50Hz/);
});

test("0 OK produces success", async () => {
  const transport = new CountingTransport(async () => cgiOk("0\nOK\n"));
  const result = await setCameraProperty(transport, "Flicker", "50Hz");
  assert.equal(result.parsed?.code, 0);
  assert.equal(result.parsed?.message, "OK");
});

test("HTTP 404 produces failure", async () => {
  const transport = new CountingTransport(async () => ({
    statusCode: 404,
    headers: {},
    body: Buffer.from("0\nOK\n"),
  }));
  await assert.rejects(setCameraProperty(transport, "Flicker", "50Hz"), /HTTP 404/);
  assert.equal(transport.requests.length, 1);
});

test("CGI 703 with HTTP 200 produces failure", async () => {
  const transport = new CountingTransport(async () => cgiOk("703\nUnknown CGI-PARAM\n"));
  await assert.rejects(setCameraProperty(transport, "Flicker", "50Hz"), /CGI 703/);
  assert.equal(transport.requests.length, 1);
});

test("HTML with HTTP 200 produces failure", async () => {
  const transport = new CountingTransport(async () => cgiOk("<html><body>error</body></html>"));
  await assert.rejects(setCameraProperty(transport, "Flicker", "50Hz"), /unparseable/i);
  assert.equal(transport.requests.length, 1);
});

test("empty body produces failure", async () => {
  const transport = new CountingTransport(async () => ({
    statusCode: 200,
    headers: {},
    body: new Uint8Array(),
  }));
  await assert.rejects(setCameraProperty(transport, "Flicker", "50Hz"), /empty|unparseable/i);
  assert.equal(transport.requests.length, 1);
});

test("socket error on set yields unknown-result message and exactly one request", async () => {
  const transport = new CountingTransport(async () => {
    throw new TransportError("connect ECONNREFUSED", "ECONNREFUSED");
  });
  await assert.rejects(
    setCameraProperty(transport, "Flicker", "50Hz"),
    /Mutation result unknown.*will not be retried automatically/i,
  );
  assert.equal(transport.requests.length, 1);
});

test("timeout on set via HttpTransport with raised readonly attempts still one-shot", async (context) => {
  let hits = 0;
  const server = net.createServer((socket) => {
    hits += 1;
    // Accept TCP but never send HTTP response → client timeout
    socket.on("data", () => {});
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");

  const transport = new HttpTransport({
    host: "127.0.0.1",
    port: address.port,
    timeoutMs: 80,
    attempts: 5, // would retry if mutation inherited this
  });

  await assert.rejects(
    setCameraProperty(transport, "Flicker", "50Hz"),
    /Mutation result unknown|timed out/i,
  );
  assert.equal(hits, 1);
  assert.equal(MUTATION_HTTP_ATTEMPTS, 1);
});

test("readonly requests still retry with transport attempts > 1", async (context) => {
  let hits = 0;
  const server = net.createServer((socket) => {
    hits += 1;
    socket.once("data", () => {
      if (hits === 1) {
        socket.destroy();
        return;
      }
      socket.end("HTTP/1.0 200 OK\r\nCONTENT-LENGTH: 13\r\n\r\n0\nOK\nstatus=\n");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");

  const transport = new HttpTransport({
    host: "127.0.0.1",
    port: address.port,
    timeoutMs: 500,
    attempts: READONLY_HTTP_ATTEMPTS,
  });
  const response = await transport.request({
    method: "GET",
    path: "/cgi-bin/Config.cgi?action=get&property=status",
    retryPolicy: "readonly",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(hits, 2);
});

test("HDR set is forbidden before transport", async () => {
  assert.equal(isForbiddenSetProperty("Camera.Menu.HDR"), true);
  const transport = new CountingTransport(async () => cgiOk());
  await assert.rejects(setCameraProperty(transport, "Camera.Menu.HDR", "ON"), /forbidden/);
  assert.equal(transport.requests.length, 0);
});

test("assertCgiMutationSuccess accepts only 0 OK", () => {
  const ok = parseConfigResponse("0\nOK\n");
  assert.doesNotThrow(() => assertCgiMutationSuccess(200, "0\nOK\n", ok));
  assert.throws(() => assertCgiMutationSuccess(404, "0\nOK\n", ok), /HTTP 404/);
  assert.throws(
    () => assertCgiMutationSuccess(200, "703\nUnknown CGI-PARAM\n", parseConfigResponse("703\nUnknown CGI-PARAM\n")),
    /CGI 703/,
  );
  assert.throws(() => assertCgiMutationSuccess(200, "", undefined), /empty|unparseable/i);
});

async function runProbeSetCli(port: number, extraEnv: NodeJS.ProcessEnv = {}): Promise<number> {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      path.join(repoRoot, "src/index.ts"),
      "probe",
      "set",
      "--property",
      "Flicker",
      "--value",
      "50Hz",
      "--host",
      "127.0.0.1",
      "--confirm",
      "--timeout",
      "500",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv, MIVUE_HTTP_PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const [code] = await once(child, "exit") as [number | null, NodeJS.Signals | null];
  return code ?? 1;
}

test("CLI exits non-zero on HTTP 404", async (context) => {
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      socket.end("HTTP/1.0 404 Not Found\r\nCONTENT-LENGTH: 0\r\n\r\n");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");
  assert.notEqual(await runProbeSetCli(address.port), 0);
});

test("CLI exits non-zero on CGI 703", async (context) => {
  const body = "703\nUnknown CGI-PARAM\n";
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      socket.end(`HTTP/1.0 200 OK\r\nCONTENT-LENGTH: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");
  assert.notEqual(await runProbeSetCli(address.port), 0);
});

test("CLI exits zero on 0 OK", async (context) => {
  const body = "0\nOK\n";
  const server = net.createServer((socket) => {
    socket.once("data", () => {
      socket.end(`HTTP/1.0 200 OK\r\nCONTENT-LENGTH: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");
  assert.equal(await runProbeSetCli(address.port), 0);
});

test("CLI dry-run does not open TCP", async () => {
  let hits = 0;
  const server = net.createServer(() => {
    hits += 1;
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      path.join(repoRoot, "src/index.ts"),
      "probe",
      "set",
      "--property",
      "Flicker",
      "--value",
      "50Hz",
      "--host",
      "127.0.0.1",
      "--dry-run",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, MIVUE_HTTP_PORT: String(address.port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const [code] = await once(child, "exit") as [number | null, NodeJS.Signals | null];
  server.close();
  assert.equal(code, 0);
  assert.equal(hits, 0);
});
