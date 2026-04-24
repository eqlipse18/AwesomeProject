import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { height: H } = Dimensions.get('window');
const SHEET_H = 320;

export default function BlockedConfirmScreen({ navigation, route }) {
  const { name, image } = route.params;

  const translateY = useSharedValue(SHEET_H);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
  }, [translateY]);

  const dismiss = () => {
    translateY.value = withTiming(
      SHEET_H,
      {
        duration: 280,
        easing: Easing.in(Easing.cubic),
      },
      () => runOnJS(navigation.navigate)('Chat'),
    );
  };

  // Swipe down to dismiss
  const swipeGesture = Gesture.Pan()
    .onUpdate(e => {
      'worklet';
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd(e => {
      'worklet';
      if (e.translationY > 80) runOnJS(dismiss)();
      else translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={s.root}>
      {/* Blurred background — user profile image */}
      {image && (
        <Image source={{ uri: image }} style={s.bgImage} blurRadius={8} />
      )}
      <View style={s.overlay} />

      {/* Sheet */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[s.sheet, sheetStyle]}>
          <View style={s.handle} />

          {/* Checkmark */}
          <View style={s.checkWrap}>
            <Text style={s.checkIco}>✓</Text>
          </View>

          <Text style={s.title}>Blocked user</Text>
          <Text style={s.body}>
            {name} is now blocked. This user can no longer see your profile or
            contact you.
          </Text>

          <TouchableOpacity
            style={s.okBtn}
            onPress={dismiss}
            activeOpacity={0.85}
          >
            <Text style={s.okTxt}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
    height: SHEET_H,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3C',
    marginBottom: 28,
  },
  checkWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#30D158',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkIco: { fontSize: 28, color: '#fff', fontWeight: '800' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: '#ABABAB',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  okBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  okTxt: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
});
