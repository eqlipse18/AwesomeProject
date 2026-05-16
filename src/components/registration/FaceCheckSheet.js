// FaceCheckSheet.js
// Place: src/components/registration/FaceCheckSheet.js

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: H } = Dimensions.get('window');
const SHEET_H = H * 0.42;

// ── Result types ──────────────────────────────────────────────────────────────
export const FACE_RESULT = {
  NO_FACE: 'no_face',
  PASS: 'pass',
};

const CONTENT = {
  [FACE_RESULT.NO_FACE]: {
    emoji: '🤳',
    title: 'Show Your Face!',
    sub: 'Your main photo is what people see first in the feed. A clear face photo gets you way more matches!',
    tips: ['Face the camera', 'Good lighting helps', 'Selfies work great'],
    cta: 'Try Another Photo',
    color: '#FF0059',
  },
};

export const FaceCheckSheet = ({
  visible,
  result, // FACE_RESULT value
  imageUri, // preview of rejected image
  onRetry, // pick another photo
  onSkip, // allow anyway (optional escape)
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_H);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 26,
        stiffness: 280,
        mass: 0.8,
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(SHEET_H, {
        duration: 220,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible && translateY.value === SHEET_H) return null;

  const content = CONTENT[result] || CONTENT[FACE_RESULT.NO_FACE];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Backdrop */}
      <Reanimated.View
        style={[s.backdrop, backdropStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
      </Reanimated.View>

      {/* Sheet */}
      <Reanimated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 16 }, sheetStyle]}
      >
        {/* Handle */}
        <View style={s.handle} />

        {/* Icon + rejected image preview */}
        <View style={s.topRow}>
          <View
            style={[s.iconBubble, { backgroundColor: content.color + '18' }]}
          >
            <Text style={s.iconEmoji}>{content.emoji}</Text>
          </View>
          {imageUri && (
            <View style={s.previewWrap}>
              <Image source={{ uri: imageUri }} style={s.previewImg} />
              {/* Red X overlay */}
              <View
                style={[
                  s.previewOverlay,
                  { backgroundColor: content.color + 'CC' },
                ]}
              >
                <Text style={s.previewX}>✕</Text>
              </View>
            </View>
          )}
        </View>

        {/* Title + sub */}
        <Text style={[s.title, { color: content.color }]}>{content.title}</Text>
        <Text style={s.sub}>{content.sub}</Text>

        {/* Tips */}
        <View style={s.tipsWrap}>
          {content.tips.map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={[s.tipDot, { backgroundColor: content.color }]} />
              <Text style={s.tipTxt}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.cta, { backgroundColor: content.color }]}
          onPress={onRetry}
          activeOpacity={0.88}
        >
          <Text style={s.ctaTxt}>{content.cta}</Text>
        </TouchableOpacity>

        {/* Skip — escape hatch, subtle */}
        {/* {onSkip && (
          <TouchableOpacity
            style={s.skipBtn}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <Text style={s.skipTxt}>Upload anyway</Text>
          </TouchableOpacity>
        )} */}
      </Reanimated.View>
    </View>
  );
};

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: { fontSize: 32 },
  previewWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImg: { width: '100%', height: '100%' },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewX: { fontSize: 20, color: '#fff', fontWeight: '800' },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    marginBottom: 16,
  },
  tipsWrap: { gap: 8, marginBottom: 24 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3 },
  tipTxt: { fontSize: 13, color: '#475569', fontWeight: '500' },
  cta: {
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaTxt: { fontSize: 16, color: '#fff', fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipTxt: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
});
