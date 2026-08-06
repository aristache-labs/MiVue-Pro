import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { Camera } from '../types';

interface CameraCardProps {
  camera: Camera;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPress: (camera: Camera) => void;
}

export const CameraCard = memo<CameraCardProps>(({ camera, isSelected, onSelect, onPress }) => {
  const { theme } = useTheme();

  const handleSelect = useCallback(() => {
    onSelect(camera.id);
  }, [camera.id, onSelect]);

  const handlePress = useCallback(() => {
    onPress(camera);
  }, [camera, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: isSelected
            ? theme.colors.brand
            : theme.colors.border,
        },
        isSelected && {
          backgroundColor: theme.colors.brandSoft,
        },
        theme.shadows.base,
      ]}
      onPress={handlePress}
      onLongPress={handleSelect}
      activeOpacity={0.7}
      accessibilityLabel={`Camera ${camera.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityHint="Tap to view details, long press to select"
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {camera.name}
        </Text>
        {isSelected && (
          <View style={[styles.badge, { backgroundColor: theme.colors.brand }]}>
            <Text style={[styles.badgeText, { color: theme.colors.onBrand }]}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.model, { color: theme.colors.textMuted }]}>{camera.model}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  (camera as any).status === 'connected'
                    ? theme.colors.success
                    : (camera as any).status === 'connecting'
                    ? theme.colors.warn
                    : theme.colors.textFaint,
              },
            ]}
          />
          <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>
            {(camera as any).status === 'connected' && 'Connected'}
            {(camera as any).status === 'connecting' && 'Connecting...'}
            {(camera as any).status === 'disconnected' && 'Disconnected'}
            {(camera as any).status === 'error' && 'Error'}
          </Text>
        </View>
      </View>

      {(camera as any).ipAddress && (
        <Text style={[styles.ip, { color: theme.colors.textFaint }]}>{(camera as any).ipAddress}</Text>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.camera.id === nextProps.camera.id &&
    prevProps.camera.name === nextProps.camera.name &&
    (prevProps.camera as any).status === (nextProps.camera as any).status &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onPress === nextProps.onPress
  );
});

CameraCard.displayName = 'CameraCard';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  info: {
    marginBottom: 4,
  },
  model: {
    fontSize: 14,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
  },
  ip: {
    fontSize: 12,
    marginTop: 4,
  },
});
