import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: '#34C759',
          icon: '●',
          text: 'Connected',
          backgroundColor: '#E8F5E9',
        };
      case 'connecting':
        return {
          color: '#FF9500',
          icon: '●',
          text: 'Connecting...',
          backgroundColor: '#FFF3E0',
        };
      case 'disconnected':
        return {
          color: '#999',
          icon: '●',
          text: 'Disconnected',
          backgroundColor: '#F5F5F5',
        };
      case 'error':
        return {
          color: '#FF3B30',
          icon: '●',
          text: 'Connection Error',
          backgroundColor: '#FFEBEE',
        };
      default:
        return {
          color: '#999',
          icon: '●',
          text: 'Unknown',
          backgroundColor: '#F5F5F5',
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
            <Text style={styles.cameraName}>{cameraName}</Text>
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
    color: '#666',
    marginTop: 2,
  },
});
