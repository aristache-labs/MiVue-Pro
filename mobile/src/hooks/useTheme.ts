import { useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type Theme, type ThemeName } from '../theme';

const THEME_STORAGE_KEY = '@laneory_theme_preference';

interface UseThemeResult {
  theme: Theme;
  themeName: ThemeName;
  isDark: boolean;
  setTheme: (theme: ThemeName) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export function useTheme(): UseThemeResult {
  const systemColorScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>('auto');

  // Load theme preference from storage on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
          setThemeName(stored as ThemeName);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };

    loadThemePreference();
    
    // Also set up polling for settings changes
    const interval = setInterval(loadThemePreference, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (themeName === 'auto') {
      return systemColorScheme === 'dark';
    }
    return themeName === 'dark';
  }, [themeName, systemColorScheme]);

  // Get the current theme object
  const theme = useMemo(() => {
    return isDark ? darkTheme : lightTheme;
  }, [isDark]);

  // Memoized theme setter
  const setTheme = useCallback(async (newTheme: ThemeName) => {
    try {
      setThemeName(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  // Memoized theme toggle (only works when not in auto mode)
  const toggleTheme = useCallback(async () => {
    const newTheme = themeName === 'dark' ? 'light' : 'dark';
    await setTheme(newTheme);
  }, [themeName, setTheme]);

  // Memoize return object
  return useMemo(() => ({
    theme,
    themeName,
    isDark,
    setTheme,
    toggleTheme,
  }), [theme, themeName, isDark, setTheme, toggleTheme]);
}
