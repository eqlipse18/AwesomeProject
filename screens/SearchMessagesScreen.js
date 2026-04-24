import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      })
    : '';

const Highlighted = ({ text, query }) => {
  if (!query || !text) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={sr.highlight}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
};

export default function SearchMessagesScreen({ navigation, route }) {
  const { messages = [], onJumpTo } = route.params;
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return messages
      .filter(m => m.type === 'text' && m.content?.toLowerCase().includes(q))
      .slice(0, 60);
  }, [query, messages]);

  const handleJump = useCallback(
    messageId => {
      navigation.goBack();
      setTimeout(() => onJumpTo?.(messageId), 300);
    },
    [navigation, onJumpTo],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={sr.row}
        onPress={() => handleJump(item.messageId)}
        activeOpacity={0.7}
      >
        <View style={sr.rowInner}>
          <View style={sr.rowTop}>
            <Text style={sr.sender}>
              {item.senderId === route.params.myUserId
                ? 'You'
                : route.params.otherName}
            </Text>
            <Text style={sr.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={sr.preview} numberOfLines={2}>
            <Highlighted text={item.content} query={query.trim()} />
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [query, handleJump, route.params],
  );

  return (
    <SafeAreaView style={sr.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={sr.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={sr.backIco}>←</Text>
        </TouchableOpacity>

        <View style={sr.inputWrap}>
          <Text style={sr.searchIco}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={sr.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search messages..."
            placeholderTextColor="#94A3B8"
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Text style={sr.clearIco}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results count */}
      {query.trim().length >= 2 && (
        <View style={sr.countBar}>
          <Text style={sr.countTxt}>
            {results.length > 0 ? `${results.length} results` : 'No results'}
          </Text>
        </View>
      )}

      {/* List */}
      {query.trim().length < 2 ? (
        <View style={sr.hint}>
          <Text style={sr.hintTxt}>Type to search messages</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={sr.hint}>
          <Text style={sr.emptyIco}>🤷</Text>
          <Text style={sr.hintTxt}>No messages found for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.messageId}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={sr.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const sr = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  backIco: { fontSize: 20, color: '#0F172A' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchIco: { fontSize: 15 },
  input: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },
  clearIco: { fontSize: 12, color: '#94A3B8' },

  countBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  countTxt: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  row: { paddingHorizontal: 16, paddingVertical: 14 },
  rowInner: { gap: 4 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sender: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  date: { fontSize: 11, color: '#94A3B8' },
  preview: { fontSize: 14, color: '#475569', lineHeight: 20 },
  highlight: {
    backgroundColor: '#FEF08A',
    fontWeight: '700',
    color: '#0F172A',
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#F1F5F9' },

  hint: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIco: { fontSize: 40 },
  hintTxt: { fontSize: 14, color: '#94A3B8' },
});
