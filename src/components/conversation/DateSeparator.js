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
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e3e7', // cleaner than rgba black
  },
  pill: {
    marginHorizontal: 12,
    backgroundColor: '#F1F5F9', // soft slate
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999, // full pill
  },
  txt: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B', // better contrast
    letterSpacing: 0.5,
  },
});
