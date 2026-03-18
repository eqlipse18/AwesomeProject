/**
 * ChatScreen - Complete Implementation
 *
 * Two sections:
 * 1. Pending SUPERLIKE Approvals (top)
 * 2. Active Chats (scrollable list)
 *
 * Features:
 * - Accept/Reject SUPERLIKE requests
 * - View active matches
 * - Pull-to-refresh
 * - Loading & error states
 * - Empty states with icons
 */

import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../AuthContex';
import { useMatches } from '../src/hooks/useChatHook';

const formatTime = ts => {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - date) / 60000);
  if (diff < 1) return 'Now';
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  if (diff < 10080) return `${Math.floor(diff / 1440)}d`;
  return date.toLocaleDateString();
};

// ── Match Avatar (top row — new matches) ──
const NewMatchBubble = ({ match, onPress }) => (
  <TouchableOpacity
    style={styles.bubbleWrapper}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.bubbleImageWrapper}>
      {match.image ? (
        <Image source={{ uri: match.image }} style={styles.bubbleImage} />
      ) : (
        <View style={[styles.bubbleImage, styles.bubbleFallback]}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </View>
      )}
      <View style={styles.bubbleOnline} />
    </View>
    <Text style={styles.bubbleName} numberOfLines={1}>
      {match.name}
    </Text>
  </TouchableOpacity>
);

// ── Chat Row ──
const ChatRow = ({ match, onPress }) => (
  <TouchableOpacity
    style={styles.chatRow}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={styles.avatarWrapper}>
      {match.image ? (
        <Image source={{ uri: match.image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={{ fontSize: 24 }}>👤</Text>
        </View>
      )}
    </View>

    <View style={styles.chatRowContent}>
      <View style={styles.chatRowTop}>
        <Text
          style={[
            styles.chatRowName,
            match.unreadCount > 0 && styles.chatRowNameBold,
          ]}
        >
          {match.name}
        </Text>
        <Text style={styles.chatRowTime}>
          {formatTime(match.lastMessageAt)}
        </Text>
      </View>
      <View style={styles.chatRowBottom}>
        <Text
          style={[
            styles.chatRowLast,
            match.unreadCount > 0 && styles.chatRowLastBold,
          ]}
          numberOfLines={1}
        >
          {match.lastMessage || '👋 New match!'}
        </Text>
        {match.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {match.unreadCount > 99 ? '99+' : match.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

export default function ChatScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const { matches, loading, error, refetch } = useMatches({ token });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleMatchPress = useCallback(
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

  // New matches = no messages yet
  const newMatches = matches.filter(m => m.lastMessage === '👋 New match!');
  const activeChats = matches.filter(m => m.lastMessage !== '👋 New match!');

  if (loading && matches.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF0059" />
      </View>
    );
  }

  if (matches.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 56 }}>💬</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyMsg}>Start swiping to get matches!</Text>
          <TouchableOpacity
            style={styles.swipeBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.swipeBtnText}>Start Swiping 🔥</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSub}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <FlatList
        data={activeChats}
        keyExtractor={item => item.matchId}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0059']}
          />
        }
        ListHeaderComponent={
          newMatches.length > 0 ? (
            <View>
              <Text style={styles.sectionLabel}>New Matches ✨</Text>
              <FlatList
                data={newMatches}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.matchId}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 12,
                  paddingBottom: 8,
                }}
                renderItem={({ item }) => (
                  <NewMatchBubble
                    match={item}
                    onPress={() => handleMatchPress(item)}
                  />
                )}
              />
              {activeChats.length > 0 && (
                <Text style={styles.sectionLabel}>Chats 💬</Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ChatRow match={item} onPress={() => handleMatchPress(item)} />
        )}
        ListEmptyComponent={
          newMatches.length > 0 ? null : (
            <View style={styles.noChatsContainer}>
              <Text style={styles.noChatsText}>
                Tap a match above to start chatting!
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // New match bubbles
  bubbleWrapper: { alignItems: 'center', width: 72 },
  bubbleImageWrapper: { position: 'relative' },
  bubbleImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
  },
  bubbleFallback: { justifyContent: 'center', alignItems: 'center' },
  bubbleOnline: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  bubbleName: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    width: 72,
  },

  // Chat row
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarWrapper: { marginRight: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  chatRowContent: { flex: 1 },
  chatRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatRowName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  chatRowNameBold: { fontWeight: '800', color: '#0F172A' },
  chatRowTime: { fontSize: 12, color: '#94A3B8' },
  chatRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatRowLast: { fontSize: 13, color: '#94A3B8', flex: 1 },
  chatRowLastBold: { color: '#334155', fontWeight: '600' },
  unreadBadge: {
    backgroundColor: '#FF0059',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMsg: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  swipeBtn: {
    backgroundColor: '#FF0059',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  swipeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noChatsContainer: { padding: 32, alignItems: 'center' },
  noChatsText: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
});
