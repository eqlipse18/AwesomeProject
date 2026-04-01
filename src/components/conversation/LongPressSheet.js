import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export const LongPressSheet = ({
  visible,
  message,
  isOwn,
  onClose,
  onCopy,
  onReact,
  onDelete,
}) => {
  if (!visible || !message) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={s.bg}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          entering={SlideInUp.duration(260).springify()}
          style={s.sheet}
        >
          {/* Reaction row */}
          <View style={s.rxRow}>
            {REACTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={s.rxBtn}
                onPress={() => {
                  onReact(e);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={s.rxEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.div} />

          {message.type !== 'image' && message.type !== 'video' && (
            <TouchableOpacity
              style={s.row}
              onPress={() => {
                onCopy();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={s.ico}>📋</Text>
              <Text style={s.lbl}>Copy</Text>
            </TouchableOpacity>
          )}

          {isOwn && (
            <TouchableOpacity
              style={s.row}
              onPress={() => {
                onDelete();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={s.ico}>🗑️</Text>
              <Text style={[s.lbl, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.row, { justifyContent: 'center', marginTop: 4 }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[s.lbl, { color: '#94A3B8' }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  rxRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
  },
  rxBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxEmoji: { fontSize: 28 },
  div: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  ico: { fontSize: 20 },
  lbl: { fontSize: 16, fontWeight: '500', color: '#0F172A' },
});
