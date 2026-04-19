/**
 * HoldRecordingBar.js
 *
 * UI shown while the user is HOLDING the mic button (finger still down).
 * Matches Image 1:
 *   LEFT  : mic icon (draggable) + timer + "Slide to Cancel <"
 *   RIGHT : lock icon (above mic, slide-up hint)
 *
 * The parent (InputBar) owns all gesture logic and passes shared values
 * + callbacks down as props. This component is purely presentational.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, FadeIn } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';

const fmtDur = ms => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const HoldRecordingBar = ({
  duration,
  // Shared value animated styles (pre-built in InputBar)
  micStyle,
  rippleStyle,
  cancelArrowStyle,
  lockArrowStyle,
  dotBlinkStyle,
  // Gesture
  micGesture,
}) => {
  return (
    <Animated.View entering={FadeIn.duration(160)} style={s.container}>
      {/* ── LEFT: draggable mic ─────────────────────────────────────── */}
      <GestureDetector gesture={micGesture}>
        <Animated.View style={[s.micWrap, micStyle]}>
          <Animated.View style={[s.ripple, rippleStyle]} />
          <View style={s.micBtn}>
            <Text style={s.micIco}>🎙️</Text>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* ── CENTER: timer + "Slide to Cancel" ──────────────────────── */}
      <View style={s.center}>
        {/* Timer row */}
        <View style={s.timerRow}>
          <Animated.View style={[s.redDot, dotBlinkStyle]} />
          <Text style={s.timerTxt}>{fmtDur(duration)}</Text>
        </View>

        {/* Slide to cancel hint — pulses left */}
        <Animated.View style={cancelArrowStyle}>
          <Text style={s.cancelHintTxt}>Slide to Cancel {'<'}</Text>
        </Animated.View>
      </View>

      {/* ── RIGHT: lock hint (slide up to lock) ────────────────────── */}
      <View style={s.lockWrap}>
        <Animated.View style={lockArrowStyle}>
          <Text style={s.lockIco}>🔒</Text>
          <Text style={s.lockArrowTxt}>▲</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },

  // ── Mic ──────────────────────────────────────────────────────────
  micWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,0,89,0.18)',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIco: { fontSize: 18 },

  // ── Center ───────────────────────────────────────────────────────
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
  cancelHintTxt: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // ── Lock ─────────────────────────────────────────────────────────
  lockWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  lockIco: {
    fontSize: 16,
    textAlign: 'center',
  },
  lockArrowTxt: {
    fontSize: 9,
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '700',
  },
});
