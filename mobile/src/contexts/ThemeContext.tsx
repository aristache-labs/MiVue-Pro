import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme as useThemeHook } from '../hooks/useTheme';
import type { Theme, ThemeName } from '../theme';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  isDark: boolean;
  setTheme: (theme: ThemeName) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeValue = useThemeHook();

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
