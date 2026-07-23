import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("Local never shows camera lastError / FetchTransport chrome", () => {
  const src = readFileSync(join(__dirname, "../../app/(tabs)/local.tsx"), "utf8");
  assert.equal(src.includes("lastError"), false);
  assert.equal(src.includes("FetchTransport"), false);
  assert.match(src, /categoryFromLocalName/);
  assert.match(src, /local-category-row/);
});

test("Queue shows friendly banner only with active queue work", () => {
  const src = readFileSync(join(__dirname, "../../app/(tabs)/two.tsx"), "utf8");
  assert.match(src, /friendlyConnectionError/);
  assert.match(src, /hasQueueWork/);
  assert.match(src, /queueErrorBanner/);
  assert.match(src, /styles\.banner/);
  assert.equal(src.includes("{lastError ? <Text"), false);
});
