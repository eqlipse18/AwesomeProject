import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: W } = Dimensions.get('window');
const MENU_W = 220;

const ITEMS = [
  { key: 'media', label: 'Media, links & docs' },
  { key: 'search', label: 'Search' },
  { key: 'mute', label: 'Mute notifications', toggle: true },
  { key: 'clear', label: 'Clear chat', danger: false },
  { key: 'block', label: 'Block & Report', danger: true },
];

export const ChatMenuSheet = ({ visible, isMuted, onClose, onSelect }) => {
  const opacity = useSharedValue(0);
  const scaleY = useSharedValue(0.88);
  const transY = useSharedValue(-8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
      });
      scaleY.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
      transY.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      opacity.value = withTiming(0, {
        duration: 120,
        easing: Easing.in(Easing.cubic),
      });
      scaleY.value = withTiming(0.88, { duration: 120 });
      transY.value = withTiming(-8, { duration: 120 });
    }
  }, [visible, opacity, scaleY, transY]);

  const menuStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scaleY: scaleY.value }, { translateY: transY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.3,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — very light */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, s.backdrop, backdropStyle]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      {/* Dropdown — top right, below header */}
      <Animated.View style={[s.menu, menuStyle]}>
        {ITEMS.map((item, i) => (
          <React.Fragment key={item.key}>
            {i > 0 && <View style={s.div} />}
            <TouchableOpacity
              style={s.row}
              onPress={() => {
                onClose();
                setTimeout(() => onSelect(item.key), 150);
              }}
              activeOpacity={0.6}
            >
              <Text style={[s.label, item.danger && s.danger]}>
                {item.key === 'mute'
                  ? isMuted
                    ? 'Unmute notifications'
                    : 'Mute notifications'
                  : item.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { backgroundColor: '#9999994a' },
  menu: {
    position: 'absolute',
    top: 110, // below header
    right: 8,
    width: MENU_W,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 14,
    transformOrigin: 'top right',
    zIndex: 999,
  },
  div: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
  },
  row: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  label: { fontSize: 15, color: '#0F172A' },
  danger: { color: '#EF4444' },
});
