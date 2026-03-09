/**
 * SwipeableCard - Production Enhanced Version
 *
 * Improvements:
 * - Better rewind animation (smooth spring from current position)
 * - Superlike detection (upward swipe)
 * - Improved physics and edge case handling
 * - Better error boundaries and prop validation
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  withTiming,
  runOnJS,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useSwipeGesture } from './useSwipeGestureEnhanced';
import { useSwipeAnimation } from './useSwipeAnimationEnhanced';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * SwipeableCard Component
 *
 * Props:
 * - children: ReactNode — card content
 * - onSwipeComplete: (direction: 'left' | 'right' | 'up') => void
 * - swipeProgress: Animated.SharedValue<number> — for parent animation sync
 * - manualTrigger: Animated.SharedValue<number> — 0: idle, 1: right, -1: left, 2: up (superlike), 3: rewind
 * - swipeThreshold: number — distance before swipe completes
 * - velocityThreshold: number — speed before swipe completes
 * - maxRotation: number — max rotation degrees
 * - verticalFriction: number — vertical drag resistance
 * - animationConfig: object — spring config
 * - leftOverlay: ReactNode
 * - rightOverlay: ReactNode
 * - superlikeOverlay: ReactNode — for superlike
 * - disabled: boolean
 * - style: object
 */
function SwipeableCardComponent({
  children,
  onSwipeComplete,
  swipeProgress,
  manualTrigger,
  swipeThreshold = SCREEN_WIDTH * 0.3,
  velocityThreshold = 800,
  maxRotation = 15,
  verticalFriction = 0.2,
  animationConfig = {},
  leftOverlay,
  rightOverlay,
  superlikeOverlay,
  disabled = false,
  style,
}) {
  // Validate critical props
  if (!onSwipeComplete || typeof onSwipeComplete !== 'function') {
    console.warn(
      '[SwipeableCard] onSwipeComplete is required and must be a function',
    );
  }

  // Stable callback for swipe completion
  const handleSwipeComplete = useCallback(
    direction => {
      if (onSwipeComplete) {
        onSwipeComplete(direction);
      }
    },
    [onSwipeComplete],
  );

  // Create gesture and get shared values for X/Y translation
  const { gesture, translateX, translateY, velocityY } = useSwipeGesture({
    swipeThreshold,
    velocityThreshold,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    verticalFriction,
    onSwipeComplete: handleSwipeComplete,
    disabled,
  });

  // Sync local translateX to parent swipeProgress for next card animation
  useAnimatedReaction(
    () => translateX.value,
    currentX => {
      swipeProgress.value = currentX;
    },
  );

  // Listen for manual trigger (button-triggered swipes or rewind)
  useAnimatedReaction(
    () => manualTrigger.value,
    triggerValue => {
      if (triggerValue === 0) return;

      // Rewind animation (triggerValue === 3)
      if (triggerValue === 3) {
        // Spring smoothly from current position to center (0, 0)
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

      // Regular swipe animations (left/right/superlike)
      let targetX = 0;
      let targetY = 0;

      if (triggerValue === 1) {
        // Right swipe (like)
        targetX = SCREEN_WIDTH * 1.5;
        targetY = 0;
      } else if (triggerValue === -1) {
        // Left swipe (pass)
        targetX = -SCREEN_WIDTH * 1.5;
        targetY = 0;
      } else if (triggerValue === 2) {
        // Superlike (upward)
        targetX = 0;
        targetY = -SCREEN_HEIGHT * 1.2;
      }

      const duration = animationConfig?.programmaticTiming?.duration ?? 250;

      // Animate both X and Y together
      translateX.value = withTiming(targetX, { duration }, () => {
        'worklet';
        if (triggerValue === 1) {
          runOnJS(handleSwipeComplete)('right');
        } else if (triggerValue === -1) {
          runOnJS(handleSwipeComplete)('left');
        } else if (triggerValue === 2) {
          runOnJS(handleSwipeComplete)('up');
        }
      });

      if (triggerValue === 2) {
        // For superlike, animate Y simultaneously
        translateY.value = withTiming(targetY, { duration });
      }
    },
  );

  // Get animated styles for card and overlays
  const {
    animatedCardStyle,
    leftOverlayStyle,
    rightOverlayStyle,
    superlikeOverlayStyle,
  } = useSwipeAnimation({
    translateX,
    translateY,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    maxRotation,
    overlayConfig: animationConfig?.overlayConfig,
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.cardWrapper, style, animatedCardStyle]}>
        {children}

        {/* Right overlay (LIKE) */}
        {rightOverlay && (
          <Animated.View
            style={[
              styles.overlayContainer,
              styles.rightOverlay,
              rightOverlayStyle,
            ]}
          >
            {rightOverlay}
          </Animated.View>
        )}

        {/* Left overlay (PASS) */}
        {leftOverlay && (
          <Animated.View
            style={[
              styles.overlayContainer,
              styles.leftOverlay,
              leftOverlayStyle,
            ]}
          >
            {leftOverlay}
          </Animated.View>
        )}

        {/* Superlike overlay (UP) */}
        {superlikeOverlay && (
          <Animated.View
            style={[
              styles.overlayContainer,
              styles.superlikeOverlay,
              superlikeOverlayStyle,
            ]}
          >
            {superlikeOverlay}
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// Memoize for performance
export const SwipeableCard = memo(SwipeableCardComponent);

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    top: 50,
    zIndex: 100,
  },
  leftOverlay: {
    right: 40,
  },
  rightOverlay: {
    left: 40,
  },
  superlikeOverlay: {
    top: 40,
    left: '50%',
    transform: [{ translateX: -50 }],
  },
});
