// OnboardingProgress.js
// Place: src/components/shared/OnboardingProgress.js

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export const ONBOARDING_STEPS = [
  'Name',
  'Setup',
  'Goals',
  'LifeStyle',
  'HomeJob',
  'Photo',
  'Hobby',
  'Final',
];

const DOT_SIZE = 7;
const DOT_ACTIVE_WIDTH = 22; // active dot pill shape
const BRAND = '#FF0059';
const PAST = '#FF5289';
const INACTIVE = '#E2E8F0';

const Dot = ({ index, currentIndex }) => {
  const isActive = index === currentIndex;
  const isPast = index < currentIndex;

  const width = useSharedValue(isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE);
  const opacity = useSharedValue(isPast ? 1 : isActive ? 1 : 0.4);
  const bgColor = isPast ? PAST : isActive ? BRAND : INACTIVE;

  useEffect(() => {
    width.value = withSpring(
      index === currentIndex ? DOT_ACTIVE_WIDTH : DOT_SIZE,
      { damping: 16, stiffness: 260 },
    );
    opacity.value = withTiming(
      index < currentIndex ? 1 : index === currentIndex ? 1 : 0.4,
      { duration: 250, easing: Easing.out(Easing.ease) },
    );
  }, [currentIndex]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[s.dot, { backgroundColor: bgColor }, style]} />;
};

export const OnboardingProgress = ({ currentStep }) => {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);

  return (
    <View style={s.wrap}>
      {ONBOARDING_STEPS.map((_, index) => (
        <Dot key={index} index={index} currentIndex={currentIndex} />
      ))}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
