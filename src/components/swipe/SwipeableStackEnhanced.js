/**
 * SwipeableStack - Enhanced Production Version
 *
 * Improvements:
 * - Better rewind animation
 * - Superlike (3-way swipe) support
 * - Improved state management
 * - Better error handling
 * - Proper cleanup on unmount
 */

import React, {
  memo,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
} from 'react-native-reanimated';
import { SwipeableCard } from './SwipeableCardEnhanced';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * SwipeableStack Component
 *
 * A production-ready Tinder-like card swiping component.
 *
 * Props:
 * - data: array of items to swipe
 * - renderCard: (item, index) => ReactNode
 * - keyExtractor: (item) => string
 * - onSwipeLeft: (item, index) => void
 * - onSwipeRight: (item, index) => void
 * - onSwipeUp: (item, index) => void  ← NEW: for superlike
 * - onSwipeComplete: (direction, item, index) => void
 * - onEmpty: () => void
 * - onIndexChange: (newIndex) => void
 * - swipeThreshold: number
 * - velocityThreshold: number
 * - visibleCards: number (default: 2)
 * - maxRotation: number
 * - verticalSwipeFriction: number
 * - renderLeftOverlay: () => ReactNode  (PASS)
 * - renderRightOverlay: () => ReactNode (LIKE)
 * - renderSuperlikeOverlay: () => ReactNode  ← NEW
 * - containerStyle: object
 * - cardWrapperStyle: object
 * - initialIndex: number
 * - disabled: boolean
 */
function SwipeableStackComponent(
  {
    data = [],
    renderCard,
    keyExtractor,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeComplete,
    onEmpty,
    onIndexChange,
    swipeThreshold = SCREEN_WIDTH * 0.3,
    velocityThreshold = 800,
    visibleCards = 2,
    animationConfig,
    maxRotation = 15,
    verticalSwipeFriction = 0.2,
    renderLeftOverlay,
    renderRightOverlay,
    renderSuperlikeOverlay,
    overlayConfig = { inputRange: [0, 0.2], outputRange: [0, 1] },
    containerStyle,
    cardWrapperStyle,
    initialIndex = 0,
    disabled = false,
  },
  ref,
) {
  // Validate required props
  if (!data || !Array.isArray(data)) {
    console.warn('[SwipeableStack] data must be an array');
  }
  if (!renderCard || typeof renderCard !== 'function') {
    console.warn('[SwipeableStack] renderCard is required');
  }
  if (!keyExtractor || typeof keyExtractor !== 'function') {
    console.warn('[SwipeableStack] keyExtractor is required');
  }

  // State management
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [swipeHistory, setSwipeHistory] = useState([]);

  // Shared animation values
  const currentSwipeX = useSharedValue(0);
  const manualTrigger = useSharedValue(0); // 0: idle, 1: right, -1: left, 2: up, 3: rewind

  /**
   * Handle swipe completion from card or manual trigger
   * Calls appropriate callbacks and manages state
   */
  const handleSwipeComplete = useCallback(
    direction => {
      // Reset manual trigger immediately
      manualTrigger.value = 0;

      // Get current item before incrementing index
      const currentItem = data[currentIndex];
      if (!currentItem) return;

      // Update index
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);

      // Track swipe history for undo
      setSwipeHistory(prev => [...prev, { index: currentIndex, direction }]);

      // Call direction-specific callbacks
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft(currentItem, currentIndex);
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight(currentItem, currentIndex);
      } else if (direction === 'up' && onSwipeUp) {
        onSwipeUp(currentItem, currentIndex);
      }

      // Call generic callback
      if (onSwipeComplete) {
        onSwipeComplete(direction, currentItem, currentIndex);
      }

      // Call index change callback
      if (onIndexChange) {
        onIndexChange(newIndex);
      }

      // Check if all cards exhausted
      if (newIndex >= data.length && onEmpty) {
        onEmpty();
      }
    },
    [
      currentIndex,
      data,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeComplete,
      onIndexChange,
      onEmpty,
      manualTrigger,
    ],
  );

  // Programmatic swipe methods
  const swipeLeft = useCallback(() => {
    if (currentIndex >= data.length) return;
    manualTrigger.value = -1;
  }, [currentIndex, data.length, manualTrigger]);

  const swipeRight = useCallback(() => {
    if (currentIndex >= data.length) return;
    manualTrigger.value = 1;
  }, [currentIndex, data.length, manualTrigger]);

  const swipeUp = useCallback(() => {
    if (currentIndex >= data.length) return;
    manualTrigger.value = 2;
  }, [currentIndex, data.length, manualTrigger]);

  // Undo last swipe
  const undo = useCallback(() => {
    if (currentIndex <= 0 || swipeHistory.length === 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    setCurrentIndex(lastSwipe.index);
    setSwipeHistory(prev => prev.slice(0, -1));

    // Trigger rewind animation
    manualTrigger.value = 3;

    // Smooth spring animation back to center
    currentSwipeX.value = withSpring(0, {
      stiffness: 300,
      damping: 25,
      mass: 0.1,
    });
  }, [currentIndex, swipeHistory, currentSwipeX, manualTrigger]);

  // Expose ref methods to parent
  useImperativeHandle(
    ref,
    () => ({
      swipeLeft,
      swipeRight,
      swipeUp,
      undo,
      getCurrentIndex: () => currentIndex,
      canUndo: swipeHistory.length > 0,
    }),
    [swipeLeft, swipeRight, swipeUp, undo, currentIndex, swipeHistory],
  );

  // Animation for next card (scale + opacity)
  const nextCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(currentSwipeX.value),
      [0, SCREEN_WIDTH],
      [0.92, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      Math.abs(currentSwipeX.value),
      [0, SCREEN_WIDTH * 0.5],
      [0.6, 1],
      Extrapolation.CLAMP,
    );

    return { transform: [{ scale }], opacity, zIndex: 9 };
  });

  // Render overlays
  const leftOverlay = renderLeftOverlay?.();
  const rightOverlay = renderRightOverlay?.();
  const superlikeOverlay = renderSuperlikeOverlay?.();

  // If all cards swiped, return empty container
  if (currentIndex >= data.length) {
    return (
      <GestureHandlerRootView style={[styles.container, containerStyle]} />
    );
  }

  const currentItem = data[currentIndex];
  const nextItem = data[currentIndex + 1];

  if (!currentItem) return null;

  return (
    <GestureHandlerRootView style={[styles.container, containerStyle]}>
      <View style={styles.cardsContainer}>
        {/* Background/Next card */}
        {nextItem && visibleCards >= 2 && (
          <Animated.View
            key={keyExtractor(nextItem)}
            style={[styles.cardWrapper, cardWrapperStyle, nextCardStyle]}
          >
            {renderCard(nextItem, currentIndex + 1)}
          </Animated.View>
        )}

        {/* Top/Active card */}
        {currentItem && (
          <SwipeableCard
            key={keyExtractor(currentItem)}
            onSwipeComplete={handleSwipeComplete}
            swipeProgress={currentSwipeX}
            manualTrigger={manualTrigger}
            swipeThreshold={swipeThreshold}
            velocityThreshold={velocityThreshold}
            maxRotation={maxRotation}
            verticalFriction={verticalSwipeFriction}
            animationConfig={animationConfig}
            leftOverlay={leftOverlay}
            rightOverlay={rightOverlay}
            superlikeOverlay={superlikeOverlay}
            overlayConfig={overlayConfig}
            disabled={disabled}
            style={cardWrapperStyle}
          >
            {renderCard(currentItem, currentIndex)}
          </SwipeableCard>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// Forward ref + memo for performance
export const SwipeableStack = memo(forwardRef(SwipeableStackComponent));

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardsContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
