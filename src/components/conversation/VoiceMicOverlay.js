/**
 * VoiceMicOverlay
 *
 * Responsibilities:
 *   - Mic button with ripple (GestureDetector)
 *   - Recording logic (NitroSound + permission)
 *   - Exposes mode changes via onModeChange(mode, payload)
 *   - Exposes stopRecording / deleteRecording via ref
 *
 * Does NOT render any overlay UI — that lives in InputBar so it
 * stays within the bar's view bounds (Android touch clipping fix).
 *
 * FIX (send button not working):
 *   Gesture.Race fires panGesture.onEnd even after tapGesture wins,
 *   which called stopRecording() and set recRef=false before the user
 *   could tap send. Fix: isTapRef flag — set in enterTapMode(), checked
 *   in panGesture.onEnd to skip the stopRecording call.
 */

import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import NitroSound from 'react-native-nitro-sound';
import RNFS from 'react-native-fs';

const { width: W } = Dimensions.get('window');

const CANCEL_X = -W * 0.3;
const LOCK_Y = -80;
const MIN_MS = 1000;
const MIC = 42;
const SMOOTH = { duration: 200, easing: Easing.out(Easing.cubic) };
const FAST = { duration: 150, easing: Easing.out(Easing.cubic) };

export const MODE = {
  IDLE: 'idle',
  HOLD: 'hold',
  TAP: 'tap',
  LOCKED: 'locked',
};

// ═════════════════════════════════════════════════════════════════════════════
export const VoiceMicOverlay = forwardRef(
  ({ onModeChange, onSendVoice }, ref) => {
    // ── Refs ──────────────────────────────────────────────────────────────
    const recRef = useRef(false);
    const modeRef = useRef(MODE.IDLE);
    const isTapRef = useRef(false); // ← FIX: prevents pan.onEnd killing tap recording
    const waveRef = useRef([]);
    const timerRef = useRef(null);
    const startMsRef = useRef(0);

    // ── Shared values for mic button ──────────────────────────────────────
    const micX = useSharedValue(0);
    const micY = useSharedValue(0);
    const micSc = useSharedValue(1);
    const ripSc = useSharedValue(1);
    const ripOp = useSharedValue(0);
    const dotOp = useSharedValue(1);
    const didCancel = useSharedValue(0);
    const didLock = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      stopRecording,
      deleteRecording,
      lockRecording,
      sharedValues: { micX, micY, micSc, ripSc, ripOp, dotOp },
    }));

    const notify = useCallback(
      (mode, extra = {}) => {
        modeRef.current = mode;
        onModeChange?.(mode, extra);
      },
      [onModeChange],
    );

    const getPerm = useCallback(async () => {
      if (Platform.OS !== 'android') return true;
      const r = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      return r === PermissionsAndroid.RESULTS.GRANTED;
    }, []);

    const startAnims = useCallback(() => {
      ripSc.value = 1;
      ripOp.value = 0.25;
      ripSc.value = withRepeat(
        withSequence(
          withTiming(2.6, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      );
      ripOp.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 900, easing: Easing.in(Easing.ease) }),
          withTiming(0.25, { duration: 0 }),
        ),
        -1,
      );
      dotOp.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
      );
    }, [ripSc, ripOp, dotOp]);

    const resetAnims = useCallback(() => {
      cancelAnimation(ripSc);
      cancelAnimation(ripOp);
      cancelAnimation(dotOp);
      micX.value = withTiming(0, SMOOTH);
      micY.value = withTiming(0, SMOOTH);
      micSc.value = withTiming(1, SMOOTH);
      ripSc.value = withTiming(1, FAST);
      ripOp.value = withTiming(0, FAST);
      dotOp.value = withTiming(1, FAST);
      didCancel.value = 0;
      didLock.value = 0;
    }, [micX, micY, micSc, ripSc, ripOp, dotOp, didCancel, didLock]);

    // ── Start ─────────────────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
      if (recRef.current) return;

      notify(MODE.HOLD);
      startMsRef.current = Date.now();
      isTapRef.current = false; // reset tap flag on every fresh start
      didCancel.value = 0;
      didLock.value = 0;
      waveRef.current = [];

      const ok = await getPerm();
      if (!ok) {
        notify(MODE.IDLE);
        return;
      }

      const path = `${RNFS.CachesDirectoryPath}/v_${Date.now()}.m4a`;
      try {
        await NitroSound.startRecorder(path);
        recRef.current = true;
        startAnims();

        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startMsRef.current;
          waveRef.current.push(Math.random() * 0.75 + 0.15);
          notify(modeRef.current, { dur: elapsed });
        }, 100);
      } catch (e) {
        console.error('[VoiceMic] start:', e.message);
        recRef.current = false;
        notify(MODE.IDLE);
      }
    }, [getPerm, startAnims, notify, didCancel, didLock]);

    // ── Stop ──────────────────────────────────────────────────────────────
    const stopRecording = useCallback(
      async (isCancelled = false) => {
        if (!recRef.current) return;
        recRef.current = false;
        isTapRef.current = false; // clear on stop
        clearInterval(timerRef.current);

        const realDur = Date.now() - startMsRef.current;
        const w = [...waveRef.current];

        resetAnims();
        notify(MODE.IDLE, { dur: 0 });

        try {
          const uri = await NitroSound.stopRecorder();
          if (isCancelled || realDur < MIN_MS) return;
          onSendVoice?.(uri, realDur, w);
        } catch (e) {
          console.error('[VoiceMic] stop:', e.message);
        }
      },
      [resetAnims, notify, onSendVoice],
    );

    const deleteRecording = useCallback(
      () => stopRecording(true),
      [stopRecording],
    );

    // ── Lock ──────────────────────────────────────────────────────────────
    const lockRecording = useCallback(() => {
      if (modeRef.current === MODE.LOCKED) return;
      didLock.value = 1;
      notify(MODE.LOCKED);
      micX.value = withTiming(0, SMOOTH);
      micY.value = withTiming(0, SMOOTH);
      micSc.value = withTiming(1, SMOOTH);
    }, [didLock, micX, micY, micSc, notify]);

    // ── Tap mode ──────────────────────────────────────────────────────────
    const enterTapMode = useCallback(() => {
      if (modeRef.current !== MODE.HOLD) return;
      isTapRef.current = true; // ← FIX: mark as tap so pan.onEnd skips stopRecording
      notify(MODE.TAP);
      micX.value = withTiming(0, SMOOTH);
      micY.value = withTiming(0, SMOOTH);
      micSc.value = withTiming(1, SMOOTH);
    }, [micX, micY, micSc, notify]);

    // ── Pan end handler — named, sync, safe for runOnJS ──────────────────
    // isTapRef.current=true means tap already won → keep recording alive.
    const handlePanEnd = (tx, wasCancelled, wasLocked) => {
      if (isTapRef.current) {
        micX.value = withTiming(0, SMOOTH);
        micY.value = withTiming(0, SMOOTH);
        micSc.value = withTiming(1, SMOOTH);
        return;
      }
      if (wasLocked === 1) {
        micX.value = withTiming(0, SMOOTH);
        micY.value = withTiming(0, SMOOTH);
        micSc.value = withTiming(1, SMOOTH);
        return;
      }
      stopRecording(wasCancelled === 1);
    };

    // ── Gestures ──────────────────────────────────────────────────────────
    const tapGesture = Gesture.Tap()
      .maxDuration(280)
      .onStart(() => {
        'worklet';
        micSc.value = withTiming(1.22, { duration: 130 });
        runOnJS(startRecording)();
      })
      .onEnd(() => {
        'worklet';
        runOnJS(enterTapMode)();
      });

    const panGesture = Gesture.Pan()
      .minDistance(0)
      .activateAfterLongPress(280)
      .onStart(() => {
        'worklet';
        micSc.value = withTiming(1.25, { duration: 140 });
        runOnJS(startRecording)();
      })
      .onUpdate(e => {
        'worklet';
        if (didLock.value === 1) return;
        const tx = e.translationX;
        const ty = e.translationY;
        if (tx < 0) micX.value = Math.max(tx, CANCEL_X * 1.3);
        if (ty < 0) micY.value = Math.max(ty, LOCK_Y * 1.4);
        if (tx < CANCEL_X) didCancel.value = 1;
        if (ty < LOCK_Y && didLock.value === 0) runOnJS(lockRecording)();
      })
      .onEnd(e => {
        'worklet';
        // Pass translation + flags to JS thread for decision
        runOnJS(handlePanEnd)(e.translationX, didCancel.value, didLock.value);
      })
      .onFinalize(() => {
        'worklet';
        if (didLock.value === 0) {
          micX.value = withTiming(0, SMOOTH);
          micY.value = withTiming(0, SMOOTH);
          micSc.value = withTiming(1, SMOOTH);
        }
      });

    const composed = Gesture.Race(tapGesture, panGesture);

    // ── Animated styles ───────────────────────────────────────────────────
    const micAnimStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: micX.value },
        { translateY: micY.value },
        { scale: micSc.value },
      ],
    }));
    const ripStyle = useAnimatedStyle(() => ({
      transform: [{ scale: ripSc.value }],
      opacity: ripOp.value,
    }));

    return (
      <View style={s.root}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[s.micWrap, micAnimStyle]}>
            <Animated.View style={[s.ripple, ripStyle]} />
            <View style={s.micBtn}>
              <Text style={s.micIco}>🎙️</Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  },
);

const s = StyleSheet.create({
  root: {
    width: MIC,
    height: MIC,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micWrap: {
    width: MIC,
    height: MIC,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: 'rgba(255,0,89,0.22)',
  },
  micBtn: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIco: { fontSize: 18 },
});
