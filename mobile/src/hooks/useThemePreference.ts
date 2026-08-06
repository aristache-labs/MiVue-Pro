import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@laneory_theme_preference';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Hook that provides the effective theme (light/dark) based on user preference.
 * Returns only the resolved theme, not the full theme object.
 */
export function useThemePreference(): ResolvedTheme {
  const systemColorScheme = useRNColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');

  // Load theme preference from storage
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        setThemeMode(stored);
      }
    });

    // Listen for storage changes (from ThemeContext)
    const interval = setInterval(async () => {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
        setThemeMode(stored);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Resolve theme based on mode
  if (themeMode === 'auto') {
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }
  
  return themeMode;
}
