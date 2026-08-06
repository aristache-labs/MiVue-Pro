import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { CameraStatus } from '../types';

interface ConnectionStatusProps {
  status: CameraStatus;
  cameraName?: string;
  compact?: boolean;
}

export const ConnectionStatus = memo<ConnectionStatusProps>(({
  status,
  cameraName,
  compact = false,
}) => {
  const { theme } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: theme.colors.success,
          icon: '●',
          text: 'Connected',
          backgroundColor: theme.colors.successSoft,
        };
      case 'connecting':
        return {
          color: theme.colors.warn,
          icon: '●',
          text: 'Connecting...',
          backgroundColor: theme.colors.warnSoft,
        };
      case 'disconnected':
        return {
          color: theme.colors.textMuted,
          icon: '●',
          text: 'Disconnected',
          backgroundColor: theme.colors.surfaceMuted,
        };
      case 'error':
        return {
          color: theme.colors.danger,
          icon: '●',
          text: 'Connection Error',
          backgroundColor: theme.colors.dangerSoft,
        };
      default:
        return {
          color: theme.colors.textMuted,
          icon: '●',
          text: 'Unknown',
          backgroundColor: theme.colors.surfaceMuted,
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <View 
        style={[styles.compactContainer, { backgroundColor: config.backgroundColor }]}
        accessibilityLabel={`Connection status: ${config.text}`}
        accessibilityRole="text"
      >
        <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
        <Text style={[styles.compactText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, { backgroundColor: config.backgroundColor }]}
      accessibilityLabel={`Connection status: ${config.text}${cameraName ? ` to ${cameraName}` : ''}`}
      accessibilityRole="text"
    >
      <View style={styles.statusRow}>
        <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.text}
          </Text>
          {cameraName && (
            <Text style={[styles.cameraName, { color: theme.colors.textMuted }]}>
              {cameraName}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.status === nextProps.status &&
    prevProps.cameraName === nextProps.cameraName &&
    prevProps.compact === nextProps.compact
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 12,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  compactText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cameraName: {
    fontSize: 14,
    marginTop: 2,
  },
});
