/**
 * SwipeableCard - Touch Origin + Premium Edition 🎯✨
 *
 * Changes:
 * - touchOriginY from gesture → passed to useSwipeAnimation
 * - Syncs X and Y to parent for next card animation
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  withTiming,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { useSwipeGesture } from './useSwipeGestureEnhanced';
import { useSwipeAnimation } from './useSwipeAnimationEnhanced';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function SwipeableCardComponent({
  children,
  onSwipeComplete,
  swipeProgress,
  swipeProgressY,
  manualTrigger,
  swipeThreshold = SCREEN_WIDTH * 0.18,
  velocityThreshold = 300,
  maxRotation = 15,
  verticalFriction = 1,
  animationConfig = {},
  leftOverlay,
  rightOverlay,
  superlikeOverlay,
  disabled = false,
  style,
}) {
  const handleSwipeComplete = useCallback(
    direction => {
      if (onSwipeComplete) onSwipeComplete(direction);
    },
    [onSwipeComplete],
  );

  // 🎯 Get touchOriginY from gesture
  const { gesture, translateX, translateY, velocityY, touchOriginY } =
    useSwipeGesture({
      swipeThreshold,
      velocityThreshold,
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
      verticalFriction,
      onSwipeComplete: handleSwipeComplete,
      disabled,
    });

  // Sync X to parent
  useAnimatedReaction(
    () => translateX.value,
    x => {
      swipeProgress.value = x;
    },
  );

  // Sync Y to parent
  useAnimatedReaction(
    () => translateY.value,
    y => {
      if (swipeProgressY) swipeProgressY.value = y;
    },
  );

  // Manual trigger (buttons)
  useAnimatedReaction(
    () => manualTrigger.value,
    triggerValue => {
      if (triggerValue === 0) return;

      if (triggerValue === 3) {
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

      let targetX = 0;
      let targetY = 0;
      if (triggerValue === 1) targetX = SCREEN_WIDTH * 1.6;
      if (triggerValue === -1) targetX = -SCREEN_WIDTH * 1.6;
      if (triggerValue === 2) targetY = -SCREEN_HEIGHT * 1.3;

      const duration = animationConfig?.programmaticTiming?.duration ?? 220;

      translateX.value = withTiming(targetX, { duration }, () => {
        'worklet';
        if (triggerValue === 1) runOnJS(handleSwipeComplete)('right');
        if (triggerValue === -1) runOnJS(handleSwipeComplete)('left');
      });

      if (triggerValue === 2) {
        translateY.value = withTiming(targetY, { duration }, () => {
          'worklet';
          runOnJS(handleSwipeComplete)('up');
        });
      }
    },
  );

  // 🎯 Pass touchOriginY to animation hook
  const {
    animatedCardStyle,
    leftOverlayStyle,
    rightOverlayStyle,
    superlikeOverlayStyle,
  } = useSwipeAnimation({
    translateX,
    translateY,
    touchOriginY, // 🎯 NEW
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    maxRotation,
    overlayConfig: animationConfig?.overlayConfig,
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.cardWrapper, style, animatedCardStyle]}>
        {children}

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
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  leftOverlay: { right: 40 },

  rightOverlay: { left: 40 },

  superlikeOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
