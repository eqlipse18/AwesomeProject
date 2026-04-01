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

  //  Reanimated 4 compatible — Gesture.Pinch()
  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  //  Double tap to reset zoom
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
    });

  const composed = Gesture.Simultaneous(pinch, doubleTap);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const resetAndClose = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={resetAndClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={s.bg}>
          <SafeAreaView style={s.header}>
            <TouchableOpacity style={s.closeBtn} onPress={resetAndClose}>
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
            <Text style={s.hintTxt}>Pinch to zoom · Double tap to reset</Text>
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
  img: { width: W, height: H * 0.8 },
  hint: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
});
