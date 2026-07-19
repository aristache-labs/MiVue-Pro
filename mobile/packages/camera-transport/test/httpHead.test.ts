import assert from "node:assert/strict";
import test from "node:test";
import { parseHttpHead, tryParseHttpHead } from "../src/httpHead";

test("parseHttpHead reads status and content-length", () => {
  const raw = new TextEncoder().encode(
    "HTTP/1.0 200 OK\r\nContent-Length: 12\r\nContent-Type: text/plain\r\n\r\nhello world!",
  );
  const head = parseHttpHead(raw);
  assert.equal(head.statusCode, 200);
  assert.equal(head.contentLength, 12);
  assert.equal(head.headers["content-type"], "text/plain");
  assert.equal(new TextDecoder().decode(raw.subarray(head.bodyOffset)), "hello world!");
});

test("tryParseHttpHead returns undefined until terminator arrives", () => {
  const partial = new TextEncoder().encode("HTTP/1.0 200 OK\r\nContent-Length: 1\r\n");
  assert.equal(tryParseHttpHead(partial), undefined);
});
