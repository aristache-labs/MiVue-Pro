/**
 * Laneory Design System — unified wrapper around constants/Theme.ts
 * Extends the original palette with structured design tokens (typography, spacing, shadows, motion)
 * while preserving the exact original color values.
 */

import { Palette } from '@/constants/Theme';

export type ThemeName = 'light' | 'dark' | 'auto';

export type ColorPalette = {
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
  readonly onDanger: string;
  readonly warn: string;
  readonly warnSoft: string;
};

export interface Typography {
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
}

export interface Spacing {
  xs: number;
  sm: number;
  base: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
}

export interface Shadows {
  none: object;
  sm: object;
  base: object;
  md: object;
  lg: object;
}

export interface Motion {
  duration: {
    fast: number;
    normal: number;
    slow: number;
  };
  easing: {
    default: string;
    in: string;
    out: string;
    inOut: string;
  };
}

export interface Theme {
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  radius: {
    sm: number;
    base: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: Shadows;
  motion: Motion;
  breakpoints: {
    sm: number;
    md: number;
    lg: number;
  };
  zIndex: {
    base: number;
    dropdown: number;
    modal: number;
    toast: number;
  };
}

// Shared non-color tokens
const sharedTokens = {
  typography: {
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    base: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  radius: {
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    none: {},
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    base: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  motion: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 350,
    },
    easing: {
      default: 'ease',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out',
    },
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    modal: 2000,
    toast: 3000,
  },
};

// Light theme - uses exact colors from Palette.light
export const lightTheme: Theme = {
  colors: { ...Palette.light },
  ...sharedTokens,
};

// Dark theme - uses exact colors from Palette.dark
export const darkTheme: Theme = {
  colors: { ...Palette.dark },
  ...sharedTokens,
};
