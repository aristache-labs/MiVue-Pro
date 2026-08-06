import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@laneory_theme_preference';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Lightweight theme resolver used by the app-wide palette (constants/Theme).
 * Reads the persisted preference + system scheme. This hook is intentionally
 * decoupled from ThemeContext to avoid a circular import chain.
 */
export function useThemePreference(): ResolvedTheme {
  const systemColorScheme = useRNColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (active && stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
          setThemeMode(stored);
        }
      } catch {
        // ignore storage errors
      }
    };

    void load();

    // Re-check shortly after mount + on foreground, to pick up
    // preference changes made elsewhere in the app.
    const interval = setInterval(load, 800);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (themeMode === 'auto') {
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }

  return themeMode;
}
