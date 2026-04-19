import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeOut,
  LinearTransition,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import NitroSound from 'react-native-nitro-sound';
import RNFS from 'react-native-fs';
import { ReplyBar } from './ReplyBar';

const { width: W } = Dimensions.get('window');

// ── Constants ──────────────────────────────────────────────────────────────
const CANCEL_THRESHOLD = -W * 0.28;
const LOCK_THRESHOLD = -70;
const MIN_DURATION_MS = 1000;
// A press shorter than this AND barely moved = TAP (enters tap mode)
const TAP_MAX_MS = 300;
const TAP_MAX_PX = 8;
const SMOOTH = { duration: 200, easing: Easing.out(Easing.cubic) };
const FAST = { duration: 150, easing: Easing.out(Easing.cubic) };

const fmtDur = ms => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
export const InputBar = forwardRef(
  (
    {
      onSend,
      onAttach,
      emitTyping,
      replyingTo,
      onCancelReply,
      myUserId,
      editingMsg,
      onCancelEdit,
      onEditSave,
      onSendVoice,
    },
    ref,
  ) => {
    // ── State ────────────────────────────────────────────────────────────
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    // tapMode = recording started via a quick tap (no hold gestures)
    const [isTapMode, setIsTapMode] = useState(false);
    const [duration, setDuration] = useState(0);

    // ── Refs ─────────────────────────────────────────────────────────────
    const inputRef = useRef(null);
    const isRecordingRef = useRef(false);
    const startedRef = useRef(false);
    const isLockedRef = useRef(false);
    const isTapModeRef = useRef(false);
    const barInterval = useRef(null);
    const durationRef = useRef(0);
    const waveformRef = useRef([]);

    // ── Shared values ────────────────────────────────────────────────────
    const micX = useSharedValue(0);
    const micY = useSharedValue(0);
    const micScale = useSharedValue(1);
    const rippleScale = useSharedValue(1);
    const rippleOpacity = useSharedValue(0);
    const cancelOpacity = useSharedValue(1);
    const lockOpacity = useSharedValue(1);
    const isCancelledSV = useSharedValue(0);
    const cancelHintX = useSharedValue(0);
    const lockHintY = useSharedValue(0);
    const dotOpacity = useSharedValue(1);
    // Worklet-safe flags — JS refs cannot be read inside 'worklet' on New Architecture
    const isLockedSV = useSharedValue(0); // 1 = locked
    const isTapModeSV = useSharedValue(0); // 1 = tap mode
    // Timestamp captured in onBegin worklet for accurate tap-vs-hold detection
    const pressStartTimeSV = useSharedValue(0); // ms from performance.now()

    const has = text.trim().length > 0;
    const isEdit = !!editingMsg;

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      if (editingMsg) {
        setText(editingMsg.content);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setText('');
      }
    }, [editingMsg]);

    // ── Permission ────────────────────────────────────────────────────────
    const getPermission = useCallback(async () => {
      if (Platform.OS !== 'android') return true;
      const r = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      return r === PermissionsAndroid.RESULTS.GRANTED;
    }, []);

    // ── Reset all animations ──────────────────────────────────────────────
    const resetAnims = useCallback(() => {
      micX.value = withTiming(0, SMOOTH);
      micY.value = withTiming(0, SMOOTH);
      micScale.value = withTiming(1, SMOOTH);
      rippleScale.value = withTiming(1, { duration: 180 });
      rippleOpacity.value = withTiming(0, { duration: 180 });
      cancelOpacity.value = withTiming(1, SMOOTH);
      lockOpacity.value = withTiming(1, SMOOTH);
      cancelHintX.value = withTiming(0, SMOOTH);
      lockHintY.value = withTiming(0, SMOOTH);
      dotOpacity.value = withTiming(1, { duration: 150 });
      isCancelledSV.value = 0;
      isLockedSV.value = 0;
      isTapModeSV.value = 0;
    }, [
      micX,
      micY,
      micScale,
      rippleScale,
      rippleOpacity,
      cancelOpacity,
      lockOpacity,
      cancelHintX,
      lockHintY,
      dotOpacity,
      isCancelledSV,
      isLockedSV,
      isTapModeSV,
    ]);

    // ── Core: start actual NitroSound recording ───────────────────────────
    const _startRecorder = useCallback(async () => {
      const ok = await getPermission();
      if (!ok) {
        startedRef.current = false;
        return;
      }

      isCancelledSV.value = 0;
      durationRef.current = 0;
      waveformRef.current = [];
      setDuration(0);

      const path = `${RNFS.CachesDirectoryPath}/voice_${Date.now()}.m4a`;
      try {
        await NitroSound.startRecorder(path);
        isRecordingRef.current = true;
        setIsRecording(true);

        // ── Ripple ──────────────────────────────────────────────────────
        rippleOpacity.value = 0.28;
        rippleScale.value = withRepeat(
          withSequence(
            withTiming(2.4, {
              duration: 1000,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(1, { duration: 0 }),
          ),
          -1,
        );
        rippleOpacity.value = withRepeat(
          withSequence(
            withTiming(0, { duration: 1000, easing: Easing.in(Easing.ease) }),
            withTiming(0.28, { duration: 0 }),
          ),
          -1,
        );

        // ── Blinking dot ─────────────────────────────────────────────────
        dotOpacity.value = withRepeat(
          withSequence(
            withTiming(0.15, { duration: 500 }),
            withTiming(1, { duration: 500 }),
          ),
          -1,
        );

        barInterval.current = setInterval(() => {
          durationRef.current += 1000;
          setDuration(durationRef.current);
          for (let i = 0; i < 5; i++) {
            waveformRef.current.push(Math.random() * 0.75 + 0.15);
          }
        }, 1000);
      } catch (e) {
        console.error('[InputBar/_startRecorder]', e.message);
        startedRef.current = false;
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    }, [getPermission, rippleScale, rippleOpacity, isCancelledSV, dotOpacity]);

    // ── Stop recording (send or cancel) ───────────────────────────────────
    const _stopRec = useCallback(
      async (cancelled = false) => {
        if (!isRecordingRef.current) return;
        isRecordingRef.current = false;
        startedRef.current = false;
        isTapModeRef.current = false;
        isLockedRef.current = false;
        clearInterval(barInterval.current);
        resetAnims();

        try {
          const uri = await NitroSound.stopRecorder();
          setIsRecording(false);
          setIsLocked(false);
          setIsTapMode(false);

          if (cancelled || durationRef.current < MIN_DURATION_MS) return;
          onSendVoice?.(uri, durationRef.current, [...waveformRef.current]);
        } catch (e) {
          console.error('[InputBar/_stopRec]', e.message);
          setIsRecording(false);
          setIsLocked(false);
          setIsTapMode(false);
        }
      },
      [onSendVoice, resetAnims],
    );

    const deleteRec = useCallback(() => _stopRec(true), [_stopRec]);
    const sendRec = useCallback(() => _stopRec(false), [_stopRec]);

    // ── Lock recording ────────────────────────────────────────────────────
    const lockRec = useCallback(() => {
      if (isLockedRef.current) return;
      isLockedRef.current = true;
      isLockedSV.value = 1;
      isTapModeRef.current = false;
      isTapModeSV.value = 0;
      setIsLocked(true);
      setIsTapMode(false);
      micX.value = withTiming(0, SMOOTH);
      micY.value = withTiming(0, SMOOTH);
      micScale.value = withTiming(1, SMOOTH);
      cancelHintX.value = withTiming(0, SMOOTH);
      lockHintY.value = withTiming(0, SMOOTH);
      cancelOpacity.value = withTiming(0, FAST);
      lockOpacity.value = withTiming(0, FAST);
    }, [
      micX,
      micY,
      micScale,
      cancelHintX,
      lockHintY,
      cancelOpacity,
      lockOpacity,
      isLockedSV,
      isTapModeSV,
    ]);

    // ─────────────────────────────────────────────────────────────────────
    // HOLD PATH
    // Called via runOnJS — MUST be synchronous (no async/await allowed).
    // _startRecorder is async but we fire-and-forget it; its internal
    // isRecordingRef guard prevents any double-start race.
    // ─────────────────────────────────────────────────────────────────────
    const startHoldMode = useCallback(() => {
      if (startedRef.current) return;
      startedRef.current = true;
      isTapModeRef.current = false;
      isTapModeSV.value = 0;
      isLockedRef.current = false;
      isLockedSV.value = 0;
      setIsLocked(false);
      setIsTapMode(false);

      // Pulse cancel hint ←
      cancelHintX.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
      // Pulse lock hint ↑
      lockHintY.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );

      // Fire-and-forget — async internals are safe, guarded by isRecordingRef
      _startRecorder();
    }, [_startRecorder, cancelHintX, lockHintY, isTapModeSV, isLockedSV]);

    // ── Called from gesture onEnd to decide tap vs hold ───────────────────
    // elapsedMs is computed on the UI thread in onEnd for accuracy.
    const handleHoldGestureEnd = useCallback(
      (tx, ty, wasCancelled, elapsedMs) => {
        // If already locked, release does nothing — locked mode exits only
        // via send/delete buttons.
        if (isLockedRef.current) {
          micX.value = withTiming(0, SMOOTH);
          micY.value = withTiming(0, SMOOTH);
          micScale.value = withTiming(1, SMOOTH);
          return;
        }

        const movedX = Math.abs(tx);
        const movedY = Math.abs(ty);
        const isQuickTap =
          elapsedMs < TAP_MAX_MS &&
          movedX < TAP_MAX_PX &&
          movedY < TAP_MAX_PX &&
          !wasCancelled;

        if (isQuickTap) {
          // Seamlessly transition into tap mode.
          // Recording already started in startHoldMode; just flip the flags.
          isTapModeRef.current = true;
          isTapModeSV.value = 1;
          // Snap mic back to rest + stop hint pulses
          micX.value = withTiming(0, SMOOTH);
          micY.value = withTiming(0, SMOOTH);
          micScale.value = withTiming(1, SMOOTH);
          cancelHintX.value = withTiming(0, SMOOTH);
          lockHintY.value = withTiming(0, SMOOTH);
          setIsTapMode(true);
        } else {
          // Normal hold release = send (or cancel if slid left)
          _stopRec(!!wasCancelled);
        }
      },
      [_stopRec, micX, micY, micScale, cancelHintX, lockHintY, isTapModeSV],
    );

    // ── Named JS-thread callback for gesture onBegin ─────────────────────
    // runOnJS requires a stable named function — no IIFEs.
    // Timestamp is NOT captured here (too late due to runOnJS scheduling);
    // it's captured directly in the onBegin worklet via pressStartTimeSV.
    const onGestureBeginJS = useCallback(() => {
      startHoldMode();
    }, [startHoldMode]);

    // ── Pan gesture (hold-to-record) ─────────────────────────────────────
    // minDistance(0) → fires onBegin immediately on any touch.
    const micGesture = Gesture.Pan()
      .minDistance(0)
      .onBegin(() => {
        'worklet';
        // Capture timestamp HERE on the UI thread — most accurate for tap detection.
        // runOnJS has scheduling latency so Date.now() there would be stale.
        pressStartTimeSV.value = performance.now();
        micScale.value = withTiming(1.28, { duration: 180 });
        runOnJS(onGestureBeginJS)();
      })
      .onUpdate(e => {
        'worklet';
        // Use shared values (not JS refs) for worklet-safe reads on New Architecture
        if (isLockedSV.value === 1 || isTapModeSV.value === 1) return;

        const tx = e.translationX;
        const ty = e.translationY;
        const goLeft = tx < 0 && Math.abs(tx) >= Math.abs(ty);
        const goUp = ty < 0 && Math.abs(ty) > Math.abs(tx);

        if (goLeft) {
          micX.value = Math.max(tx, CANCEL_THRESHOLD * 1.3);
          micY.value = withTiming(0, SMOOTH);
          cancelOpacity.value = interpolate(
            tx,
            [0, CANCEL_THRESHOLD],
            [1, 0.1],
            Extrapolation.CLAMP,
          );
          lockOpacity.value = interpolate(
            tx,
            [0, -40],
            [1, 0],
            Extrapolation.CLAMP,
          );
          if (tx < CANCEL_THRESHOLD) isCancelledSV.value = 1;
        } else if (goUp) {
          micY.value = Math.max(ty, LOCK_THRESHOLD * 1.3);
          micX.value = withTiming(0, SMOOTH);
          cancelOpacity.value = interpolate(
            ty,
            [0, -40],
            [1, 0],
            Extrapolation.CLAMP,
          );
          if (ty < LOCK_THRESHOLD) runOnJS(lockRec)();
        }
      })
      .onEnd(e => {
        'worklet';
        // Compute elapsed entirely on the UI thread — no JS-thread Date.now() needed.
        const elapsedMs = performance.now() - pressStartTimeSV.value;
        const cancelled =
          isCancelledSV.value === 1 || e.translationX < CANCEL_THRESHOLD;
        runOnJS(handleHoldGestureEnd)(
          e.translationX,
          e.translationY,
          cancelled,
          elapsedMs,
        );
      })
      .onFinalize(() => {
        'worklet';
        if (isLockedSV.value === 0 && isTapModeSV.value === 0) {
          micX.value = withTiming(0, SMOOTH);
          micY.value = withTiming(0, SMOOTH);
          micScale.value = withTiming(1, SMOOTH);
        }
      });

    // ── Animated styles ───────────────────────────────────────────────────
    const micStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: micX.value },
        { translateY: micY.value },
        { scale: micScale.value },
      ],
    }));

    const rippleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    }));

    const cancelArrowStyle = useAnimatedStyle(() => ({
      opacity: cancelOpacity.value,
      transform: [{ translateX: cancelHintX.value }],
    }));

    const lockArrowStyle = useAnimatedStyle(() => ({
      opacity: lockOpacity.value,
      transform: [{ translateY: lockHintY.value }],
    }));

    const dotBlinkStyle = useAnimatedStyle(() => ({
      opacity: dotOpacity.value,
    }));

    // ── Text send ─────────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
      if (!has) return;
      if (isEdit) {
        onEditSave?.(editingMsg.messageId, text.trim());
      } else {
        onSend?.(text.trim(), replyingTo || null);
      }
      setText('');
      onCancelReply?.();
    }, [
      text,
      has,
      isEdit,
      onSend,
      replyingTo,
      editingMsg,
      onEditSave,
      onCancelReply,
    ]);

    // ─────────────────────────────────────────────────────────────────────
    // RIGHT SIDE RENDERING
    //
    // Priority order matters — isTapMode and isLocked MUST come before the
    // generic isRecording branch, because all three have isRecording=true.
    //
    //  1. isLocked                        → send button only
    //  2. isTapMode                       → send button only (no lock hint, no pan)
    //  3. isRecording && !isTapMode       → hold-mode mic + lock hint above
    //  4. has text (no rec)               → text send button
    //  5. isEdit + has text               → edit-send button
    //  6. default                         → idle mic
    // ─────────────────────────────────────────────────────────────────────
    const renderRight = () => {
      // 1 ── Locked ─────────────────────────────────────────────────────
      if (isLocked) {
        return (
          <Animated.View entering={FadeIn.duration(180)}>
            <TouchableOpacity
              style={[s.roundBtn, s.sendBtn]}
              onPress={sendRec}
              activeOpacity={0.85}
            >
              <Text style={s.sendIco}>↑</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      }

      // 2 ── Tap mode — send button only, no mic gesture, no lock hint ──
      // NOTE: must be checked BEFORE isRecording because both are true
      // simultaneously during tap-mode recording.
      if (isTapMode) {
        return (
          <Animated.View entering={FadeIn.duration(180)}>
            <TouchableOpacity
              style={[s.roundBtn, s.sendBtn]}
              onPress={sendRec}
              activeOpacity={0.85}
            >
              <Text style={s.sendIco}>↑</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      }

      // 3 ── Hold mode: recording, not locked, not tap ──────────────────
      // Shows draggable mic + lock hint above it.
      if (isRecording) {
        return (
          <View style={s.micArea}>
            {/* Lock hint above mic — only in hold mode */}
            <Animated.View
              entering={FadeIn.duration(250)}
              style={s.lockHintWrap}
            >
              <Animated.View style={lockArrowStyle}>
                <Text style={s.lockHintIco}>🔒</Text>
                <Text style={s.lockArrowTxt}>▲</Text>
              </Animated.View>
            </Animated.View>

            <GestureDetector gesture={micGesture}>
              <Animated.View style={[s.micWrap, micStyle]}>
                <Animated.View style={[s.ripple, rippleStyle]} />
                <View style={[s.roundBtn, s.micBtn, s.micBtnRec]}>
                  <Text style={s.micIco}>🎙️</Text>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        );
      }

      // 4 ── Has text (no recording) ─────────────────────────────────────
      if (has && !isEdit) {
        return (
          <Animated.View entering={FadeIn.duration(150)}>
            <TouchableOpacity
              style={[s.roundBtn, s.sendBtn]}
              onPress={handleSend}
              activeOpacity={0.85}
            >
              <Text style={s.sendIco}>↑</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      }

      // 5 ── Edit mode ───────────────────────────────────────────────────
      if (isEdit) {
        return has ? (
          <TouchableOpacity
            style={[s.roundBtn, s.sendBtn, s.sendEdit]}
            onPress={handleSend}
            activeOpacity={0.85}
          >
            <Text style={s.sendIco}>✓</Text>
          </TouchableOpacity>
        ) : null;
      }

      // 6 ── Default mic (idle) ─────────────────────────────────────────
      // The pan gesture handles both tap detection and hold-to-record.
      return (
        <View style={s.micArea}>
          <GestureDetector gesture={micGesture}>
            <Animated.View style={[s.micWrap, micStyle]}>
              <Animated.View style={[s.ripple, rippleStyle]} />
              <View style={[s.roundBtn, s.micBtn]}>
                <Text style={s.micIco}>🎙️</Text>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      );
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
      <Animated.View layout={LinearTransition.springify()}>
        {/* Reply bar */}
        {replyingTo && !isEdit && (
          <ReplyBar
            replyingTo={replyingTo}
            myUserId={myUserId}
            onCancel={onCancelReply}
          />
        )}

        {/* Edit banner */}
        {isEdit && (
          <Animated.View
            style={s.editBanner}
            layout={LinearTransition.springify()}
          >
            <Text style={s.editBannerTxt}>✏️ Editing message</Text>
            <TouchableOpacity onPress={onCancelEdit} hitSlop={8}>
              <Text style={s.editBannerClose}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={s.bar}>
          {/* ── LEFT ────────────────────────────────────────────────────── */}

          {/* Attach button — hidden while recording or editing */}
          {!isRecording && !isEdit && (
            <Animated.View exiting={FadeOut.duration(140)}>
              <TouchableOpacity
                style={s.attBtn}
                onPress={onAttach}
                activeOpacity={0.7}
              >
                <Text style={s.attIco}>＋</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Delete button — visible during ANY recording mode */}
          {isRecording && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(150)}
            >
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={deleteRec}
                activeOpacity={0.7}
              >
                <Text style={s.deleteIco}>🗑️</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── CENTER ──────────────────────────────────────────────────── */}
          <View style={s.centerArea}>
            {!isRecording ? (
              <TextInput
                ref={inputRef}
                style={[s.input, isEdit && s.inputEdit]}
                value={text}
                onChangeText={t => {
                  setText(t);
                  emitTyping?.();
                }}
                placeholder={isEdit ? 'Edit message...' : 'Message...'}
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={1000}
              />
            ) : (
              <Animated.View
                entering={FadeIn.duration(160)}
                exiting={FadeOut.duration(140)}
                style={s.recRow}
              >
                {/* Timer */}
                <View style={s.timerRow}>
                  <Animated.View style={[s.redDot, dotBlinkStyle]} />
                  <Text style={s.timerTxt}>{fmtDur(duration)}</Text>
                </View>

                {/* Waveform */}
                <View style={s.waveWrap}>
                  <LottieView
                    source={require('../../../assets/animations/wave.json')}
                    autoPlay
                    loop
                    style={s.lottie}
                    colorFilters={[{ keypath: '**', color: '#FF0059' }]}
                  />
                </View>

                {/* Slide-to-cancel hint — only in hold mode (not tap, not locked) */}
                {!isTapMode && !isLocked && (
                  <Animated.View style={[s.cancelHint, cancelArrowStyle]}>
                    <Text style={s.cancelHintTxt} numberOfLines={1}>
                      ◀ Slide to cancel
                    </Text>
                  </Animated.View>
                )}
              </Animated.View>
            )}
          </View>

          {/* ── RIGHT ───────────────────────────────────────────────────── */}
          {renderRight()}
        </View>
      </Animated.View>
    );
  },
);

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },

  // ── Edit banner ──────────────────────────────────────────────────────
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE08B',
  },
  editBannerTxt: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  editBannerClose: { fontSize: 13, color: '#92400E', fontWeight: '700' },

  // ── Left buttons ─────────────────────────────────────────────────────
  attBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  attIco: { fontSize: 20, color: '#64748B', lineHeight: 22 },

  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginBottom: 2,
  },
  deleteIco: { fontSize: 15 },

  // ── Center ───────────────────────────────────────────────────────────
  centerArea: { flex: 1, justifyContent: 'center', minHeight: 38 },

  input: {
    minHeight: 38,
    maxHeight: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputEdit: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },

  // ── Recording row ─────────────────────────────────────────────────────
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: '#FFF5F7',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFE4EC',
    overflow: 'hidden',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF0059',
  },
  timerTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 34,
  },
  waveWrap: { flex: 1, height: 34, justifyContent: 'center' },
  lottie: { width: '100%', height: 34 },

  cancelHint: { flexShrink: 0, maxWidth: 118 },
  cancelHintTxt: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },

  // ── Mic area ──────────────────────────────────────────────────────────
  micArea: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lockHintWrap: {
    alignItems: 'center',
    marginBottom: 3,
  },
  lockHintIco: { fontSize: 14 },
  lockArrowTxt: {
    fontSize: 9,
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '700',
  },

  // ── Shared buttons ────────────────────────────────────────────────────
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: { backgroundColor: '#FF0059' },
  sendEdit: { backgroundColor: '#F59E0B' },
  sendIco: { fontSize: 16, color: '#fff', fontWeight: '800' },

  micWrap: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,0,89,0.22)',
  },
  micBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  micBtnRec: { backgroundColor: '#FF0059', borderColor: '#FF0059' },
  micIco: { fontSize: 16 },
});
