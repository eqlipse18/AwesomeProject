/**
 * useSwipeAnimation Hook - Enhanced Version
 *
 * Improvements:
 * - Superlike overlay animation (upward swipe)
 * - Better interpolation ranges
 * - Smooth scale/opacity transitions
 */

import {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

/**
 * Animation hook for card transformations
 *
 * Handles:
 * - Card rotation based on horizontal swipe
 * - Overlay opacity for left/right/up swipes
 * - Scale and positioning transitions
 */
export function useSwipeAnimation({
  translateX,
  translateY,
  screenWidth,
  screenHeight,
  maxRotation,
  overlayConfig,
}) {
  const animatedCardStyle = useAnimatedStyle(() => {
    // Rotation: max when fully swiped horizontally
    const rotate = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-maxRotation, 0, maxRotation],
      Extrapolation.CLAMP,
    );

    // Scale down slightly as swiping (both X and Y)
    const scale = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, screenWidth],
      [1, 0.95],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale },
      ],
      zIndex: 10,
    };
  });

  // Right overlay opacity (LIKE)
  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      overlayConfig?.inputRange || [0, screenWidth * 0.2],
      overlayConfig?.outputRange || [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Left overlay opacity (PASS)
  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      overlayConfig?.inputRange
        ? overlayConfig.inputRange.map(x => -x)
        : [-screenWidth * 0.2, 0],
      overlayConfig?.outputRange || [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Superlike overlay opacity and scale (UP)
  const superlikeOverlayStyle = useAnimatedStyle(() => {
    // Opacity: show when swiping upward
    const opacity = interpolate(
      -translateY.value, // Negative because swipe is upward
      [0, screenHeight * 0.15],
      [0, 1],
      Extrapolation.CLAMP,
    );

    // Scale: grow as swiping up
    const scale = interpolate(
      -translateY.value,
      [0, screenHeight * 0.2],
      [0.8, 1.1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return {
    animatedCardStyle,
    rightOverlayStyle,
    leftOverlayStyle,
    superlikeOverlayStyle,
  };
}

/**
 * Animation for the "next" card (scaling/opacity as top card swipes)
 */
export function useNextCardAnimation({
  topCardTranslateX,
  topCardTranslateY,
  screenWidth,
  minScale = 0.92,
  minOpacity = 0.6,
}) {
  const animatedNextCardStyle = useAnimatedStyle(() => {
    const totalMovement =
      Math.abs(topCardTranslateX.value) + Math.abs(topCardTranslateY.value);

    const scale = interpolate(
      totalMovement,
      [0, screenWidth],
      [minScale, 1],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      Math.abs(topCardTranslateX.value),
      [0, screenWidth * 0.5],
      [minOpacity, 1],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
      opacity,
      zIndex: 9,
    };
  });

  return { animatedNextCardStyle };
}
