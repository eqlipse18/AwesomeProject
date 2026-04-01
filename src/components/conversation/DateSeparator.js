import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const DateSeparator = ({ label }) => (
  <View style={s.wrap}>
    <View style={s.line} />
    <View style={s.pill}>
      <Text style={s.txt}>{label}</Text>
    </View>
    <View style={s.line} />
  </View>
);

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 16,
  },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  pill: {
    marginHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  txt: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
});
