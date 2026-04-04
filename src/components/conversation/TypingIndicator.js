import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

export const TypingIndicator = () => (
  <Animated.View
    entering={FadeIn.duration(200)}
    exiting={FadeOut.duration(200)}
    style={s.wrap}
  >
    <View style={s.bubble}>
      <LottieView
        source={require('../../../assets/animations/Typing.json')}
        autoPlay
        loop
        style={s.lottie}
        resizeMode="contain"
      />
    </View>
  </Animated.View>
);

const s = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    marginLeft: 38,
    marginBottom: 8,
    marginTop: 4,
  },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lottie: { width: 52, height: 28 },
});
