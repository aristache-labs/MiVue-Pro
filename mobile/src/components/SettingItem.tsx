import React, { memo, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';

interface SettingItemProps {
  label: string;
  value?: string | number | boolean;
  type: 'toggle' | 'select' | 'info' | 'button';
  description?: string;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  icon?: string;
}

export const SettingItem = memo<SettingItemProps>(({
  label,
  value,
  type,
  description,
  onPress,
  onValueChange,
  disabled = false,
  icon,
}) => {
  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      onPress();
    }
  }, [disabled, onPress]);

  const handleToggle = useCallback((newValue: boolean) => {
    if (!disabled && onValueChange) {
      onValueChange(newValue);
    }
  }, [disabled, onValueChange]);

  const renderValue = () => {
    switch (type) {
      case 'toggle':
        return (
          <Switch
            value={value as boolean}
            onValueChange={handleToggle}
            disabled={disabled}
            trackColor={{ false: '#e0e0e0', true: '#34C759' }}
            thumbColor="#fff"
            ios_backgroundColor="#e0e0e0"
            accessibilityLabel={`${label} toggle`}
            accessibilityRole="switch"
            accessibilityState={{ disabled, checked: value as boolean }}
          />
        );
      
      case 'select':
      case 'button':
        return (
          <View style={styles.valueContainer}>
            {value !== undefined && (
              <Text style={[styles.valueText, disabled && styles.disabledText]}>
                {value}
              </Text>
            )}
            <Text style={[styles.chevron, disabled && styles.disabledText]}>›</Text>
          </View>
        );
      
      case 'info':
        return value !== undefined ? (
          <Text style={[styles.valueText, disabled && styles.disabledText]}>
            {value}
          </Text>
        ) : null;
      
      default:
        return null;
    }
  };

  const Container = type === 'toggle' || type === 'info' ? View : TouchableOpacity;
  const containerProps = type === 'toggle' || type === 'info' 
    ? {} 
    : {
        onPress: handlePress,
        disabled,
        activeOpacity: 0.7,
        accessibilityRole: 'button' as const,
        accessibilityLabel: label,
        accessibilityState: { disabled },
        accessibilityHint: description,
      };

  return (
    <Container 
      style={[styles.container, disabled && styles.containerDisabled]} 
      {...containerProps}
    >
      <View style={styles.leftContent}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <View style={styles.textContainer}>
          <Text style={[styles.label, disabled && styles.disabledText]}>
            {label}
          </Text>
          {description && (
            <Text style={[styles.description, disabled && styles.disabledText]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {renderValue()}
    </Container>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal rendering
  return (
    prevProps.label === nextProps.label &&
    prevProps.value === nextProps.value &&
    prevProps.type === nextProps.type &&
    prevProps.description === nextProps.description &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.icon === nextProps.icon &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onValueChange === nextProps.onValueChange
  );
});

SettingItem.displayName = 'SettingItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    minHeight: 56,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    lineHeight: 18,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    color: '#666',
    marginRight: 4,
  },
  chevron: {
    fontSize: 24,
    color: '#999',
    fontWeight: '300',
  },
  disabledText: {
    color: '#999',
  },
});
