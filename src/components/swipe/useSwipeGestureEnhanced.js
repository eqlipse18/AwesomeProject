import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

export function useSwipeGesture({
  swipeThreshold,
  velocityThreshold,
  screenWidth,
  screenHeight,
  verticalFriction = 1,
  onSwipeComplete,
  onPress, // ✅ NEW
  disabled = false,
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const touchOriginY = useSharedValue(0);

  const SWIPE_DIST = screenWidth * 0.18;
  const SWIPE_VEL = 300;
  const SUPER_DIST = screenHeight * 0.12;
  const SUPER_VEL = 280;

  // ✅ Tap gesture
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .maxDistance(8) // 8px se zyada move kiya toh tap nahi
    .onEnd(() => {
      'worklet';
      if (onPress) runOnJS(onPress)();
    });

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(event => {
      'worklet';
      touchOriginY.value = event.y;
    })
    .onUpdate(event => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      velocityY.value = event.velocityY;
    })
    .onEnd(event => {
      'worklet';
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const absVX = Math.abs(event.velocityX);
      const absVY = Math.abs(event.velocityY);

      let direction = null;
      let targetX = 0;
      let targetY = 0;

      if (absX > absY) {
        if (absX > SWIPE_DIST || absVX > SWIPE_VEL) {
          direction = event.translationX > 0 ? 'right' : 'left';
          targetX =
            direction === 'right' ? screenWidth * 1.6 : -screenWidth * 1.6;
          targetY = event.translationY * 0.5;
        }
      } else {
        if (absY > SUPER_DIST || absVY > SUPER_VEL) {
          if (event.translationY < 0) {
            direction = 'up';
            targetY = -screenHeight * 1.3;
            targetX = 0;
          } else {
            direction = 'left';
            targetX = -screenWidth * 1.6;
            targetY = screenHeight * 0.5;
          }
        }
      }

      if (!direction) {
        translateX.value = withSpring(0, {
          stiffness: 280,
          damping: 22,
          mass: 0.08,
        });
        translateY.value = withSpring(0, {
          stiffness: 280,
          damping: 22,
          mass: 0.08,
        });
        return;
      }

      const duration = 220;

      if (direction === 'right' || direction === 'left') {
        translateX.value = withTiming(targetX, { duration }, () => {
          'worklet';
          runOnJS(onSwipeComplete)(direction);
        });
        translateY.value = withTiming(targetY, { duration });
      } else if (direction === 'up') {
        translateY.value = withTiming(targetY, { duration }, () => {
          'worklet';
          runOnJS(onSwipeComplete)('up');
        });
        translateX.value = withSpring(0, { stiffness: 200, damping: 20 });
      }
    });

  // ✅ Race — tap jaldi ho toh tap wins, movement ho toh pan wins
  const gesture = Gesture.Race(tap, pan);

  return { gesture, translateX, translateY, velocityY, touchOriginY };
}

export function triggerProgrammaticSwipe() {}
