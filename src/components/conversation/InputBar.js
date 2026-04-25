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
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  LinearTransition,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { ReplyBar } from './ReplyBar';
import { VoiceMicOverlay, MODE } from './VoiceMicOverlay';

const fmt = ms => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

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
      onFocusChange,
    },
    ref,
  ) => {
    const [text, setText] = useState('');
    const [mode, setMode] = useState(MODE.IDLE);
    const [dur, setDur] = useState(0);

    const inputRef = useRef(null);
    const micRef = useRef(null);
    const scale = useSharedValue(1);
    const dotOp = useSharedValue(1);

    const has = text.trim().length > 0;
    const isEdit = !!editingMsg;
    const isRec = mode !== MODE.IDLE;
    const isHold = mode === MODE.HOLD;
    const isTap = mode === MODE.TAP;
    const isLocked = mode === MODE.LOCKED;

    // mic is hidden (invisible) in TAP / LOCKED mode
    const micHidden = isTap || isLocked;

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      if (editingMsg) {
        setText(editingMsg.content);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else setText('');
    }, [editingMsg]);

    // ── Mode updates from VoiceMicOverlay ─────────────────────────────
    const handleModeChange = useCallback(
      (newMode, payload = {}) => {
        setMode(newMode);
        if (payload.dur !== undefined) setDur(payload.dur);

        if (newMode === MODE.HOLD) {
          dotOp.value = withRepeat(
            withSequence(
              withTiming(0.15, { duration: 500 }),
              withTiming(1, { duration: 500 }),
            ),
            -1,
          );
        } else if (newMode === MODE.IDLE) {
          dotOp.value = withTiming(1, { duration: 150 });
          setDur(0);
        }
        // TAP / LOCKED: dot blink already running from HOLD, leave it
      },
      [dotOp],
    );

    // ── Text send ─────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
      if (!has) return;
      scale.value = withSpring(0.82, { duration: 80 }, () => {
        scale.value = withSpring(1);
      });
      if (isEdit) onEditSave?.(editingMsg.messageId, text.trim());
      else onSend?.(text.trim(), replyingTo || null);
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
      scale,
    ]);

    // ── Voice send / delete — stable refs, called by overlay buttons ──
    const handleVoiceSend = useCallback(
      () => micRef.current?.stopRecording(false),
      [],
    );
    const handleVoiceDelete = useCallback(
      () => micRef.current?.deleteRecording(),
      [],
    );

    const sendStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));
    const dotStyle = useAnimatedStyle(() => ({ opacity: dotOp.value }));

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

        {/* Lock hint — floats above bar right-edge, above mic */}
        {isHold && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={s.lockHintAbove}
            pointerEvents="none"
          >
            <Text style={s.lockIco}>🔒</Text>
            <Text style={s.lockArrow}>▲</Text>
          </Animated.View>
        )}

        {/* ── Main bar ─────────────────────────────────────────────── */}
        <View style={s.bar}>
          {/* Recording overlay — z10, below mic (z20 in HOLD) */}
          {isRec && (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(130)}
              style={s.overlay}
              pointerEvents="box-none"
            >
              {/* Left — dot + timer */}
              <View style={s.recLeft}>
                <Animated.View style={[s.dot, dotStyle]} />
                <Text style={s.timerTxt}>{fmt(dur)}</Text>
              </View>

              {/* Center — waveform + slide hint */}
              <View style={s.recCenter}>
                <LottieView
                  source={require('../../../assets/animations/wave.json')}
                  autoPlay
                  loop
                  style={s.lottie}
                  colorFilters={[{ keypath: '**', color: '#FF0059' }]}
                />
                {isHold && (
                  <Text style={s.slideHint} numberOfLines={1}>
                    ◀ Slide to cancel
                  </Text>
                )}
              </View>

              {/* Right — TAP / LOCKED: trash + send */}
              {(isTap || isLocked) && (
                <Animated.View
                  entering={FadeIn.duration(160)}
                  style={s.recActions}
                >
                  <TouchableOpacity
                    style={s.trashBtn}
                    onPress={handleVoiceDelete}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Text style={s.trashIco}>🗑️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.sendVoiceBtn}
                    onPress={handleVoiceSend}
                    activeOpacity={0.85}
                    hitSlop={4}
                  >
                    <Text style={s.sendVoiceIco}>↑</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Right — HOLD: placeholder so layout matches mic width */}
              {isHold && <View style={s.micPlaceholder} />}
            </Animated.View>
          )}

          {/* Attach — hidden while recording or editing */}
          {!isEdit && !isRec && (
            <TouchableOpacity
              style={s.attBtn}
              onPress={onAttach}
              activeOpacity={0.7}
            >
              <Text style={s.attIco}>＋</Text>
            </TouchableOpacity>
          )}

          {/* Text input — hidden while recording */}
          {!isRec && (
            <TextInput
              ref={inputRef}
              onFocus={() => onFocusChange?.(true)} // ← add
              onBlur={() => onFocusChange?.(false)} // ← add
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
          )}

          {/* Spacer during recording — pushes mic to right edge */}
          {isRec && <View style={s.recSpacer} />}

          {/* Right slot */}
          {!isRec && has ? (
            <Animated.View style={sendStyle}>
              <TouchableOpacity
                style={[s.roundBtn, s.sendBtn, isEdit && s.sendEdit]}
                onPress={handleSend}
                activeOpacity={0.85}
              >
                <Text style={s.sendIco}>{isEdit ? '✓' : '↑'}</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : !isEdit ? (
            /*
             * Mic slot — always mounted so recording stays alive.
             *
             * ✅ KEY FIX:
             * In TAP/LOCKED the mic is opacity:0 (invisible) but was still
             * intercepting all touches at z20, blocking the overlay send button.
             *
             * Solution: wrap in a plain View with pointerEvents="none" when
             * hidden. This lets touches fall through to the overlay buttons.
             * The GestureDetector inside VoiceMicOverlay still works for the
             * next recording because RNGH ignores pointerEvents on ancestors.
             */
            <View
              style={[
                s.micSlot,
                isRec && s.micSlotRec, // z20 in any recording state
                micHidden && s.micSlotHidden, // opacity 0 in TAP/LOCKED
              ]}
              // ✅ pass touches through when mic is invisible
              pointerEvents={micHidden ? 'none' : 'auto'}
            >
              <VoiceMicOverlay
                ref={micRef}
                onModeChange={handleModeChange}
                onSendVoice={onSendVoice}
              />
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  },
);

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    minHeight: 58,
  },

  // z10 — below mic in HOLD, above nothing in TAP/LOCKED (mic is gone)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  recLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF0059' },
  timerTxt: { fontSize: 15, fontWeight: '700', color: '#FF0059', minWidth: 42 },
  recCenter: {
    flex: 1,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lottie: { width: '100%', height: 34 },
  slideHint: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  micPlaceholder: { width: 42, flexShrink: 0 },

  recActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashIco: { fontSize: 15 },
  sendVoiceBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendVoiceIco: { fontSize: 18, color: '#fff', fontWeight: '800' },

  recSpacer: { flex: 1 },

  lockHintAbove: {
    position: 'absolute',
    bottom: '100%',
    right: 10,
    alignItems: 'center',
    paddingBottom: 4,
    zIndex: 30,
  },
  lockIco: { fontSize: 15, textAlign: 'center' },
  lockArrow: { fontSize: 9, color: '#94A3B8', textAlign: 'center' },

  micSlot: { zIndex: 1 },
  micSlotRec: { zIndex: 20 },
  micSlotHidden: { opacity: 0 },

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
  input: {
    flex: 1,
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
});
