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
  LinearTransition,
} from 'react-native-reanimated';
import { ReplyBar } from './ReplyBar';
import { VoiceRecorder } from './VoiceRecorder';

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
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const inputRef = useRef(null);
    const scale = useSharedValue(1);

    const sendStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

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

    const handleSend = useCallback(() => {
      if (!has) return;
      scale.value = withSpring(0.82, { duration: 80 }, () => {
        scale.value = withSpring(1);
      });
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
      scale,
    ]);

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
          {/* Attach button — hide while recording or editing */}
          {!isEdit && !isRecording && (
            <TouchableOpacity
              style={s.attBtn}
              onPress={onAttach}
              activeOpacity={0.7}
            >
              <Text style={s.attIco}>＋</Text>
            </TouchableOpacity>
          )}

          {/* Text input — hide while recording */}
          {!isRecording && (
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
          )}

          {/* Send button — only when text */}
          {has && !isRecording ? (
            <Animated.View style={sendStyle}>
              <TouchableOpacity
                style={[s.sendBtn, isEdit && has && s.sendEdit]}
                onPress={handleSend}
                activeOpacity={0.8}
              >
                <Text style={s.sendIco}>{isEdit ? '✓' : '↑'}</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : !isEdit ? (
            // Mic — only when no text and not editing
            <VoiceRecorder
              onSend={(uri, duration, waveform) => {
                onSendVoice?.(uri, duration, waveform);
              }}
              onCancel={() => setIsRecording(false)}
              onRecordingChange={setIsRecording}
            />
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attIco: { fontSize: 22, color: '#64748B', lineHeight: 24 },
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
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendEdit: { backgroundColor: '#F59E0B' },
  sendIco: { fontSize: 16, color: '#fff', fontWeight: '800', marginTop: -1 },
});
