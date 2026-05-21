import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

const { width: W, height: H } = Dimensions.get('window');
const SHEET_H = H * 0.52;

export default function RewindSheet({ visible, onClose, navigation }) {
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SHEET_H,
      damping: 22,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) onClose();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    }),
  ).current;

  const handleNav = plan => {
    onClose();
    setTimeout(() => navigation.navigate('Premium', { plan }), 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={rs.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View style={[rs.sheet, { transform: [{ translateY }] }]}>
        <View {...panResponder.panHandlers} style={rs.dragArea}>
          <View style={rs.handle} />
        </View>

        <LinearGradient
          colors={['#001a0a', '#003d1a', '#0D0D0D']}
          style={rs.content}
        >
          {/* Stars */}
          {['✨', '↩️', '✨', '↩️'].map((s, i) => (
            <Text
              key={i}
              style={{
                position: 'absolute',
                fontSize: i % 2 === 0 ? 14 : 20,
                opacity: 0.4,
                left: `${[10, 78, 85, 15][i]}%`,
                top: `${[20, 15, 55, 60][i]}%`,
              }}
            >
              {s}
            </Text>
          ))}

          <LottieView
            source={require('../../assets/animations/gopro.json')}
            autoPlay
            loop
            style={rs.lottie}
            resizeMode="contain"
          />

          <Text style={rs.emoji}>↩️</Text>
          <Text style={rs.title}>Card Rewind</Text>
          <Text style={rs.desc}>
            Accidentally swiped left? Rewind and get another chance with Flame
            Plus or Ultra!
          </Text>

          <View style={rs.btnRow}>
            <TouchableOpacity
              style={rs.plusBtn}
              onPress={() => handleNav('plus')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF8C00', '#FF6B00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={rs.btnGrad}
              >
                <Text style={rs.btnTxt}>🔥 Flame Plus</Text>
                <Text style={rs.btnSub}>₹299/mo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={rs.ultraBtn}
              onPress={() => handleNav('ultra')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#C084FC', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={rs.btnGrad}
              >
                <Text style={rs.btnTxt}>💎 Flame Ultra</Text>
                <Text style={rs.btnSub}>₹399/mo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={rs.skip} onPress={onClose}>
            <Text style={rs.skipTxt}>Not now</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const rs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  dragArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 8,
  },
  lottie: { width: W * 0.55, height: 52, marginBottom: 4 },
  emoji: { fontSize: 36, marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  plusBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  ultraBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  skip: { paddingTop: 16 },
  skipTxt: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
});
