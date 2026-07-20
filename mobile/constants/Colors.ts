import { Palette } from "./Theme";

/**
 * Consumed by components/Themed.tsx and the tab navigator.
 * Sourced from constants/Theme.ts (web CSS parity).
 */
export default {
  light: {
    text: Palette.light.text,
    background: Palette.light.bg,
    tint: Palette.light.brand,
    tabIconDefault: Palette.light.textFaint,
    tabIconSelected: Palette.light.brand,
  },
  dark: {
    text: Palette.dark.text,
    background: Palette.dark.bg,
    tint: Palette.dark.brand,
    tabIconDefault: Palette.dark.textFaint,
    tabIconSelected: Palette.dark.brand,
  },
};
