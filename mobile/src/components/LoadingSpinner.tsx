import React, { memo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(({ 
  size = 'large',
  color,
  message,
  fullScreen = false,
}) => {
  const { theme } = useTheme();
  const spinnerColor = color ?? theme.colors.brand;

  const containerStyle = fullScreen 
    ? [styles.fullScreenContainer, { backgroundColor: theme.colors.bg }]
    : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator 
        size={size} 
        color={spinnerColor}
        accessibilityLabel="Loading"
      />
      {message && (
        <Text style={[styles.message, { color: theme.colors.textMuted }]}>
          {message}
        </Text>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.size === nextProps.size &&
    prevProps.color === nextProps.color &&
    prevProps.message === nextProps.message &&
    prevProps.fullScreen === nextProps.fullScreen
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
});
