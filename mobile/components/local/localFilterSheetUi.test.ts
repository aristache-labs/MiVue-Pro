import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("Local Filters uses StaticBackdropSheet like Camera", () => {
  const src = readFileSync(join(__dirname, "LocalFilterSheet.tsx"), "utf8");
  assert.match(src, /StaticBackdropSheet/);
  assert.equal(src.includes('animationType="slide"'), false);
  assert.match(src, /local-filter-scrim/);
  assert.match(src, /local-filter-sheet/);
});

test("Local Filters header is Reset / Filters / X", () => {
  const src = readFileSync(join(__dirname, "LocalFilterSheet.tsx"), "utf8");
  assert.match(src, /Reset filters/);
  assert.match(src, /Close filters/);
  assert.match(src, /SheetHeader/);
  assert.match(src, /title="Filters"/);
  assert.equal(src.includes(">Close<"), false);
});
