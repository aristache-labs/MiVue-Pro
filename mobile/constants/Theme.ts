import { useColorScheme } from "@/components/useColorScheme";
import { useThemePreference } from "@/src/hooks/useThemePreference";

/**
 * Laneory design tokens — mapped 1:1 from web/styles.css (:root / [data-theme="dark"]).
 */

export type ColorScheme = "light" | "dark";

export interface ThemeColors {
  readonly bg: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly surfaceMuted: string;
  readonly border: string;
  readonly borderSoft: string;
  readonly text: string;
  readonly textMuted: string;
  readonly textFaint: string;
  readonly brand: string;
  readonly brandPressed: string;
  readonly brandStrong: string;
  readonly brandSoft: string;
  /** Selected library card fill — subtler than brandSoft in light mode. */
  readonly selectionFill: string;
  readonly onBrand: string;
  readonly live: string;
  readonly liveSoft: string;
  readonly demo: string;
  readonly demoSoft: string;
  readonly success: string;
  readonly successSoft: string;
  readonly danger: string;
  readonly dangerSoft: string;
  /** Text/icon on solid danger fill — WCAG contrast vs `danger`. */
  readonly onDanger: string;
  readonly warn: string;
  readonly warnSoft: string;
}

const light: ThemeColors = {
  bg: "#eef2f5",
  surface: "#f8fafc",
  surfaceElevated: "#ffffff",
  surfaceMuted: "#e4ebf1",
  border: "#d5dee7",
  borderSoft: "#e4ebf1",
  text: "#0f1720",
  textMuted: "#5b6b7a",
  textFaint: "#94a3b8",
  brand: "#0f766e",
  brandPressed: "#115e59",
  brandStrong: "#0f766e",
  brandSoft: "#d9f3ef",
  selectionFill: "rgba(15, 118, 110, 0.07)",
  onBrand: "#ffffff",
  live: "#FF5A36",
  liveSoft: "#FFE7E0",
  demo: "#8a6418",
  demoSoft: "#fff7e8",
  success: "#166534",
  successSoft: "#e8f5ec",
  danger: "#b42318",
  dangerSoft: "#fce5e2",
  onDanger: "#ffffff",
  warn: "#8a6418",
  warnSoft: "#fff7e8",
};

const dark: ThemeColors = {
  bg: "#0b1220",
  surface: "#121a28",
  surfaceElevated: "#182233",
  surfaceMuted: "#1c2738",
  border: "#243044",
  borderSoft: "#1c2738",
  text: "#e8eef4",
  textMuted: "#94a3b8",
  textFaint: "#64748b",
  brand: "#14b8a6",
  brandPressed: "#0d9488",
  brandStrong: "#2dd4bf",
  brandSoft: "rgba(20, 184, 166, 0.16)",
  selectionFill: "rgba(20, 184, 166, 0.16)",
  onBrand: "#042f2e",
  live: "#FF7256",
  liveSoft: "#3A1D16",
  demo: "#fbbf24",
  demoSoft: "rgba(250, 204, 21, 0.12)",
  success: "#4ade80",
  successSoft: "rgba(74, 222, 128, 0.14)",
  danger: "#f87171",
  dangerSoft: "rgba(248, 113, 113, 0.14)",
  onDanger: "#450a0a",
  warn: "#fbbf24",
  warnSoft: "rgba(250, 204, 21, 0.12)",
};

/** Category accents from web SD usage bars. */
export const CATEGORY_COLORS = {
  normal: { light: "#0f766e", dark: "#14b8a6" },
  event: { light: "#f59e0b", dark: "#f59e0b" },
  parking: { light: "#0ea5e9", dark: "#0ea5e9" },
  photo: { light: "#8b5cf6", dark: "#8b5cf6" },
  unknown: { light: "#5b6b7a", dark: "#64748b" },
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
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const Type = {
  font: "SourceSans3_400Regular",
  fontSemi: "SourceSans3_600SemiBold",
  fontBold: "SourceSans3_700Bold",
  mono: "IBMPlexMono_400Regular",
  monoMed: "IBMPlexMono_500Medium",
  caption: { fontSize: 12, lineHeight: 16, fontFamily: "SourceSans3_400Regular" },
  body: { fontSize: 14, lineHeight: 20, fontFamily: "SourceSans3_400Regular" },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontFamily: "SourceSans3_600SemiBold" },
  subtitle: { fontSize: 16, lineHeight: 22, fontFamily: "SourceSans3_600SemiBold" },
  title: { fontSize: 20, lineHeight: 26, fontFamily: "SourceSans3_700Bold" },
  largeTitle: { fontSize: 26, lineHeight: 32, fontFamily: "SourceSans3_700Bold" },
} as const;

export const HitSlop44 = { top: 8, bottom: 8, left: 8, right: 8 };

export function useAppTheme() {
  const scheme = useThemePreference();
  return {
    scheme,
    colors: Palette[scheme],
    spacing: Spacing,
    radius: Radius,
    type: Type,
  };
}
