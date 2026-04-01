import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export const InputBar = ({ onSend, onAttach, emitTyping, sending }) => {
  const [text, setText] = useState('');
  const scale = useSharedValue(1);
  const sendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const has = text.trim().length > 0;

  const send = useCallback(() => {
    if (!has || sending) return;
    scale.value = withSpring(0.85, { duration: 100 }, () => {
      scale.value = withSpring(1);
    });
    onSend(text.trim());
    setText('');
  }, [text, sending, onSend, has]);

  return (
    <View style={s.bar}>
      <TouchableOpacity style={s.attBtn} onPress={onAttach} activeOpacity={0.7}>
        <Animated.Text style={s.attIco}>＋</Animated.Text>
      </TouchableOpacity>

      <TextInput
        style={s.input}
        value={text}
        onChangeText={t => {
          setText(t);
          emitTyping();
        }}
        placeholder="Message..."
        placeholderTextColor="#94A3B8"
        multiline
        maxLength={1000}
      />

      <Animated.View style={sendStyle}>
        <TouchableOpacity
          style={[s.sendBtn, !has && s.sendOff]}
          onPress={send}
          disabled={!has || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Animated.Text style={s.sendIco}>↑</Animated.Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
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
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOff: { backgroundColor: '#E2E8F0' },
  sendIco: { fontSize: 16, color: '#fff', fontWeight: '700', marginTop: -1 },
});
