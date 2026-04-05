import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const { width: W } = Dimensions.get('window');

export const ReactionTooltip = ({
  visible,
  reactions,
  myUserId,
  userProfiles, // { [userId]: { name, image } }
  anchorX,
  anchorY,
  onClose,
  onRemoveMyReaction,
}) => {
  if (!visible || !reactions) return null;

  const reacted = Object.entries(reactions).map(([uid, emoji]) => ({
    userId: uid,
    emoji,
    name: uid === myUserId ? 'You' : userProfiles?.[uid]?.name || 'User',
    image: userProfiles?.[uid]?.image || null,
    isMe: uid === myUserId,
  }));

  if (!reacted.length) return null;

  // Position — clamp to screen
  const TIP_W = 200;
  const left = Math.max(12, Math.min(anchorX - TIP_W / 2, W - TIP_W - 12));
  const top = Math.max(60, anchorY - (reacted.length * 46 + 50));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(160)}
        style={StyleSheet.absoluteFillObject}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(180)}
        style={[s.card, { top, left, width: TIP_W }]}
      >
        <Text style={s.header}>Reactions</Text>
        {reacted.map(u => (
          <View key={u.userId} style={s.row}>
            {u.image ? (
              <Image source={{ uri: u.image }} style={s.pic} />
            ) : (
              <View style={[s.pic, s.picFb]}>
                <Text style={{ fontSize: 11 }}>👤</Text>
              </View>
            )}
            <Text style={s.name} numberOfLines={1}>
              {u.name}
            </Text>
            <Text style={s.emoji}>{u.emoji}</Text>
            {u.isMe && (
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => {
                  onRemoveMyReaction?.();
                  onClose();
                }}
                hitSlop={6}
              >
                <Text style={s.removeIco}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  card: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 999,
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pic: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9' },
  picFb: { justifyContent: 'center', alignItems: 'center' },
  name: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0F172A' },
  emoji: { fontSize: 17 },
  removeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIco: { fontSize: 9, color: '#EF4444', fontWeight: '800' },
});
