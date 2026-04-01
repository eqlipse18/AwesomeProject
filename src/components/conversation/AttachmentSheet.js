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

export const AttachmentSheet = ({ visible, onClose, onCamera, onGallery }) => {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={s.bg}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          entering={SlideInUp.duration(260).springify()}
          style={s.sheet}
        >
          <View style={s.row}>
            <TouchableOpacity
              style={s.opt}
              onPress={onCamera}
              activeOpacity={0.8}
            >
              <View style={[s.ico, { backgroundColor: '#FFF0F5' }]}>
                <Text style={{ fontSize: 30 }}>📷</Text>
              </View>
              <Text style={s.lbl}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.opt}
              onPress={onGallery}
              activeOpacity={0.8}
            >
              <View style={[s.ico, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 30 }}>🖼️</Text>
              </View>
              <Text style={s.lbl}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.cancel}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={s.cancelTxt}>Cancel</Text>
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
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  opt: { alignItems: 'center', gap: 10 },
  ico: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lbl: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  cancel: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
  },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: '#64748B' },
});
