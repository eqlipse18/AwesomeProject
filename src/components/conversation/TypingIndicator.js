import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';

export const TypingIndicator = () => {
  const d1 = useSharedValue(0),
    d2 = useSharedValue(0),
    d3 = useSharedValue(0);

  useEffect(() => {
    const anim = (sv, delay) => {
      const run = () => {
        sv.value = withTiming(1, { duration: 300 }, () => {
          sv.value = withTiming(0, { duration: 300 });
        });
      };
      setTimeout(run, delay);
      const t = setInterval(run, 900);
      return t;
    };
    const t1 = anim(d1, 0),
      t2 = anim(d2, 150),
      t3 = anim(d3, 300);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, []);

  const a = sv =>
    useAnimatedStyle(() => ({
      opacity: 0.4 + sv.value * 0.6,
      transform: [{ translateY: -sv.value * 4 }],
    }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.wrap}>
      <View style={s.bubble}>
        <Animated.View style={[s.dot, a(d1)]} />
        <Animated.View style={[s.dot, a(d2)]} />
        <Animated.View style={[s.dot, a(d3)]} />
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    marginLeft: 38,
    marginBottom: 8,
    marginTop: 4,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94A3B8' },
});
