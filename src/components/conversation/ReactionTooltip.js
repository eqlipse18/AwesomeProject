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
  myImage, // ← myImage direct prop
  userProfiles,
  anchorX,
  anchorY,
  onClose,
  onRemoveMyReaction,
}) => {
  if (!visible || !reactions) return null;

  const reacted = Object.entries(reactions).map(([uid, emoji]) => {
    const isMe = uid === myUserId;
    return {
      userId: uid,
      emoji,
      isMe,
      name: isMe ? 'You' : userProfiles?.[uid]?.name || 'User',
      // ← own image se myImage use karo, other user se userProfiles
      image: isMe ? myImage : userProfiles?.[uid]?.image || null,
    };
  });

  if (!reacted.length) return null;

  const TIP_W = 210;
  const TIP_H = reacted.length * 52 + 48;
  const left = Math.max(12, Math.min(anchorX - TIP_W / 2, W - TIP_W - 12));
  const top = Math.max(80, anchorY - TIP_H - 12);

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
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

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
                <Text style={{ fontSize: 13 }}>👤</Text>
              </View>
            )}
            <View style={s.info}>
              <Text style={s.name} numberOfLines={1}>
                {u.name}
              </Text>
              {u.isMe && (
                <TouchableOpacity
                  onPress={() => {
                    onRemoveMyReaction?.();
                    onClose();
                  }}
                >
                  <Text style={s.removeLabel}>Tap to remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={s.emoji}>{u.emoji}</Text>
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
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 14,
    zIndex: 999,
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pic: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9' },
  picFb: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  removeLabel: { fontSize: 11, color: '#FF0059', marginTop: 2 },
  emoji: { fontSize: 20 },
});
