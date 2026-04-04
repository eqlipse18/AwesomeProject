import React, { useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const { width: W, height: H } = Dimensions.get('window');

export const MediaPreviewModal = ({ uri, onClose }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const resetAll = useCallback(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
  }, []);

  // Pinch with focal point
  const pinch = Gesture.Pinch()
    .onStart(e => {
      'worklet';
      originX.value = e.focalX - W / 2;
      originY.value = e.focalY - H / 2;
      savedScale.value = scale.value;
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    })
    .onUpdate(e => {
      'worklet';
      const newScale = Math.max(1, Math.min(savedScale.value * e.scale, 6));
      const sr = newScale / savedScale.value;
      scale.value = newScale;
      // Focal zoom: keep finger position stable
      translateX.value = originX.value * (1 - sr) + savedTx.value * sr;
      translateY.value = originY.value * (1 - sr) + savedTy.value * sr;
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1.08) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        savedScale.value = scale.value;
        savedTx.value = translateX.value;
        savedTy.value = translateY.value;
      }
    });

  // Pan when zoomed
  const pan = Gesture.Pan()
    .minDistance(1)
    .onUpdate(e => {
      'worklet';
      if (scale.value <= 1) return;
      translateX.value = savedTx.value + e.translationX;
      translateY.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      savedTx.value = translateX.value;
      savedTy.value = translateY.value;
    });

  // Double tap to reset
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTx.value = 0;
      savedTy.value = 0;
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={s.bg}>
          <SafeAreaView style={s.header}>
            <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
              <Text style={s.closeIco}>✕</Text>
            </TouchableOpacity>
          </SafeAreaView>

          <GestureDetector gesture={composed}>
            <Animated.Image
              source={{ uri: uri || '' }}
              style={[s.img, imgStyle]}
              resizeMode="contain"
            />
          </GestureDetector>

          <View style={s.hint}>
            <Text style={s.hintTxt}>Pinch · Double tap to reset</Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const s = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { position: 'absolute', top: 0, right: 0, zIndex: 10 },
  closeBtn: {
    margin: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIco: { color: '#fff', fontSize: 16, fontWeight: '700' },
  img: { width: W, height: H * 0.82 },
  hint: { position: 'absolute', bottom: 36, alignItems: 'center' },
  hintTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});
