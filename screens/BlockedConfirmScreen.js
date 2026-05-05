import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  PanResponder, // ← PanResponder
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
// ← GestureDetector + Gesture REMOVE karo

const { height: H } = Dimensions.get('window');
const SHEET_H = 320;

export default function BlockedConfirmScreen({ navigation, route }) {
  const { name, image } = route.params;
  const translateY = useSharedValue(SHEET_H);

  useEffect(() => {
    // Thoda aur delay do — screen settle hone ke baad spring start ho
    const timer = setTimeout(() => {
      translateY.value = withSpring(0, { damping: 20, stiffness: 180 });
    }, 100); // ← pehle 0 tha
    return () => clearTimeout(timer);
  }, [translateY]);

  const goToChat = useCallback(() => {
    navigation.goBack(); // ← sirf modal close karo, Home already behind hai
  }, [navigation]);

  const dismiss = () => {
    translateY.value = withTiming(
      SHEET_H,
      { duration: 280, easing: Easing.in(Easing.cubic) },
      () => runOnJS(goToChat)(),
    );
  };

  // PanResponder — no RNGH needed
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.value = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) {
          dismiss();
        } else {
          translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        }
      },
    }),
  ).current;

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={s.root}>
      {image && (
        <Image source={{ uri: image }} style={s.bgImage} blurRadius={8} />
      )}
      <View style={s.overlay} />

      {/* Sheet — PanResponder se swipe */}
      <Animated.View
        style={[s.sheet, sheetStyle]}
        {...panResponder.panHandlers} // ← spread handlers
      >
        <View style={s.handle} />

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
