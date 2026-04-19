/**
 * TapRecordingBar.js
 *
 * UI shown when user TAPPED the mic (quick press, no hold gestures).
 * Matches Image 2:
 *   ROW 1 : mic icon | timer | dotted waveform line
 *   ROW 2 : trash (delete) | stop/record button (center) | send (right)
 *
 * No swipe gestures, no lock hint — user must tap send or delete.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, FadeIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

const fmtDur = ms => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const TapRecordingBar = ({
  duration,
  dotBlinkStyle,
  onDelete,
  onSend,
}) => {
  return (
    <Animated.View entering={FadeIn.duration(180)} style={s.container}>
      {/* ── ROW 1: mic icon | timer | waveform ─────────────────────── */}
      <View style={s.topRow}>
        {/* Static mic icon (no gesture in tap mode) */}
        <View style={s.micIconWrap}>
          <Text style={s.micIco}>🎙️</Text>
        </View>

        {/* Timer */}
        <View style={s.timerRow}>
          <Animated.View style={[s.redDot, dotBlinkStyle]} />
          <Text style={s.timerTxt}>{fmtDur(duration)}</Text>
        </View>

        {/* Dotted waveform line — fills remaining space */}
        <View style={s.waveWrap}>
          <LottieView
            source={require('../../../assets/animations/wave.json')}
            autoPlay
            loop
            style={s.lottie}
            colorFilters={[{ keypath: '**', color: '#FF0059' }]}
          />
        </View>
      </View>

      {/* ── ROW 2: delete | stop | send ────────────────────────────── */}
      <View style={s.bottomRow}>
        {/* Delete / trash */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={onDelete}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={s.deleteIco}>🗑️</Text>
        </TouchableOpacity>

        {/* Stop recording button (red circle — center) */}
        <TouchableOpacity
          style={s.stopBtn}
          onPress={onDelete} // stop without sending = same as delete
          activeOpacity={0.8}
          hitSlop={4}
        >
          <View style={s.stopInner} />
        </TouchableOpacity>

        {/* Send */}
        <TouchableOpacity
          style={s.sendBtn}
          onPress={onSend}
          activeOpacity={0.85}
        >
          <Text style={s.sendIco}>✓</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },

  // ── Top row ───────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIco: { fontSize: 16 },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0059',
  },
  timerTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 38,
  },

  waveWrap: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    // dotted border fallback behind lottie
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  lottie: { width: '100%', height: 32 },

  // ── Bottom row ────────────────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },

  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  deleteIco: { fontSize: 18 },

  stopBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  stopInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FF0059',
  },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIco: { fontSize: 20, color: '#fff', fontWeight: '800' },
});
