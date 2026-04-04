import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];
const MENU_W = 200;

export const FloatingContextMenu = ({
  visible,
  message,
  isOwn,
  pageY,
  pageX,
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) => {
  if (!visible || !message) return null;

  const showAbove = pageY > H * 0.58;
  const menuLeft = isOwn
    ? Math.min(pageX, W - MENU_W - 16)
    : Math.max(16, pageX - 20);

  const _entering = FadeInDown.springify().damping(18).stiffness(320);
  const _layout = LinearTransition.springify();

  const actions = [
    { key: 'reply', ico: '↩️', label: 'Reply', always: true },
    {
      key: 'copy',
      ico: '📋',
      label: 'Copy',
      show:
        message.type !== 'image' &&
        message.type !== 'video' &&
        message.type !== 'deleted',
    },
    {
      key: 'edit',
      ico: '✏️',
      label: 'Edit',
      show: isOwn && message.type === 'text' && message.type !== 'deleted',
    },
    {
      key: 'unsend',
      ico: '🗑️',
      label: 'Unsend',
      show: isOwn && message.type !== 'deleted',
      danger: true,
    },
  ];
  8;
  const handleAction = key => {
    switch (key) {
      case 'reply':
        onReply?.();
        break;
      case 'copy':
        onCopy?.();
        break;
      case 'edit':
        onEdit?.();
        break;
      case 'unsend':
        onDelete?.();
        break;
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Dim backdrop */}
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(160)}
        style={StyleSheet.absoluteFillObject}
      >
        <Pressable style={s.backdrop} onPress={onClose} />
      </Animated.View>

      {/* Floating card */}
      <Animated.View
        entering={_entering}
        layout={_layout}
        style={[
          s.card,
          { left: menuLeft, width: MENU_W },
          showAbove ? { bottom: H - pageY + 10 } : { top: pageY + 10 },
        ]}
      >
        {/* Emoji reaction strip */}
        <View style={s.rxRow}>
          {REACTIONS.map((emoji, i) => (
            <Animated.View
              key={emoji}
              entering={FadeInDown.springify()
                .delay(i * 25)
                .damping(18)}
            >
              <TouchableOpacity
                style={s.rxBtn}
                onPress={() => {
                  onReact?.(emoji);
                  onClose();
                }}
                activeOpacity={0.65}
              >
                <Text style={s.rxEmoji}>{emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={s.divider} />

        {/* Action list */}
        {actions.map(a => {
          if (!a.always && !a.show) return null;
          return (
            <Animated.View key={a.key} entering={_entering} layout={_layout}>
              <TouchableOpacity
                style={s.action}
                onPress={() => handleAction(a.key)}
                activeOpacity={0.7}
              >
                <Text style={s.actionIco}>{a.ico}</Text>
                <Text style={[s.actionTxt, a.danger && { color: '#EF4444' }]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' },
  card: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 999,
  },
  rxRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rxBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxEmoji: { fontSize: 20 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 0 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  actionIco: { fontSize: 17 },
  actionTxt: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
});
