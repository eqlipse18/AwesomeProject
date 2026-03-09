/**
 * useSwipeGesture Hook - Enhanced Version
 *
 * Improvements:
 * - Vertical swipe detection for superlike
 * - Better velocity handling
 * - Improved gesture thresholds
 * - Smoother animations
 */

import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

/**
 * Custom Pan Gesture for Cards
 *
 * Supports:
 * - Horizontal swipes: left (pass) / right (like)
 * - Vertical swipes: upward (superlike)
 * - Velocity-based detection
 * - Distance-based detection
 */
export function useSwipeGesture({
  swipeThreshold,
  velocityThreshold,
  screenWidth,
  screenHeight,
  verticalFriction = 0.2,
  onSwipeComplete,
  disabled = false,
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const velocityY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate(event => {
      'worklet';
      translateX.value = event.translationX;
      // Apply vertical friction to prevent over-scrolling
      translateY.value = event.translationY * verticalFriction;
      velocityY.value = event.velocityY;
    })
    .onEnd(event => {
      'worklet';
      const absTranslationX = Math.abs(event.translationX);
      const absTranslationY = Math.abs(event.translationY);
      const absVelocityX = Math.abs(event.velocityX);
      const absVelocityY = Math.abs(event.velocityY);

      let direction = null;
      let targetX = 0;
      let targetY = 0;

      // ── 1. Horizontal Swipes (Left/Right) ──
      if (
        absTranslationX > swipeThreshold ||
        absVelocityX > velocityThreshold
      ) {
        // Only trigger horizontal if X movement is dominant
        if (absTranslationX > absTranslationY * 1.2) {
          direction = event.translationX > 0 ? 'right' : 'left';
          targetX =
            direction === 'right' ? screenWidth * 1.5 : -screenWidth * 1.5;
          targetY = 0;
        }
      }

      // ── 2. Vertical Swipes (Up for Superlike) ──
      // Only accept upward swipes, require more distance/velocity
      if (!direction && event.translationY < 0) {
        const superlikeThreshold = swipeThreshold * 1.5; // Higher threshold for superlike
        const superlikeVelocityThreshold = velocityThreshold * 1.2;

        if (
          absTranslationY > superlikeThreshold ||
          absVelocityY > superlikeVelocityThreshold
        ) {
          // Only if Y is dominant movement
          if (absTranslationY > absTranslationX * 1.2) {
            direction = 'up';
            targetX = 0;
            targetY = -screenHeight * 1.2;
          }
        }
      }

      // ── 3. No swipe detected — snap back to center ──
      if (!direction) {
        translateX.value = withSpring(0, {
          stiffness: 300,
          damping: 25,
          mass: 0.1,
        });
        translateY.value = withSpring(0, {
          stiffness: 300,
          damping: 25,
          mass: 0.1,
        });
        return;
      }

      // ── 4. Execute swipe animation ──
      const duration = 250;

      if (direction === 'right' || direction === 'left') {
        translateX.value = withTiming(targetX, { duration }, () => {
          'worklet';
          runOnJS(onSwipeComplete)(direction);
        });
        translateY.value = withSpring(0);
      } else if (direction === 'up') {
        // Superlike - animate both X and Y
        translateY.value = withTiming(targetY, { duration }, () => {
          'worklet';
          runOnJS(onSwipeComplete)(direction);
        });
        // Keep X centered
        translateX.value = withSpring(0, {
          stiffness: 200,
          damping: 20,
        });
      }
    });

  return {
    gesture,
    translateX,
    translateY,
    velocityY,
  };
}

export function triggerProgrammaticSwipe() {
  // Placeholder for future use
}
