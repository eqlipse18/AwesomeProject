import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const ReactionStrip = ({ reactions, isOwn, myUserId, onPress }) => {
  if (!reactions || !Object.keys(reactions).length) return null;

  const grouped = {};
  Object.entries(reactions).forEach(([uid, emoji]) => {
    grouped[emoji] = grouped[emoji] ? [...grouped[emoji], uid] : [uid];
  });

  return (
    <TouchableOpacity
      style={[s.strip, isOwn ? s.own : s.other]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {Object.entries(grouped).map(([emoji, users]) => (
        <View
          key={emoji}
          style={[s.chip, users.includes(myUserId) && s.chipMine]}
        >
          <Text style={s.emoji}>{emoji}</Text>
          {users.length > 1 && <Text style={s.count}>{users.length}</Text>}
        </View>
      ))}
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  own: { justifyContent: 'flex-end' },
  other: { justifyContent: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  chipMine: {
    backgroundColor: 'rgba(255,0,89,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,89,0.2)',
  },
  emoji: { fontSize: 13 },
  count: { fontSize: 10, color: '#64748B', fontWeight: '600' },
});
