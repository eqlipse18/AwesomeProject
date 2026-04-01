import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

export const ScrollFAB = ({ visible, onPress, unread }) => {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={s.fab}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient colors={['#FF0059', '#FF5289']} style={s.grad}>
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
          <Text style={s.ico}>↓</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  fab: { position: 'absolute', bottom: 84, right: 16, zIndex: 50 },
  grad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  ico: { color: '#fff', fontSize: 18, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
