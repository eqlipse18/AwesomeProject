/**
 * useSwipeAnimation Hook - Touch Origin Rotation Edition 🎯✨
 *
 * Key change:
 * - Rotation now depends on WHERE user touched the card
 *   Top half touch  → normal rotation (card pivots around bottom)
 *   Bottom half touch → reversed/reduced rotation (card pivots around top)
 *   Exactly like Tinder's physical card feel
 *
 * How it works:
 *   touchOriginY is 0..cardHeight
 *   cardCenter = cardHeight / 2
 *   rotationFactor = (touchOriginY - cardCenter) / cardCenter
 *     → top of card:    factor ≈ -1  → rotate MORE  in swipe direction
 *     → center of card: factor =  0  → normal rotation
 *     → bottom of card: factor ≈ +1  → rotate LESS / opposite
 */

import {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const CARD_HEIGHT = 600; // approximate card height — adjust to match your card

export function useSwipeAnimation({
  translateX,
  translateY,
  touchOriginY, // 🎯 NEW
  screenWidth,
  screenHeight,
  maxRotation,
  overlayConfig,
}) {
  const animatedCardStyle = useAnimatedStyle(() => {
    // ── Touch Origin Rotation ──────────────────────────────────────────
    // Where on the card did user touch?
    const cardCenter = CARD_HEIGHT / 2;
    const originY = touchOriginY ? touchOriginY.value : cardCenter;

    // factor: -1 (touched top) → 0 (center) → +1 (touched bottom)
    const factor = (originY - cardCenter) / cardCenter;

    // Base rotation from X drag
    const baseRotate = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-maxRotation, 0, maxRotation],
      Extrapolation.CLAMP,
    );

    // When touched at TOP (factor < 0) → rotation is larger (natural pivot from bottom)
    // When touched at BOTTOM (factor > 0) → rotation is smaller or reversed
    // Multiplier: top touch = 1.7x, center = 1.5x, bottom = 1.3x
    const rotationMultiplier = 1.5 - factor * 0.2;
    const rotate = baseRotate * rotationMultiplier;
    // ──────────────────────────────────────────────────────────────────

    const scale = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, screenWidth],
      [1, 0.96],
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

  // LIKE overlay (right swipe)
  const rightOverlayStyle = useAnimatedStyle(() => {
    const isHorizontal =
      Math.abs(translateX.value) > Math.abs(translateY.value);

    const opacity = isHorizontal
      ? interpolate(
          translateX.value,
          [0, screenWidth * 0.15],
          [0, 1],
          Extrapolation.CLAMP,
        )
      : 0;

    const scale = isHorizontal
      ? interpolate(
          translateX.value,
          [0, screenWidth * 0.25],
          [0.8, 1.05],
          Extrapolation.CLAMP,
        )
      : 0.8;

    return { opacity, transform: [{ scale }] };
  });

  // PASS overlay (left swipe)
  const leftOverlayStyle = useAnimatedStyle(() => {
    const isHorizontal =
      Math.abs(translateX.value) > Math.abs(translateY.value);

    const opacity = isHorizontal
      ? interpolate(
          translateX.value,
          [-screenWidth * 0.15, 0],
          [1, 0],
          Extrapolation.CLAMP,
        )
      : 0;

    const scale = isHorizontal
      ? interpolate(
          translateX.value,
          [-screenWidth * 0.25, 0],
          [1.05, 0.8],
          Extrapolation.CLAMP,
        )
      : 0.8;

    return { opacity, transform: [{ scale }] };
  });

  // SUPERLIKE overlay (upward swipe)
  const superlikeOverlayStyle = useAnimatedStyle(() => {
    const isVertical = Math.abs(translateY.value) > Math.abs(translateX.value);

    const opacity = isVertical
      ? interpolate(
          -translateY.value,
          [0, screenHeight * 0.1],
          [0, 1],
          Extrapolation.CLAMP,
        )
      : 0;

    const scale = isVertical
      ? interpolate(
          -translateY.value,
          [0, screenHeight * 0.18],
          [0.7, 1.1],
          Extrapolation.CLAMP,
        )
      : 0.7;

    return { opacity, transform: [{ scale }] };
  });

  return {
    animatedCardStyle,
    rightOverlayStyle,
    leftOverlayStyle,
    superlikeOverlayStyle,
  };
}

/**
 * ✨ Premium Next Card Animation
 * Scale + fade + rise as top card leaves
 */
export function useNextCardAnimation({
  topCardTranslateX,
  topCardTranslateY,
  screenWidth,
  minScale = 0.88,
  minOpacity = 0.4,
}) {
  const animatedNextCardStyle = useAnimatedStyle(() => {
    const totalMovement =
      Math.abs(topCardTranslateX.value) + Math.abs(topCardTranslateY.value);

    const scale = interpolate(
      totalMovement,
      [0, screenWidth * 0.6],
      [minScale, 1],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      totalMovement,
      [0, screenWidth * 0.4],
      [minOpacity, 1],
      Extrapolation.CLAMP,
    );

    // Rise up as top card leaves
    const translateY = interpolate(
      totalMovement,
      [0, screenWidth * 0.6],
      [18, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
      zIndex: 9,
    };
  });

  return { animatedNextCardStyle };
}
