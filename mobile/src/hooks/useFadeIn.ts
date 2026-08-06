import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Hook for fade-in animation when component mounts
 */
export function useFadeIn(duration = 300, delay = 0) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  const animatedStyle = {
    opacity: fadeAnim,
  };

  return animatedStyle;
}
