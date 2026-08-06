import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeName } from '../theme';

export const ThemeSelector = memo(() => {
  const { theme, themeName, setTheme } = useTheme();

  const options: { id: ThemeName; label: string; icon: string }[] = [
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'auto', label: 'System', icon: '⚙️' },
  ];

  const handleSelect = useCallback((id: ThemeName) => {
    setTheme(id);
  }, [setTheme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceElevated }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Appearance
      </Text>
      
      <View style={styles.optionsRow}>
        {options.map((option) => {
          const isSelected = themeName === option.id;
          
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isSelected 
                    ? theme.colors.brand 
                    : theme.colors.surfaceMuted,
                  borderColor: isSelected 
                    ? theme.colors.brand 
                    : theme.colors.border,
                },
              ]}
              onPress={() => handleSelect(option.id)}
              activeOpacity={0.7}
              accessibilityLabel={`${option.label} theme option`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.icon}>{option.icon}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected 
                      ? theme.colors.onBrand 
                      : theme.colors.text,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

ThemeSelector.displayName = 'ThemeSelector';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
