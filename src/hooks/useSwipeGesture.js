import { useRef } from 'react';
import { PanResponder, Dimensions } from 'react-native';

const SWIPE_THRESHOLD = 80;

/**
 * Custom hook for detecting left and right swipes on elements (e.g. WebView container).
 * Swipe Right (left-to-right) -> Navigate Back
 * Swipe Left (right-to-left) -> Navigate Forward
 */
export const useSwipeGesture = (onSwipeLeft, onSwipeRight) => {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        // Respond only to horizontal swipe movements that exceed vertical movements
        return Math.abs(dx) > 20 && Math.abs(dy) < 15;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        if (dx > SWIPE_THRESHOLD) {
          // Left-to-right swipe -> Back
          onSwipeRight && onSwipeRight();
        } else if (dx < -SWIPE_THRESHOLD) {
          // Right-to-left swipe -> Forward
          onSwipeLeft && onSwipeLeft();
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
};
