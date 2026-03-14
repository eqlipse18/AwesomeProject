/**
 * SwipeableStack - PREMIUM Edition ✨
 *
 * Changes:
 * - Uses useNextCardAnimation for premium scale+fade+rise reveal
 * - Ultra low default thresholds (makkhan swipe)
 * - Next card animation driven by BOTH X and Y movement
 */

import React, {
  memo,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { SwipeableCard } from './SwipeableCardEnhanced';
import { useNextCardAnimation } from './useSwipeAnimationEnhanced';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    swipeThreshold = SCREEN_WIDTH * 0.18, // 🧈 makkhan default
    velocityThreshold = 300, // 🧈 makkhan default
    visibleCards = 2,
    animationConfig,
    maxRotation = 15,
    verticalSwipeFriction = 1, // fully free
    renderLeftOverlay,
    renderRightOverlay,
    renderSuperlikeOverlay,
    containerStyle,
    cardWrapperStyle,
    initialIndex = 0,
    disabled = false,
  },
  ref,
) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [swipeHistory, setSwipeHistory] = useState([]);

  // Top card's live X and Y position (drives next card animation)
  const currentSwipeX = useSharedValue(0);
  const currentSwipeY = useSharedValue(0);
  const manualTrigger = useSharedValue(0);

  // ✨ Premium next card animation
  const { animatedNextCardStyle } = useNextCardAnimation({
    topCardTranslateX: currentSwipeX,
    topCardTranslateY: currentSwipeY,
    screenWidth: SCREEN_WIDTH,
    minScale: 0.88,
    minOpacity: 0.4,
  });

  const handleSwipeComplete = useCallback(
    direction => {
      manualTrigger.value = 0;
      const currentItem = data[currentIndex];
      if (!currentItem) return;

      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSwipeHistory(prev => [...prev, { index: currentIndex, direction }]);

      if (direction === 'left' && onSwipeLeft)
        onSwipeLeft(currentItem, currentIndex);
      if (direction === 'right' && onSwipeRight)
        onSwipeRight(currentItem, currentIndex);
      if (direction === 'up' && onSwipeUp) onSwipeUp(currentItem, currentIndex);
      if (onSwipeComplete)
        onSwipeComplete(direction, currentItem, currentIndex);
      if (onIndexChange) onIndexChange(newIndex);
      if (newIndex >= data.length && onEmpty) onEmpty();
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

  const undo = useCallback(() => {
    if (currentIndex <= 0 || swipeHistory.length === 0) return;
    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    setCurrentIndex(lastSwipe.index);
    setSwipeHistory(prev => prev.slice(0, -1));
    manualTrigger.value = 3;
    currentSwipeX.value = withSpring(0, {
      stiffness: 300,
      damping: 25,
      mass: 0.1,
    });
    currentSwipeY.value = withSpring(0, {
      stiffness: 300,
      damping: 25,
      mass: 0.1,
    });
  }, [currentIndex, swipeHistory, currentSwipeX, currentSwipeY, manualTrigger]);

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

  const leftOverlay = renderLeftOverlay?.();
  const rightOverlay = renderRightOverlay?.();
  const superlikeOverlay = renderSuperlikeOverlay?.();

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
        {/* ✨ Next card — premium scale+fade+rise */}
        {nextItem && visibleCards >= 2 && (
          <Animated.View
            key={keyExtractor(nextItem)}
            style={[
              styles.cardWrapper,
              cardWrapperStyle,
              animatedNextCardStyle,
            ]}
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
            swipeProgressY={currentSwipeY} // pass Y progress too
            manualTrigger={manualTrigger}
            swipeThreshold={swipeThreshold}
            velocityThreshold={velocityThreshold}
            maxRotation={maxRotation}
            verticalFriction={verticalSwipeFriction}
            animationConfig={animationConfig}
            leftOverlay={leftOverlay}
            rightOverlay={rightOverlay}
            superlikeOverlay={superlikeOverlay}
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
