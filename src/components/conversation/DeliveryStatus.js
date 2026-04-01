import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const relTime = ts => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const DeliveryStatus = ({ status, createdAt }) => {
  if (!status) return null;

  const time = relTime(createdAt);

  const label =
    status === 'read'
      ? `Seen · ${time}`
      : status === 'delivered'
      ? `Delivered · ${time}`
      : `Sent · ${time}`;

  const color = status === 'read' ? '#FF0059' : '#94A3B8';

  return (
    <View style={s.wrap}>
      <Text style={[s.txt, { color }]}>{label}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 6,
    paddingRight: 4,
  },
  txt: { fontSize: 11, fontWeight: '500' },
});
