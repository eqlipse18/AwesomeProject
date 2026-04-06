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
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
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
const SAFE_TOP = 96; // header height approx
const SAFE_BOTTOM = 110; // input bar approx
const MENU_H_EST = 200;

// ── Static bubble preview (no interaction) ────────────────────────────────
const BubblePreview = ({ message, isOwn, bubbleLayout }) => {
  const { width: bw } = bubbleLayout;
  const R = 20;

  if (message.type === 'deleted') {
    return (
      <View
        style={[
          bp.wrap,
          {
            borderRadius: R,
            backgroundColor: '#F1F5F9',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            width: bw,
          },
        ]}
      >
        <Text style={bp.deletedTxt}>🚫 This message was deleted</Text>
      </View>
    );
  }
  if (message.type === 'image' || message.type === 'video') {
    return (
      <View style={{ borderRadius: R, overflow: 'hidden', width: bw }}>
        <Image
          source={{ uri: message.content }}
          style={{ width: bw, height: bw * 1.1 }}
          resizeMode="cover"
        />
        {message.type === 'video' && (
          <View style={bp.videoOverlay}>
            <Text style={{ fontSize: 26, color: '#fff' }}>▶</Text>
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
        style={[bp.wrap, { borderRadius: R }]}
      >
        <Text style={bp.txtOwn}>{message.content}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={[bp.wrap, bp.other, { borderRadius: R }]}>
      <Text style={bp.txtOther}>{message.content}</Text>
    </View>
  );
};

const bp = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingVertical: 10 },
  other: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  txtOwn: { fontSize: 15, color: '#fff', lineHeight: 22 },
  txtOther: { fontSize: 15, color: '#0F172A', lineHeight: 22 },
  deletedTxt: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

// ════════════════════════════════════════════════════════════════════════════
export const FloatingContextMenu = ({
  visible,
  message,
  isOwn,
  bubbleLayout,
  onClose,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const pos = useMemo(() => {
    if (!bubbleLayout) return {};
    const { x: bx, y: by, width: bw, height: bh } = bubbleLayout;

    // ── Reactions pill ── prefer ABOVE bubble (iMessage style)
    const rxLeft = Math.max(8, Math.min(bx + bw / 2 - RX_W / 2, W - RX_W - 8));
    const rxAbove = by - RX_H - 10;
    const rxTop = rxAbove >= SAFE_TOP ? rxAbove : by + bh + 10;
    const rxIsAbove = rxAbove >= SAFE_TOP;

    // ── Bubble preview ── EXACT same position (no movement)
    const bubbleX = bx;
    const bubbleY = by;

    // ── Menu card ──
    // If reactions above: menu goes below bubble
    // If reactions below: menu goes above bubble
    let menuTop, menuLeft;
    if (rxIsAbove) {
      menuTop = by + bh + 10;
    } else {
      menuTop = rxTop - MENU_H_EST - 10; // above reactions
    }
    // Clamp menu to safe bounds
    menuTop = Math.max(
      SAFE_TOP,
      Math.min(menuTop, H - SAFE_BOTTOM - MENU_H_EST),
    );
    menuLeft = isOwn
      ? Math.max(8, W - MENU_W - 8)
      : Math.max(8, Math.min(bx, W - MENU_W - 8));

    return { rxLeft, rxTop, bubbleX, bubbleY, menuTop, menuLeft };
  }, [bubbleLayout, isOwn]);

  if (!visible || !message || !bubbleLayout) return null;

  const actions = [
    { key: 'reply', ico: '↩️', label: 'Reply' },
    {
      key: 'copy',
      ico: '📋',
      label: 'Copy',
      hide: message.type !== 'text' || message.type === 'deleted',
    },
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
      if (key === 'reply') onReply?.();
      else if (key === 'copy') onCopy?.();
      else if (key === 'edit') onEdit?.();
      else if (key === 'unsend') onDelete?.();
    }, 180);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ── Blur overlay ── */}
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType="dark"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.65)"
          />
        ) : (
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType="dark"
            blurAmount={6}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.65)"
          />
        )}
      </Animated.View>

      {/* Pressable close area */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      {/* ── Reactions pill ── */}
      <Animated.View
        entering={FadeInDown.duration(200)
          .springify()
          .damping(22)
          .stiffness(340)}
        style={[s.rxPill, { top: pos.rxTop, left: pos.rxLeft, width: RX_W }]}
      >
        {REACTIONS.map((emoji, i) => (
          <Animated.View
            key={emoji}
            entering={FadeInDown.delay(i * 22)
              .duration(160)
              .springify()
              .damping(24)}
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

      {/* ── Bubble preview — EXACT position ── */}
      <Animated.View
        entering={FadeIn.duration(150)}
        style={[s.bubbleWrap, { top: pos.bubbleY, left: pos.bubbleX }]}
        pointerEvents="none"
      >
        <BubblePreview
          message={message}
          isOwn={isOwn}
          bubbleLayout={bubbleLayout}
        />
      </Animated.View>

      {/* ── Menu card ── */}
      <Animated.View
        entering={FadeInUp.duration(200)
          .springify()
          .damping(22)
          .stiffness(340)
          .delay(40)}
        style={[
          s.menu,
          { top: pos.menuTop, left: pos.menuLeft, width: MENU_W },
        ]}
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
  rxPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 32,
    height: RX_H,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 14,
    zIndex: 10,
  },
  rxBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 21,
  },
  rxEmoji: { fontSize: 26 },
  bubbleWrap: {
    position: 'absolute',
    zIndex: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 14,
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
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
  menuIco: { fontSize: 18 },
  menuTxt: { fontSize: 15, fontWeight: '500', color: '#0F172A', flex: 1 },
  danger: { color: '#EF4444' },
});
