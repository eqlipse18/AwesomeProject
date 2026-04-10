import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import NitroSound from 'react-native-nitro-sound';
import RNFS from 'react-native-fs';

const { width: W } = Dimensions.get('window');
const CANCEL_THRESHOLD = -80;
const MIN_DURATION = 1000;

const generateBar = () => Math.random() * 0.72 + 0.15;

export const VoiceRecorder = ({ onSend, onCancel, onRecordingChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformBars, setWaveformBars] = useState([]);

  const translateX = useSharedValue(0);
  const micScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const barInterval = useRef(null);
  const durationRef = useRef(0);
  const waveformRef = useRef([]);
  const cancelledRef = useRef(false);

  // ── Permission ────────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'In Flame needs mic access to send voice messages.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  // ── Start recording ───────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    const ok = await requestPermission();
    if (!ok) return;

    cancelledRef.current = false;
    durationRef.current = 0;
    waveformRef.current = [];
    setDuration(0);
    setWaveformBars([]);

    // startRecording mein path fix karo:
    const path =
      Platform.OS === 'ios'
        ? `${RNFS.CachesDirectoryPath}/voice_${Date.now()}.m4a`
        : `${RNFS.CachesDirectoryPath}/${Date.now()}.mp4`;

    try {
      await NitroSound.startRecorder(path);
      setIsRecording(true);
      onRecordingChange?.(true);

      // Ripple loop
      rippleScale.value = 0;
      rippleOpacity.value = 0.35;
      rippleScale.value = withRepeat(
        withSequence(
          withTiming(2.6, { duration: 900 }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      );
      rippleOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 900 }),
          withTiming(0.35, { duration: 0 }),
        ),
        -1,
      );

      // Duration + waveform tick
      barInterval.current = setInterval(() => {
        durationRef.current += 100;
        setDuration(durationRef.current);
        const bar = generateBar();
        waveformRef.current = [...waveformRef.current, bar];
        setWaveformBars(prev => [...prev, bar]);
      }, 100);
    } catch (e) {
      console.error('[VoiceRecorder startRecorder]', e);
    }
  }, [requestPermission, onRecordingChange, rippleScale, rippleOpacity]);

  // ── Stop + send ───────────────────────────────────────────────────────
  const stopAndSend = useCallback(async () => {
    if (!isRecording) return;
    clearInterval(barInterval.current);

    try {
      const uri = await NitroSound.stopRecorder();
      setIsRecording(false);
      onRecordingChange?.(false);

      // Reset animations
      rippleScale.value = withTiming(0, { duration: 180 });
      rippleOpacity.value = withTiming(0, { duration: 180 });

      if (cancelledRef.current) {
        onCancel?.();
        return;
      }
      if (durationRef.current < MIN_DURATION) {
        onCancel?.();
        return;
      }

      onSend?.(uri, durationRef.current, [...waveformRef.current]);
    } catch (e) {
      console.error('[VoiceRecorder stopRecorder]', e);
      setIsRecording(false);
      onRecordingChange?.(false);
    }
  }, [
    isRecording,
    onRecordingChange,
    onCancel,
    onSend,
    rippleScale,
    rippleOpacity,
  ]);

  // ── Cancel ────────────────────────────────────────────────────────────
  const cancelRecording = useCallback(async () => {
    cancelledRef.current = true;
    clearInterval(barInterval.current);
    try {
      await NitroSound.stopRecorder();
    } catch {}
    rippleScale.value = withTiming(0, { duration: 180 });
    rippleOpacity.value = withTiming(0, { duration: 180 });
    setIsRecording(false);
    onRecordingChange?.(false);
    onCancel?.();
  }, [onRecordingChange, onCancel, rippleScale, rippleOpacity]);

  // ── Gesture ───────────────────────────────────────────────────────────
  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      micScale.value = withSpring(1.3, { damping: 12, stiffness: 300 });
      runOnJS(startRecording)();
    })
    .onUpdate(e => {
      'worklet';
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, CANCEL_THRESHOLD * 1.5);
      }
    })
    .onEnd(e => {
      'worklet';
      micScale.value = withSpring(1, { damping: 14, stiffness: 300 });
      translateX.value = withSpring(0);

      if (e.translationX < CANCEL_THRESHOLD) {
        runOnJS(cancelRecording)();
      } else {
        runOnJS(stopAndSend)();
      }
    });

  // ── Animated styles ───────────────────────────────────────────────────
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const barSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const slideHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, CANCEL_THRESHOLD * 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [0, CANCEL_THRESHOLD],
          [0, -16],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const fmtDur = ms => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <View style={s.root}>
      {/* Recording bar */}
      {isRecording && (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={s.recBar}
        >
          {/* Red dot */}
          <View style={s.recDot} />

          {/* Duration */}
          <Text style={s.duration}>{fmtDur(duration)}</Text>

          {/* Live waveform */}
          <Animated.View style={[s.liveWaveWrap, barSlideStyle]}>
            {waveformBars.slice(-30).map((h, i) => (
              <View
                key={i}
                style={[s.liveBar, { height: Math.max(3, h * 26) }]}
              />
            ))}
          </Animated.View>

          {/* Slide to cancel */}
          <Animated.View style={[s.slideHint, slideHintStyle]}>
            <Text style={s.slideHintTxt}>◀ Slide to cancel</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Mic button */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[s.micWrap, micStyle]}>
          <Animated.View style={[s.ripple, rippleStyle]} />
          <View style={[s.micBtn, isRecording && s.micBtnActive]}>
            <Text style={s.micIco}>🎙️</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  recBar: {
    position: 'absolute',
    right: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    width: W - 88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0059',
  },
  duration: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 36,
  },
  liveWaveWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  liveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#FF0059',
  },
  slideHint: { flexDirection: 'row', alignItems: 'center' },
  slideHintTxt: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  micWrap: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF0059',
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  micBtnActive: {
    backgroundColor: '#FF0059',
    borderColor: '#FF0059',
  },
  micIco: { fontSize: 18 },
});
