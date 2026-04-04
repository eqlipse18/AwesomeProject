import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

const truncate = (str, n = 60) =>
  str?.length > n ? str.slice(0, n) + '…' : str;

export const ReplyBar = ({ replyingTo, myUserId, onCancel }) => {
  if (!replyingTo) return null;

  const isOwn = replyingTo.senderId === myUserId;
  const senderLabel = isOwn ? 'You' : replyingTo.senderName || 'Them';
  const content =
    replyingTo.type === 'image'
      ? '📷 Photo'
      : replyingTo.type === 'video'
      ? '🎥 Video'
      : replyingTo.type === 'deleted'
      ? 'Message deleted'
      : truncate(replyingTo.content);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(300)}
      exiting={FadeOutUp.duration(180)}
      layout={LinearTransition.springify()}
      style={s.wrap}
    >
      <View style={s.accent} />
      <View style={s.info}>
        <Text style={s.sender}>{senderLabel}</Text>
        <Text style={s.preview} numberOfLines={1}>
          {content}
        </Text>
      </View>
      <TouchableOpacity style={s.closeBtn} onPress={onCancel} hitSlop={8}>
        <Text style={s.closeIco}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    borderTopWidth: 1,
    borderTopColor: '#FFE4EC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  accent: { width: 3, height: 36, borderRadius: 2, backgroundColor: '#FF0059' },
  info: { flex: 1 },
  sender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF0059',
    marginBottom: 2,
  },
  preview: { fontSize: 13, color: '#64748B' },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIco: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
});
