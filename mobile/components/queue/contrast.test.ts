import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { CONTRAST_NORMAL_TEXT, contrastRatio } from "../contrast";

/** Solid tokens mirrored from constants/Theme.ts (avoid importing RN). */
const light = {
  bg: "#eef2f5",
  surface: "#f8fafc",
  surfaceElevated: "#ffffff",
  text: "#0f1720",
  textMuted: "#5b6b7a",
  brand: "#0f766e",
  brandSoft: "#d9f3ef",
  onBrand: "#ffffff",
} as const;

const dark = {
  bg: "#0b1220",
  surface: "#121a28",
  text: "#e8eef4",
  textMuted: "#94a3b8",
  brand: "#14b8a6",
} as const;

test("Light Mode brand meets 4.5:1 on white / elevated surface", () => {
  const onWhite = contrastRatio(light.brand, light.surfaceElevated);
  const onBg = contrastRatio(light.brand, light.bg);
  assert.ok(onWhite !== undefined && onWhite >= CONTRAST_NORMAL_TEXT, `brand/white=${onWhite}`);
  assert.ok(onBg !== undefined && onBg >= CONTRAST_NORMAL_TEXT, `brand/bg=${onBg}`);
  assert.equal(light.brand, "#0f766e");
});

test("Dark Mode brand token is unchanged", () => {
  assert.equal(dark.brand, "#14b8a6");
});

test("onBrand text meets 4.5:1 on Light brand fill", () => {
  const ratio = contrastRatio(light.onBrand, light.brand);
  assert.ok(ratio !== undefined && ratio >= CONTRAST_NORMAL_TEXT, `onBrand/brand=${ratio}`);
});

test("secondary textMuted meets 4.5:1 on bg (light + dark)", () => {
  const lightRatio = contrastRatio(light.textMuted, light.bg);
  const darkRatio = contrastRatio(dark.textMuted, dark.bg);
  assert.ok(lightRatio !== undefined && lightRatio >= CONTRAST_NORMAL_TEXT, `light=${lightRatio}`);
  assert.ok(darkRatio !== undefined && darkRatio >= CONTRAST_NORMAL_TEXT, `dark=${darkRatio}`);
});

test("primary text meets 4.5:1 on surface (light + dark)", () => {
  const lightRatio = contrastRatio(light.text, light.surface);
  const darkRatio = contrastRatio(dark.text, dark.surface);
  assert.ok(lightRatio !== undefined && lightRatio >= CONTRAST_NORMAL_TEXT, `light=${lightRatio}`);
  assert.ok(darkRatio !== undefined && darkRatio >= CONTRAST_NORMAL_TEXT, `dark=${darkRatio}`);
});

test("Theme.ts light brand is #0f766e and dark brand stays #14b8a6", () => {
  const src = readFileSync(join(__dirname, "../../constants/Theme.ts"), "utf8");
  const lightBlock = src.slice(src.indexOf("const light"), src.indexOf("const dark"));
  const darkBlock = src.slice(src.indexOf("const dark"), src.indexOf("CATEGORY_COLORS"));
  assert.match(lightBlock, /brand:\s*"#0f766e"/);
  assert.match(darkBlock, /brand:\s*"#14b8a6"/);
  assert.match(lightBlock, /selectionFill:\s*"rgba\(15, 118, 110, 0\.07\)"/);
  assert.doesNotMatch(lightBlock, /brand:\s*"#0d9488"/);
});
