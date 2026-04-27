// Modal HATA DO — yeh sab replace karo
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const RX_H = 52;

const ReactionButton = ({ emoji, index, onPress }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);
  const pressOpacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withDelay(
      index * 15,
      withTiming(1, { duration: 110, easing: Easing.out(Easing.ease) }),
    );
    translateY.value = withDelay(
      index * 15,
      withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * pressOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Reanimated.View style={animStyle}>
      <TouchableOpacity
        style={s.rxBtn}
        onPress={onPress}
        onPressIn={() => {
          pressOpacity.value = withTiming(0.5, { duration: 80 });
        }}
        onPressOut={() => {
          pressOpacity.value = withTiming(1, { duration: 120 });
        }}
        activeOpacity={1}
      >
        <Text style={s.rxEmoji}>{emoji}</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

const ReactionStrip = ({ rxPos, children }) => {
  const translateY = useSharedValue(10);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  React.useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 32,
      stiffness: 400,
      mass: 0.5,
    });
    opacity.value = withTiming(1, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withSpring(1, { damping: 30, stiffness: 380, mass: 0.5 });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Reanimated.View
      style={[
        s.rxStrip,
        { top: rxPos.rxTop, left: rxPos.rxLeft, width: rxPos.RX_W },
        style,
      ]}
    >
      {children}
    </Reanimated.View>
  );
};

export const FloatingContextMenu = ({
  visible,
  message,
  isOwn,
  bubbleLayout,
  otherImage,
  otherName,
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
    const RX_W = 264;
    const rxLeft = isOwn
      ? Math.max(8, bx + bw - RX_W)
      : Math.max(8, Math.min(bx, W - RX_W - 8));
    const rxTop = Math.max(HEADER_H + 12, by - RX_H - 8);
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
    }, 180);
  };

  return (
    // Modal nahi — seedha View, position absolute, full screen
    <View style={s.root} pointerEvents="box-none">
      {/* Backdrop */}
      <Reanimated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(140)}
        style={s.backdrop}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      {/* Header */}
      <Reanimated.View
        entering={FadeIn.duration(120)}
        exiting={FadeOut.duration(100)}
        style={[s.header, { paddingTop: insets.top, height: HEADER_H }]}
      >
        <TouchableOpacity
          onPress={onClose}
          style={s.headerBtn}
          activeOpacity={0.6}
        >
          <Text style={s.headerIco}>←</Text>
        </TouchableOpacity>

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

        <View style={s.headerActions}>
          {actions.map(a => (
            <TouchableOpacity
              key={a.key}
              style={s.headerBtn}
              onPress={() => handleAction(a.key)}
              activeOpacity={0.6}
            >
              <Text style={[s.actionIco, a.danger && s.actionIcoDanger]}>
                {a.ico}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Reanimated.View>

      {/* Reaction strip */}
      {rxPos.rxLeft !== undefined && (
        <ReactionStrip rxPos={rxPos}>
          {REACTIONS.map((emoji, i) => (
            <ReactionButton
              key={emoji}
              emoji={emoji}
              index={i}
              onPress={() => {
                onReact?.(emoji);
                onClose();
              }}
            />
          ))}
        </ReactionStrip>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  // Yeh root full screen cover karta hai — Modal ki jagah
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
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

  rxStrip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 32,
    height: RX_H,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 15,
  },
  rxBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rxEmoji: { fontSize: 26 },
});
