import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const REASONS = [
  'Block for no reason',
  'Bad behavior',
  'Fake profile',
  'AI-generated profile',
  'Commercial profile',
  'Inappropriate picture',
  'Scam',
  'Underage',
];

export default function ReportQuestionScreen({ navigation, route }) {
  const { targetUserId, matchId, name } = route.params;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0EB" />

      <TouchableOpacity
        style={s.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={12}
      >
        <Text style={s.backIco}>←</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.heading}>Is this person bothering you?</Text>
        <Text style={s.sub}>
          Got it, you no longer want to see this person. Please, tell us what
          happened.
        </Text>

        <View style={s.list}>
          {REASONS.map(reason => (
            <TouchableOpacity
              key={reason}
              style={s.reasonBtn}
              onPress={() =>
                navigation.navigate('ReportAnswer', {
                  targetUserId,
                  matchId,
                  name,
                  reason,
                })
              }
              activeOpacity={0.7}
            >
              <Text style={s.reasonTxt}>{reason}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8f2ff' },
  backBtn: { padding: 16, paddingBottom: 0 },
  backIco: { fontSize: 20, color: '#0F172A' },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 10,
    lineHeight: 34,
  },
  sub: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 28 },
  list: { gap: 10 },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  reasonTxt: { fontSize: 15, color: '#0F172A', fontWeight: '500' },
  chevron: { fontSize: 20, color: '#94A3B8' },
});
