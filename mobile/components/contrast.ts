/** Relative luminance + WCAG contrast helpers (no extra deps). */

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Parse `#rgb` / `#rrggbb` (ignores alpha in `rgba()` — pass solid hex). */
export function parseHexColor(hex: string): { r: number; g: number; b: number } | undefined {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu.exec(hex.trim());
  if (!m) return undefined;
  let h = m[1]!;
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

export function relativeLuminance(hex: string): number | undefined {
  const rgb = parseHexColor(hex);
  if (!rgb) return undefined;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio between two solid hex colors. */
export function contrastRatio(foreground: string, background: string): number | undefined {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 === undefined || l2 === undefined) return undefined;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const CONTRAST_NORMAL_TEXT = 4.5;
export const CONTRAST_LARGE_TEXT = 3;
