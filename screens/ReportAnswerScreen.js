import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function ReportAnswerScreen({ navigation, route }) {
  const { targetUserId, matchId, name, reason } = route.params;
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Submit report + block
      await route.params.onSubmitReport?.({
        targetUserId,
        matchId,
        reason,
        details,
      });
      navigation.navigate('BlockedConfirm', { name });
    } catch (e) {
      console.error('[Report]', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0EB" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <Text style={s.backIco}>←</Text>
        </TouchableOpacity>

        <View style={s.content}>
          <Text style={s.heading}>Is this person bothering you?</Text>
          <Text style={s.reasonLabel}>{reason}</Text>

          <TextInput
            style={s.input}
            value={details}
            onChangeText={setDetails}
            placeholder="Tell us more about this person..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
          />

          <Text style={s.disclaimer}>
            I declare, in good faith, that I believe this information and
            allegations to be accurate and complete.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.sendBtn, submitting && s.sendBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          <Text style={s.sendTxt}>{submitting ? 'Sending...' : 'Send'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },
  backBtn: { padding: 16, paddingBottom: 0 },
  backIco: { fontSize: 20, color: '#0F172A' },
  content: { flex: 1, padding: 20 },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  reasonLabel: {
    fontSize: 14,
    color: '#FF0059',
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0F172A',
    padding: 16,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 120,
    maxHeight: 200,
    marginBottom: 14,
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  sendBtn: {
    backgroundColor: '#0F172A',
    margin: 16,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#94A3B8' },
  sendTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
