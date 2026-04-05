import React from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];
const MENU_W = 210;
const RX_W = 292;
const RX_H = 56;
const SAFE_TOP = 80;
const SAFE_BOTTOM = 120;
const PAD = 14;

// ── Inline bubble preview (no gestures) ──────────────────────────────────
const BubblePreview = ({ message, isOwn }) => {
  const R = 20;
  const isMedia = message.type === 'image' || message.type === 'video';
  const isDeleted = message.type === 'deleted';

  if (isDeleted) {
    return (
      <View style={[bp.bbl, bp.deleted, { borderRadius: R }]}>
        <Text style={bp.deletedTxt}>🚫 This message was deleted</Text>
      </View>
    );
  }
  if (isMedia) {
    return (
      <View style={{ borderRadius: R, overflow: 'hidden' }}>
        <Image
          source={{ uri: message.content }}
          style={bp.img}
          resizeMode="cover"
        />
        {message.type === 'video' && (
          <View style={bp.videoOverlay}>
            <Text style={{ fontSize: 28, color: '#fff' }}>▶</Text>
          </View>
        )}
      </View>
    );
  }
  if (isOwn) {
    return (
      <LinearGradient
        colors={['#FF0059', '#FF5289']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[bp.bbl, { borderRadius: R }]}
      >
        {message.isEdited && <Text style={bp.editedOwn}>edited</Text>}
        <Text style={bp.txtOwn}>{message.content}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={[bp.bbl, bp.other, { borderRadius: R }]}>
      {message.isEdited && <Text style={bp.editedOther}>edited</Text>}
      <Text style={bp.txtOther}>{message.content}</Text>
    </View>
  );
};

const bp = StyleSheet.create({
  bbl: { paddingHorizontal: 14, paddingVertical: 10, maxWidth: W * 0.72 },
  other: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  txtOwn: { fontSize: 15, color: '#fff', lineHeight: 22 },
  txtOther: { fontSize: 15, color: '#0F172A', lineHeight: 22 },
  editedOwn: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  editedOther: {
    fontSize: 10,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  deleted: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deletedTxt: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },
  img: { width: W * 0.6, height: W * 0.6 * 1.05 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
});

// ── Main Component ────────────────────────────────────────────────────────
export const FloatingContextMenu = ({
  visible,
  message,
  isOwn,
  bubbleLayout, // { x, y, width, height } from ref.measure()
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) => {
  if (!visible || !message || !bubbleLayout) return null;

  const { x: bx, y: by, width: bw, height: bh } = bubbleLayout;

  // ── Position calculations ──
  // Reactions pill — centered above bubble
  const rxLeft = Math.max(
    PAD,
    Math.min(bx + bw / 2 - RX_W / 2, W - RX_W - PAD),
  );

  // Check if we have space above for reactions
  const hasSpaceAbove = by > SAFE_TOP + RX_H + 12 + bh;

  // Bubble preview top — keep near original but safe
  const bubbleTop = hasSpaceAbove
    ? Math.max(SAFE_TOP + RX_H + 12, by - 8)
    : Math.min(by + 8, H - SAFE_BOTTOM - bh - RX_H - 80);

  const rxTop = hasSpaceAbove ? bubbleTop - RX_H - 8 : bubbleTop + bh + 8;

  // Menu card — opposite side of reactions
  const menuTop = hasSpaceAbove ? bubbleTop + bh + 10 : rxTop + RX_H + 10;

  const menuLeft = isOwn
    ? Math.max(PAD, W - MENU_W - PAD)
    : Math.max(PAD + 16, Math.min(bx, W - MENU_W - PAD));

  const bubbleLeft = Math.max(PAD, Math.min(bx, W - bw - PAD));

  // ── Actions ──
  const actions = [
    { key: 'reply', ico: '↩️', label: 'Reply' },
    { key: 'copy', ico: '📋', label: 'Copy', hide: message.type !== 'text' },
    {
      key: 'edit',
      ico: '✏️',
      label: 'Edit',
      hide: !isOwn || message.type !== 'text' || message.type === 'deleted',
    },
    {
      key: 'unsend',
      ico: '🗑️',
      label: 'Unsend',
      danger: true,
      hide: !isOwn || message.type === 'deleted',
    },
  ].filter(a => !a.hide);

  const handleAction = key => {
    onClose();
    setTimeout(() => {
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
    }, 200);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ── Blurred dark overlay ── */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFillObject}
      >
        <Pressable style={s.overlay} onPress={onClose} />
      </Animated.View>

      {/* ── Reactions pill ── */}
      <Animated.View
        entering={FadeInDown.springify().damping(16).stiffness(260)}
        style={[s.rxPill, { top: rxTop, left: rxLeft, width: RX_W }]}
      >
        {REACTIONS.map((emoji, i) => (
          <Animated.View
            key={emoji}
            entering={FadeInDown.delay(i * 28)
              .springify()
              .damping(18)}
          >
            <TouchableOpacity
              style={s.rxBtn}
              onPress={() => {
                onReact?.(emoji);
                onClose();
              }}
              activeOpacity={0.6}
            >
              <Text style={s.rxEmoji}>{emoji}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>

      {/* ── Bubble preview (floating) ── */}
      <Animated.View
        entering={FadeIn.duration(160)}
        style={[s.bubbleWrap, { top: bubbleTop, left: bubbleLeft }]}
      >
        <BubblePreview message={message} isOwn={isOwn} />
      </Animated.View>

      {/* ── Menu card ── */}
      <Animated.View
        entering={FadeInUp.springify().damping(18).stiffness(280).delay(50)}
        style={[s.menu, { top: menuTop, left: menuLeft, width: MENU_W }]}
      >
        {actions.map((a, i) => (
          <React.Fragment key={a.key}>
            {i > 0 && <View style={s.menuDiv} />}
            <TouchableOpacity
              style={s.menuRow}
              onPress={() => handleAction(a.key)}
              activeOpacity={0.7}
            >
              <Text style={s.menuIco}>{a.ico}</Text>
              <Text style={[s.menuTxt, a.danger && s.danger]}>{a.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)' },

  // Reactions pill
  rxPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 32,
    height: RX_H,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 10,
  },
  rxBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 21,
  },
  rxEmoji: { fontSize: 27 },

  // Bubble preview
  bubbleWrap: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 14,
    zIndex: 9,
  },

  // Menu
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  menuDiv: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  menuIco: { fontSize: 19 },
  menuTxt: { fontSize: 15, fontWeight: '500', color: '#0F172A', flex: 1 },
  danger: { color: '#EF4444' },
});
