import { useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Hook for press scale animation
 * Returns animated style and press handlers
 */
export function usePressAnimation(scaleValue = 0.98) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut,
  };
}
