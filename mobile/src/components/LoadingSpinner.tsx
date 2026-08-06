import React, { memo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(({ 
  size = 'large',
  color = '#007AFF',
  message,
  fullScreen = false,
}) => {
  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator 
        size={size} 
        color={color}
        accessibilityLabel="Loading"
      />
      {message && (
        <Text style={styles.message}>{message}</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
