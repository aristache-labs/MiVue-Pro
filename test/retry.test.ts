import assert from "node:assert/strict";
import test from "node:test";
import { retry } from "../src/utils/retry.js";

test("retry returns after a transient failure", async () => {
  let attempts = 0;
  const result = await retry(
    async () => {
      attempts += 1;
      if (attempts < 2) throw new Error("transient");
      return "ok";
    },
    { attempts: 3, initialDelayMs: 0, maxDelayMs: 0 },
  );
  assert.equal(result, "ok");
  assert.equal(attempts, 2);
});

test("retry stops when shouldRetry rejects the error", async () => {
  let attempts = 0;
  await assert.rejects(
    retry(
      async () => {
        attempts += 1;
        throw new Error("fatal");
      },
      { attempts: 3, initialDelayMs: 0, maxDelayMs: 0, shouldRetry: () => false },
    ),
    /fatal/,
  );
  assert.equal(attempts, 1);
});
