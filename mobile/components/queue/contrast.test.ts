import assert from "node:assert/strict";
import test from "node:test";

import { CONTRAST_NORMAL_TEXT, contrastRatio } from "../contrast";

/** Solid tokens mirrored from constants/Theme.ts (avoid importing RN). */
const light = {
  bg: "#eef2f5",
  surface: "#f8fafc",
  text: "#0f1720",
  textMuted: "#5b6b7a",
  brand: "#0d9488",
  brandSoft: "#d9f3ef",
} as const;

const dark = {
  bg: "#0b1220",
  surface: "#121a28",
  text: "#e8eef4",
  textMuted: "#94a3b8",
} as const;

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

test("brand on brandSoft meets large-text threshold", () => {
  const ratio = contrastRatio(light.brand, light.brandSoft);
  assert.ok(ratio !== undefined && ratio >= 3, `brand/brandSoft=${ratio}`);
});
