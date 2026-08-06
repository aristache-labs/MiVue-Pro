import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Camera } from '../types';

interface CameraCardProps {
  camera: Camera;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPress?: (id: string) => void;
}

export const CameraCard = memo<CameraCardProps>(({ 
  camera, 
  isSelected, 
  onSelect,
  onPress,
}) => {
  // Memoize press handlers to prevent re-creating functions on every render
  const handleSelect = useCallback(() => {
    onSelect(camera.id);
  }, [camera.id, onSelect]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(camera.id);
    }
  }, [camera.id, onPress]);

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={handlePress || handleSelect}
      activeOpacity={0.7}
      accessibilityLabel={`Camera ${camera.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{camera.name}</Text>
        {isSelected && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Connected</Text>
          </View>
        )}
      </View>
      
      <View style={styles.details}>
        <Text style={styles.label}>Model:</Text>
        <Text style={styles.value}>{camera.model}</Text>
      </View>
      
      {camera.firmware && (
        <View style={styles.details}>
          <Text style={styles.label}>Firmware:</Text>
          <Text style={styles.value}>{camera.firmware}</Text>
        </View>
      )}
      
      <View style={styles.details}>
        <Text style={styles.label}>IP:</Text>
        <Text style={styles.value}>{camera.ip}</Text>
      </View>
      
      {camera.ssid && (
        <View style={styles.details}>
          <Text style={styles.label}>SSID:</Text>
          <Text style={styles.value}>{camera.ssid}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo optimization
  // Only re-render if these specific props change
  return (
    prevProps.camera.id === nextProps.camera.id &&
    prevProps.camera.name === nextProps.camera.name &&
    prevProps.camera.model === nextProps.camera.model &&
    prevProps.camera.firmware === nextProps.camera.firmware &&
    prevProps.camera.ip === nextProps.camera.ip &&
    prevProps.camera.ssid === nextProps.camera.ssid &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onPress === nextProps.onPress
  );
});

CameraCard.displayName = 'CameraCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#666',
    width: 80,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});
