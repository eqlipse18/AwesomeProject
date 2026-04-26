import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import SearchIcon from '../assets/SVG/search';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatLastMsg = msg => {
  if (!msg || msg === '👋 New match!') return '👋 New match!';
  if (msg.includes('amazonaws.com') || msg.includes('flameapp-user-images')) {
    if (msg.match(/\.(mp4|mov|avi|mkv)/i)) return '🎥 Video';
    return '📷 Photo';
  }
  return msg;
};

const formatTime = ts => {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - date) / 60000);
  if (diff < 1) return 'Now';
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return date.toLocaleDateString();
};

// Highlight matching part
const HighlightedText = ({ text = '', query = '', style, highlightStyle }) => {
  if (!query.trim()) return <Text style={style}>{text}</Text>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={highlightStyle}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
};

// ── Match Row ──────────────────────────────────────────────────────────────
const MatchRow = ({ match, query, onPress, index }) => (
  <Animated.View
    entering={FadeInDown.delay(index * 40).duration(250)}
    layout={LinearTransition.springify()}
  >
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        {match.image ? (
          <Image source={{ uri: match.image }} style={s.avatar} />
        ) : (
          <LinearGradient
            colors={['#FFC2CD', '#B90034']}
            style={s.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.avatarInitial}>
              {match.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Info */}
      <View style={s.info}>
        <View style={s.infoTop}>
          <HighlightedText
            text={match.name || ''}
            query={query}
            style={s.name}
            highlightStyle={s.nameHighlight}
          />
          <Text style={s.time}>{formatTime(match.lastMessageAt)}</Text>
        </View>
        <Text style={s.lastMsg} numberOfLines={1}>
          {formatLastMsg(match.lastMessage)}
        </Text>
      </View>
    </TouchableOpacity>
  </Animated.View>
);

// ── Main Screen ────────────────────────────────────────────────────────────
export default function SearchChatsScreen({ navigation, route }) {
  const { matches = [] } = route.params;
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Auto focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches; // Show all when empty
    return matches.filter(
      m =>
        m.name?.toLowerCase().includes(q) ||
        formatLastMsg(m.lastMessage)?.toLowerCase().includes(q),
    );
  }, [query, matches]);

  const handlePress = useCallback(
    match => {
      navigation.navigate('Conversation', {
        matchId: match.matchId,
        targetUserId: match.userId,
        name: match.name,
        image: match.image,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <MatchRow
        match={item}
        query={query.trim()}
        onPress={() => handlePress(item)}
        index={index}
      />
    ),
    [query, handlePress],
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffedff" />

      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(200)} style={s.header}>
        {/* Search bar */}
        <View style={s.searchBar}>
          <SearchIcon size={22} color="#374151" />
          <TextInput
            ref={inputRef}
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search matches..."
            placeholderTextColor="#B0ACAD"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <Text style={s.clearIco}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Text style={s.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Results ── */}
      {results.length === 0 && query.trim().length > 0 ? (
        <Animated.View entering={FadeIn.duration(200)} style={s.empty}>
          <Text style={s.emptyIco}>🔍</Text>
          <Text style={s.emptyTitle}>No matches found</Text>
          <Text style={s.emptySub}>Try searching by name</Text>
        </Animated.View>
      ) : (
        <>
          {/* Count */}
          {query.trim().length > 0 && (
            <Animated.View entering={FadeIn.duration(180)} style={s.countBar}>
              <Text style={s.countTxt}>
                {results.length} {results.length === 1 ? 'match' : 'matches'}
              </Text>
            </Animated.View>
          )}

          {/* Section header when no query */}
          {!query.trim() && <Text style={s.sectionLabel}>ALL MATCHES</Text>}

          <FlatList
            data={results}
            keyExtractor={item => item.matchId}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.list}
            ItemSeparatorComponent={() => <View style={s.sep} />}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffedff' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#ffedff',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(185,0,52,0.12)',
  },
  searchIco: { fontSize: 15 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    padding: 0,
    fontFamily: 'Nunito-Regular',
  },
  clearIco: { fontSize: 12, color: '#B0ACAD', fontWeight: '700' },
  cancelTxt: {
    fontSize: 15,
    color: '#B90034',
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
  },

  // Count bar
  countBar: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  countTxt: { fontSize: 12, color: '#B0ACAD', fontFamily: 'Nunito-Regular' },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'BebasNeuer-Regular',
    color: '#B0ACAD',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // List
  list: { paddingBottom: 40 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  avatarWrap: { marginRight: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 20, color: '#fff', fontWeight: '700' },

  info: { flex: 1 },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#302E2F',
    flex: 1,
    marginRight: 8,
    fontFamily: 'Nunito-SemiBold',
  },
  nameHighlight: {
    backgroundColor: '#FFE4EC',
    color: '#B90034',
    fontWeight: '800',
    borderRadius: 3,
  },
  time: { fontSize: 11, color: '#B0ACAD' },
  lastMsg: { fontSize: 13, color: '#B0ACAD', fontFamily: 'Nunito-Regular' },

  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginHorizontal: 26,
  },

  // Empty
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptyIco: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptySub: { fontSize: 13, color: '#B0ACAD' },
});
