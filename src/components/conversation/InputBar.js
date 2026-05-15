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
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ReplyBar } from './ReplyBar';

export const InputBar = forwardRef(
  (
    {
      onSend,
      emitTyping,
      replyingTo,
      onCancelReply,
      myUserId,
      editingMsg,
      onCancelEdit,
      onEditSave,
      onFocusChange,
    },
    ref,
  ) => {
    const [text, setText] = useState('');
    const inputRef = useRef(null);
    const scale = useSharedValue(1);

    const has = text.length > 0 && text.trim().length > 0;
    const isEdit = !!editingMsg;

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      if (editingMsg) {
        setText(editingMsg.content);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else setText('');
    }, [editingMsg]);

    const handleSend = useCallback(() => {
      if (!has) return;
      // ✅ Single animation — only on button press, not on message arrival
      scale.value = withSpring(0.84, { duration: 70 }, () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
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

    const sendStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

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

        {/* Bar */}
        <View style={s.bar}>
          {/* Text input */}
          <TextInput
            ref={inputRef}
            style={[s.input, isEdit && s.inputEdit]}
            value={text}
            onChangeText={t => {
              setText(t);
              emitTyping?.();
            }}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            placeholder={isEdit ? 'Edit message...' : 'Message...'}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={1000}
          />

          {/* Send button — always visible when text present */}
          {has && (
            <Animated.View
              style={sendStyle}
              entering={FadeIn.duration(20)} // ← ADD
              exiting={FadeOut.duration(30)}
            >
              <TouchableOpacity
                style={[s.sendBtn, isEdit && s.sendEdit]}
                onPress={handleSend}
                activeOpacity={0.85}
              >
                <Text style={s.sendIco}>{isEdit ? '✓' : '↑'}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
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
  sendIco: { fontSize: 16, color: '#fff', fontWeight: '800' },
});
