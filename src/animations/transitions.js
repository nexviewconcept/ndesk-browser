import { Animated } from 'react-native';

/**
 * Standard utility animations using React Native's highly reliable Animated API.
 * Ensures compatibility across all Expo platforms without requiring complex Babel configuration.
 */
export const animations = {
  /**
   * Slides a panel up or down using transform translateY.
   */
  slide: (value, toValue, duration = 300) => {
    return Animated.timing(value, {
      toValue,
      duration,
      useNativeDriver: true,
    });
  },

  /**
   * Fades an element in or out.
   */
  fade: (value, toValue, duration = 250) => {
    return Animated.timing(value, {
      toValue,
      duration,
      useNativeDriver: true,
    });
  }
};
