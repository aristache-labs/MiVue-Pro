import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("safeRouterBack", () => {
  const src = readFileSync(join(__dirname, "safeRouterBack.ts"), "utf8");
  const player = readFileSync(join(__dirname, "../../app/player.tsx"), "utf8");
  const selectCamera = readFileSync(join(__dirname, "../../app/onboarding/select-camera.tsx"), "utf8");
  const rootLayout = readFileSync(join(__dirname, "../../app/_layout.tsx"), "utf8");

  it("checks canDismiss/canGoBack before falling back to replace", () => {
    assert.match(src, /router\.canDismiss\(\)/);
    assert.match(src, /router\.canGoBack\(\)/);
    assert.match(src, /router\.dismiss\(\)/);
    assert.match(src, /router\.back\(\)/);
    assert.match(src, /router\.replace/);
  });

  it("Player and settings-entry onboarding use safeRouterBack instead of bare back", () => {
    assert.match(player, /safeRouterBack/);
    assert.doesNotMatch(player, /router\.back\(\)/);
    assert.match(selectCamera, /safeRouterBack/);
    assert.doesNotMatch(selectCamera, /router\.back\(\)/);
  });

  it("root onboarding gate uses replace effect instead of focus Redirect", () => {
    assert.match(rootLayout, /router\.replace\("\/onboarding"/);
    assert.doesNotMatch(rootLayout, /<Redirect[\s>]/);
    assert.doesNotMatch(rootLayout, /\bRedirect\b.*from "expo-router"/);
  });
});
