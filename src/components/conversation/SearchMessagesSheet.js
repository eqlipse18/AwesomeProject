import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

const highlight = (text, query) => {
  if (!query || !text) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <Text
            key={i}
            style={{ backgroundColor: '#FBBF24', fontWeight: '700' }}
          >
            {p}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
};

export const SearchMessagesSheet = ({
  visible,
  messages,
  onClose,
  onJumpTo,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return messages
      .filter(m => m.type === 'text' && m.content?.toLowerCase().includes(q))
      .slice(0, 50);
  }, [query, messages]);

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={sr.row}
        onPress={() => {
          onClose();
          onJumpTo(item.messageId);
        }}
        activeOpacity={0.7}
      >
        <View style={sr.preview}>
          <Text style={sr.msgTxt} numberOfLines={2}>
            {highlight(item.content, query.trim())}
          </Text>
          <Text style={sr.date}>{fmt(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    ),
    [query, onClose, onJumpTo],
  );

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(260)}
        exiting={SlideOutDown.duration(200)}
        style={sr.sheet}
      >
        {/* Header */}
        <View style={sr.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={sr.closeIco}>✕</Text>
          </TouchableOpacity>
          <Text style={sr.title}>Search Messages</Text>
          <Text style={sr.count}>
            {results.length > 0 ? `${results.length} found` : ''}
          </Text>
        </View>

        {/* Search input */}
        <View style={sr.inputWrap}>
          <Text style={sr.searchIco}>🔍</Text>
          <TextInput
            style={sr.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search in this chat..."
            placeholderTextColor="#94A3B8"
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Text style={sr.clearIco}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {query.trim().length < 2 ? (
          <View style={sr.empty}>
            <Text style={sr.emptyIco}>🔍</Text>
            <Text style={sr.emptyTxt}>Type at least 2 characters</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={sr.empty}>
            <Text style={sr.emptyIco}>🤷</Text>
            <Text style={sr.emptyTxt}>No messages found</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.messageId}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={sr.sep} />}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

const sr = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  closeIco: { fontSize: 16, color: '#64748B', width: 28 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0F172A' },
  count: { fontSize: 12, color: '#94A3B8' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIco: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: '#0F172A' },
  clearIco: { fontSize: 12, color: '#94A3B8' },

  row: { paddingHorizontal: 16, paddingVertical: 12 },
  preview: { gap: 4 },
  msgTxt: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  date: { fontSize: 11, color: '#94A3B8' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#F1F5F9' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIco: { fontSize: 40 },
  emptyTxt: { fontSize: 14, color: '#94A3B8' },
});
