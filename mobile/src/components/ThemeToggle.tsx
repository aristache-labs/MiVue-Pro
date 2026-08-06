import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAppTheme } from '@/constants/Theme';

/**
 * Animated light/dark theme toggle.
 * Matches the design language of the app: pill-shaped track with
 * a sliding knob, sun/moon icons, smooth transitions.
 */
export const ThemeToggle = memo(() => {
  const { isDark, themeName, setTheme } = useTheme();
  const { colors } = useAppTheme();

  const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isDark ? 1 : 0,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isDark, progress]);

  const knobTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 28],
  });

  const sunOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const moonOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const handleToggle = () => {
    // Toggle: if auto -> go to the opposite of current effective theme,
    // then alternate between light and dark. Persists via useTheme.
    const next = isDark ? 'light' : 'dark';
    void setTheme(next);
  };

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="switch"
      accessibilityLabel="Theme toggle"
      accessibilityState={{ checked: isDark }}
      accessibilityHint={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      hitSlop={8}
      style={({ pressed }) => [
        styles.track,
        {
          backgroundColor: isDark ? colors.brandStrong : colors.brandSoft,
          borderColor: isDark ? colors.border : colors.borderSoft,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Moon icon (visible in dark mode) */}
      <Animated.View
        style={[styles.iconLayer, styles.moonLayer, { opacity: moonOpacity }]}
        pointerEvents="none"
      >
        <Ionicons name="moon" size={17} color={colors.brand} />
      </Animated.View>

      {/* Sun icon (visible in light mode) */}
      <Animated.View
        style={[styles.iconLayer, styles.sunLayer, { opacity: sunOpacity }]}
        pointerEvents="none"
      >
        <Ionicons name="sunny" size={18} color={colors.warn} />
      </Animated.View>

      {/* Sliding knob */}
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: colors.surfaceElevated,
            transform: [{ translateX: knobTranslate }],
            shadowColor: colors.text,
          },
        ]}
        pointerEvents="none"
      />
    </Pressable>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

const styles = StyleSheet.create({
  track: {
    width: 56,
    height: 30,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    left: 0,
    top: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    position: 'absolute',
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonLayer: {
    left: 4,
    top: 0,
  },
  sunLayer: {
    right: 3,
    top: -1,
  },
});
