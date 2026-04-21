import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

const ITEMS = [
  { key: 'media', ico: '🖼️', label: 'View Shared Media' },
  { key: 'search', ico: '🔍', label: 'Search Messages' },
  { key: 'mute', ico: '🔕', label: 'Mute Notifications', toggle: true },
  { key: 'clear', ico: '🗑️', label: 'Clear Chat', danger: true },
  { key: 'block', ico: '🚫', label: 'Block & Report', danger: true },
];

export const ChatMenuSheet = ({ visible, isMuted, onClose, onSelect }) => (
  <Modal
    visible={visible}
    transparent
    animationType="none"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      style={s.backdrop}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} />
    </Animated.View>

    <Animated.View
      entering={SlideInDown.springify().damping(20).stiffness(260)}
      exiting={SlideOutDown.duration(200)}
      style={s.sheet}
    >
      <View style={s.handle} />

      {ITEMS.map((item, i) => (
        <React.Fragment key={item.key}>
          {i > 0 && <View style={s.div} />}
          <TouchableOpacity
            style={s.row}
            onPress={() => {
              onClose();
              onSelect(item.key);
            }}
            activeOpacity={0.7}
          >
            <Text style={s.ico}>{item.ico}</Text>
            <Text style={[s.label, item.danger && s.danger]}>
              {item.key === 'mute'
                ? isMuted
                  ? '🔔 Unmute Notifications'
                  : '🔕 Mute Notifications'
                : item.label}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}

      <View style={s.bottomPad} />
    </Animated.View>
  </Modal>
);

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  div: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  ico: { fontSize: 20, width: 28 },
  label: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  danger: { color: '#EF4444' },
  bottomPad: { height: 24 },
});
