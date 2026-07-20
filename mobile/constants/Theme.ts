import { useColorScheme } from "@/components/useColorScheme";

/**
 * Laneory design tokens — single source of truth for the app's premium look.
 * Palette is deliberately original (blue/coral/violet/amber), not a clone of any
 * camera-brand UI. See docs/mobile/phase3-ui.md for rationale.
 */

export type ColorScheme = "light" | "dark";

export interface ThemeColors {
  readonly bg: string;
  readonly surface: string;
  readonly surfaceMuted: string;
  readonly border: string;
  readonly text: string;
  readonly textMuted: string;
  readonly textFaint: string;
  readonly brand: string;
  readonly brandPressed: string;
  readonly brandSoft: string;
  readonly onBrand: string;
  readonly live: string;
  readonly liveSoft: string;
  readonly demo: string;
  readonly demoSoft: string;
  readonly success: string;
  readonly successSoft: string;
  readonly danger: string;
  readonly dangerSoft: string;
}

const light: ThemeColors = {
  bg: "#F6F7F9",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF1F4",
  border: "#E1E5EA",
  text: "#10141A",
  textMuted: "#5B6472",
  textFaint: "#8A93A1",
  brand: "#3D8BFD",
  brandPressed: "#2E6FE0",
  brandSoft: "#E5EFFF",
  onBrand: "#FFFFFF",
  live: "#FF5A36",
  liveSoft: "#FFE7E0",
  demo: "#C97A00",
  demoSoft: "#FFF1D8",
  success: "#1AA152",
  successSoft: "#DFF6E8",
  danger: "#D92D20",
  dangerSoft: "#FCE5E2",
};

const dark: ThemeColors = {
  bg: "#0A0D12",
  surface: "#12161D",
  surfaceMuted: "#1B2028",
  border: "#262C36",
  text: "#F2F4F7",
  textMuted: "#A7AFBC",
  textFaint: "#6B7280",
  brand: "#5B9DFF",
  brandPressed: "#3D8BFD",
  brandSoft: "#1B2B45",
  onBrand: "#08111F",
  live: "#FF7256",
  liveSoft: "#3A1D16",
  demo: "#F5A623",
  demoSoft: "#3A2A0E",
  success: "#3DD675",
  successSoft: "#0F2A18",
  danger: "#F0564A",
  dangerSoft: "#341412",
};

export const CATEGORY_COLORS = {
  normal: { light: "#3D8BFD", dark: "#5B9DFF" },
  event: { light: "#FF5A36", dark: "#FF7256" },
  parking: { light: "#7C5CFC", dark: "#9C87FF" },
  photo: { light: "#C97A00", dark: "#F5A623" },
  unknown: { light: "#6B7280", dark: "#8A93A1" },
} as const;

export const Palette: Record<ColorScheme, ThemeColors> = { light, dark };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Type = {
  caption: { fontSize: 12, lineHeight: 16 },
  body: { fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  largeTitle: { fontSize: 26, lineHeight: 32, fontWeight: "800" as const },
} as const;

export const HitSlop44 = { top: 8, bottom: 8, left: 8, right: 8 };

export function useAppTheme() {
  const scheme = useColorScheme() as ColorScheme;
  return {
    scheme,
    colors: Palette[scheme],
    spacing: Spacing,
    radius: Radius,
    type: Type,
  };
}
