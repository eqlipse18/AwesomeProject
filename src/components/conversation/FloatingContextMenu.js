import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const RX_H = 50;

export const FloatingContextMenu = ({
  visible,
  message,
  isOwn,
  bubbleLayout,
  otherImage,
  otherName, // ← pass from ConversationScreen
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  const HEADER_H = insets.top + 56;

  const rxPos = useMemo(() => {
    if (!bubbleLayout) return {};
    const { x: bx, y: by, width: bw } = bubbleLayout;
    const RX_W = 256;
    const rxLeft = isOwn
      ? Math.max(8, bx + bw - RX_W)
      : Math.max(8, Math.min(bx, W - RX_W - 8));
    // Always just above bubble
    const rxTop = Math.max(HEADER_H + 8, by - RX_H - 6);
    return { rxLeft, rxTop, RX_W };
  }, [bubbleLayout, isOwn, HEADER_H]);

  if (!visible || !message || !bubbleLayout) return null;

  const isDeleted = message.type === 'deleted';

  const actions = [
    { key: 'reply', ico: '↩️', label: 'Reply' },
    {
      key: 'copy',
      ico: '📋',
      label: 'Copy',
      hide: message.type !== 'text' || isDeleted,
    },
    {
      key: 'edit',
      ico: '✏️',
      label: 'Edit',
      hide: !isOwn || message.type !== 'text' || isDeleted,
    },
    {
      key: 'delete',
      ico: '🗑️',
      label: 'Delete',
      danger: true,
      hide: !isOwn || isDeleted,
    },
  ].filter(a => !a.hide);

  const handleAction = key => {
    onClose();
    setTimeout(() => {
      if (key === 'reply') onReply?.();
      else if (key === 'copy') onCopy?.();
      else if (key === 'edit') onEdit?.();
      else if (key === 'delete') onDelete?.();
    }, 150);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim overlay */}
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(150)}
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'rgba(0,0,0,0.5)' },
        ]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      {/* ── SWAPPED HEADER — same position as real header ── */}
      <Animated.View
        entering={FadeIn.duration(120)}
        style={[s.header, { paddingTop: insets.top, height: HEADER_H }]}
      >
        {/* Left — close button */}
        <TouchableOpacity
          onPress={onClose}
          style={s.headerBtn}
          activeOpacity={0.7}
        >
          <Text style={s.headerIco}>←</Text>
        </TouchableOpacity>

        {/* Center — other user info (same as normal header) */}
        <View style={s.headerCenter}>
          {otherImage ? (
            <Image source={{ uri: otherImage }} style={s.headerAvt} />
          ) : (
            <View style={[s.headerAvt, s.headerAvtFb]}>
              <Text>👤</Text>
            </View>
          )}
          <Text style={s.headerName} numberOfLines={1}>
            {otherName}
          </Text>
        </View>

        {/* Right — action icons */}
        <View style={s.headerActions}>
          {actions.map(a => (
            <TouchableOpacity
              key={a.key}
              style={s.headerBtn}
              onPress={() => handleAction(a.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.actionIco, a.danger && s.actionIcoDanger]}>
                {a.ico}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ── REACTION STRIP — just above bubble, connected ── */}
      <Animated.View
        entering={FadeInDown.duration(180)
          .springify()
          .damping(22)
          .stiffness(360)}
        style={[
          s.rxStrip,
          {
            top: rxPos.rxTop,
            left: rxPos.rxLeft,
            width: rxPos.RX_W,
          },
        ]}
      >
        {REACTIONS.map((emoji, i) => (
          <Animated.View
            key={emoji}
            entering={FadeInDown.delay(i * 20)
              .duration(140)
              .springify()
              .damping(22)}
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
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  // Header — exact same style as ConversationScreen header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIco: { fontSize: 20, color: '#0F172A' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 4,
  },
  headerAvt: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  headerAvtFb: { justifyContent: 'center', alignItems: 'center' },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionIco: { fontSize: 19 },
  actionIcoDanger: { color: '#EF4444' },

  // Reaction strip
  rxStrip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 28,
    height: RX_H,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 14,
    zIndex: 15,
  },
  rxBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxEmoji: { fontSize: 24 },
});
