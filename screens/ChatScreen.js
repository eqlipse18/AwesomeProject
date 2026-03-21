/**
 * ChatScreen — Refined v2
 * In Flame Dating App
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AuthContext } from '../AuthContex';
import { useMatches } from '../src/hooks/useChatHook';
import {
  useOnlineStatus,
  formatLastActive,
} from '../src/hooks/useOnlineStatus';
import Config from 'react-native-config';
import axios from 'axios';

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Animated cycling text hook
// ─────────────────────────────────────────────
const useCyclingText = (texts, interval = 2800) => {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
      ]).start();
      setIndex(prev => (prev + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval, fadeAnim]);

  return { text: texts[index], fadeAnim };
};

// ─────────────────────────────────────────────
// New Match Bubble
// ─────────────────────────────────────────────
const NewMatchBubble = ({ match, onPress, isOnline }) => (
  <TouchableOpacity
    style={styles.bubbleWrapper}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View
      style={[
        styles.bubbleRing,
        { borderColor: isOnline ? '#FF7480' : '#E1DBDD' },
      ]}
    >
      {match.image ? (
        <Image source={{ uri: match.image }} style={styles.bubbleImage} />
      ) : (
        <LinearGradient
          colors={['#FFC2CD', '#B90034']}
          style={styles.bubbleImage}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.bubbleInitial}>
            {match.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </LinearGradient>
      )}
      <View
        style={[
          styles.bubbleOnlineDot,
          { backgroundColor: isOnline ? '#22C55E' : '#94A3B8' },
        ]}
      />
    </View>
    <Text style={styles.bubbleName} numberOfLines={1}>
      {match.name}
    </Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// Likes Banner
// ─────────────────────────────────────────────
const BANNER_TEXTS = [
  'Upgrade to see who 👀',
  'Respond before they move on ⚡',
  "Don't keep them waiting 💌",
];

const AVATAR_SIZE = 38;
const OVERLAP = 14;

const LikesBanner = ({ likedUsers, likeCount, blurred, onPress }) => {
  const { text: cyclingText, fadeAnim } = useCyclingText(BANNER_TEXTS, 2800);
  const previews = likedUsers.slice(0, 3);
  const stackWidth =
    previews.length > 0
      ? AVATAR_SIZE + (previews.length - 1) * (AVATAR_SIZE - OVERLAP)
      : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.bannerOuter}
    >
      <LinearGradient
        colors={['#FFF0F3', '#FFD6E0', '#FFC2CD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bannerGradient}
      >
        {/* Left text */}
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerCount}>
            {likeCount} {likeCount === 1 ? 'person' : 'people'} liked you
          </Text>
          <Animated.Text
            style={[styles.bannerSub, { opacity: fadeAnim }]}
            numberOfLines={1}
          >
            {cyclingText}
          </Animated.Text>
        </View>

        {/* Right — overlapping real images, dynamic count */}
        {previews.length > 0 && (
          <View style={[styles.avatarStack, { width: stackWidth + 8 }]}>
            {previews.map((user, index) => {
              const leftPos =
                (previews.length - 1 - index) * (AVATAR_SIZE - OVERLAP);
              // ✅ Fixed: was `blurRadius={...}` (JSX syntax error), now a proper const
              const blurAmount = blurred
                ? index === 0
                  ? 8
                  : index === 1
                  ? 12
                  : 16
                : 0;
              return (
                <View
                  key={user.userId || index}
                  style={[
                    styles.stackedAvatar,
                    {
                      left: leftPos,
                      zIndex: previews.length - index,
                      width: AVATAR_SIZE,
                      height: AVATAR_SIZE,
                      borderRadius: AVATAR_SIZE / 2,
                    },
                  ]}
                >
                  {user.image ? (
                    <Image
                      source={{ uri: user.image }}
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: AVATAR_SIZE / 2,
                      }}
                      blurRadius={blurAmount} // ✅ correct variable name
                    />
                  ) : (
                    <LinearGradient
                      colors={['#FF8FA3', '#B90034']}
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: AVATAR_SIZE / 2,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: 0.55,
                      }}
                    >
                      <Text style={styles.stackedAvatarInitial}>?</Text>
                    </LinearGradient>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};
// ─────────────────────────────────────────────
// Chat Row
// ─────────────────────────────────────────────
const ChatRow = ({ match, onPress, isOnline, lastActiveText }) => {
  const hasUnread = match.unreadCount > 0;
  return (
    <TouchableOpacity
      style={[styles.chatRow, hasUnread && styles.chatRowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.chatAvatarWrapper}>
        {match.image ? (
          <Image source={{ uri: match.image }} style={styles.chatAvatar} />
        ) : (
          <LinearGradient
            colors={['#FFC2CD', '#B90034']}
            style={styles.chatAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.chatAvatarInitial}>
              {match.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        )}
        <View
          style={[
            styles.chatOnlineDot,
            { backgroundColor: isOnline ? '#22C55E' : '#94A3B8' },
          ]}
        />
      </View>

      <View style={styles.chatRowContent}>
        <View style={styles.chatRowTop}>
          <Text
            style={[styles.chatRowName, hasUnread && styles.chatRowNameUnread]}
            numberOfLines={1}
          >
            {match.name}
          </Text>
          <Text style={styles.chatRowTime}>
            {formatTime(match.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.chatRowBottom}>
          <Text
            style={[styles.chatRowMsg, hasUnread && styles.chatRowMsgUnread]}
            numberOfLines={1}
          >
            {match.lastMessage || '👋 Say hi!'}
          </Text>
          {hasUnread ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {match.unreadCount > 99 ? '99+' : match.unreadCount}
              </Text>
            </View>
          ) : lastActiveText ? (
            <Text style={styles.lastActiveText}>{lastActiveText}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// Boost Banner — dynamic cycling text
// ─────────────────────────────────────────────
const BOOST_TEXTS = [
  { main: 'Boost Now 🚀', sub: 'Boost your profile now 💖' },
  { main: 'Get 3x More Matches ✨', sub: 'Stand out from the crowd' },
  { main: 'Be the Top Profile 🔝', sub: 'Seen first by everyone nearby' },
];

const BoostBanner = () => {
  const [boostIdx, setBoostIdx] = useState(0);
  const boostFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(boostFade, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(boostFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setBoostIdx(prev => (prev + 1) % BOOST_TEXTS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [boostFade]);

  const current = BOOST_TEXTS[boostIdx];

  return (
    <View style={styles.boostBanner}>
      <View style={styles.boostLeft}>
        <View style={styles.boostIcon}>
          <Text style={{ fontSize: 20 }}>🚀</Text>
        </View>
        <Animated.View style={{ opacity: boostFade, flex: 1 }}>
          <Text style={styles.boostTitle}>{current.main}</Text>
          <Text style={styles.boostSub}>{current.sub}</Text>
        </Animated.View>
      </View>
      <TouchableOpacity style={styles.boostBtn} activeOpacity={0.8}>
        <Text style={styles.boostBtnText}>BOOST</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────
const EmptyState = ({ onSwipe }) => (
  <View style={styles.emptyWrapper}>
    <LinearGradient
      colors={['#FFF0F3', '#FBF5F6']}
      style={styles.emptyIconCircle}
    >
      <Text style={{ fontSize: 48 }}>💬</Text>
    </LinearGradient>
    <Text style={styles.emptyTitle}>No matches yet</Text>
    <Text style={styles.emptyMsg}>Start swiping to find your spark ✨</Text>
    <TouchableOpacity
      style={styles.emptyBtn}
      onPress={onSwipe}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={['#B90034', '#FF7480']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.emptyBtnGradient}
      >
        <Text style={styles.emptyBtnText}>Start Swiping 🔥</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function ChatScreen({ navigation }) {
  const { token, userId } = useContext(AuthContext);
  const { matches, loading, refetch } = useMatches({ token });
  const { getStatus } = useOnlineStatus({ token, userId });

  const [refreshing, setRefreshing] = useState(false);
  const [likedUsers, setLikedUsers] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
  const [likesBlurred, setLikesBlurred] = useState(true);

  const fetchLikedUsers = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await axios.get(`${API_BASE_URL}/likes/received`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      if (resp.data.success) {
        setLikedUsers(resp.data.likes || []);
        setLikeCount(resp.data.total || 0);
        setLikesBlurred(resp.data.blurred ?? true);
      }
    } catch (err) {
      console.log('[ChatScreen] fetchLikedUsers error:', err.message);
    }
  }, [token]);

  useEffect(() => {
    fetchLikedUsers();
  }, [fetchLikedUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), fetchLikedUsers()]);
    setRefreshing(false);
  }, [refetch, fetchLikedUsers]);

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

  const newMatches = matches.filter(
    m => !m.lastMessage || m.lastMessage === '👋 New match!',
  );
  const activeChats = matches.filter(
    m => m.lastMessage && m.lastMessage !== '👋 New match!',
  );

  if (loading && matches.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B90034" />
      </View>
    );
  }

  if (matches.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <EmptyState onSwipe={() => navigation.navigate('Home')} />
      </SafeAreaView>
    );
  }

  const ListHeader = () => (
    <View>
      {newMatches.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>NEW MATCHES</Text>
          <FlatList
            data={newMatches}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.matchId}
            contentContainerStyle={styles.bubblesContainer}
            renderItem={({ item }) => {
              const status = getStatus(item.userId, item);
              return (
                <NewMatchBubble
                  match={item}
                  onPress={() => handleMatchPress(item)}
                  isOnline={status.isOnline}
                />
              );
            }}
          />
        </View>
      )}

      {likeCount > 0 && (
        <View style={styles.bannerSection}>
          <LikesBanner
            likedUsers={likedUsers}
            likeCount={likeCount}
            blurred={likesBlurred}
            onPress={() => navigation.navigate('Like')}
          />
        </View>
      )}

      {activeChats.length > 0 && (
        <Text style={styles.sectionLabel}>RECENT MESSAGES</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.searchIconText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeChats}
        keyExtractor={item => item.matchId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#B90034']}
            tintColor="#B90034"
          />
        }
        ListHeaderComponent={<ListHeader />}
        renderItem={({ item }) => {
          const status = getStatus(item.userId, item);
          const lastActiveText = status.isOnline
            ? null
            : formatLastActive(status.lastActiveAt);
          return (
            <ChatRow
              match={item}
              onPress={() => handleMatchPress(item)}
              isOnline={status.isOnline}
              lastActiveText={lastActiveText}
            />
          );
        }}
        ListEmptyComponent={
          newMatches.length > 0 ? (
            <View style={styles.noChatsContainer}>
              <Text style={styles.noChatsText}>
                Tap a match above to start chatting! 👆
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<BoostBanner />}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  listContent: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: '#FBF5F6',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(185,0,52,0.08)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  searchIconText: { fontSize: 20 },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0ACAD',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  bubblesContainer: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 4,
  },

  // Bubble
  bubbleWrapper: { alignItems: 'center', width: 72 },
  bubbleRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bubbleImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bubbleInitial: { fontSize: 22, color: '#fff', fontWeight: '700' },
  bubbleOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FBF5F6',
  },
  bubbleName: {
    fontSize: 11,
    color: '#302E2F',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    width: 72,
  },

  // Likes Banner
  bannerSection: { paddingHorizontal: 20, marginTop: 4 },
  bannerOuter: { borderRadius: 14, overflow: 'hidden' },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bannerLeft: { flex: 1, marginRight: 12 },
  bannerCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4E0010',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  bannerSub: {
    fontSize: 12,
    color: '#793F4C',
    fontWeight: '500',
  },
  avatarStack: {
    height: AVATAR_SIZE,
    position: 'relative',
  },
  stackedAvatar: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  stackedAvatarInitial: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // Chat Row
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 14,
  },
  chatRowUnread: { backgroundColor: 'rgba(255,194,205,0.2)' },
  chatAvatarWrapper: { marginRight: 12, position: 'relative' },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chatAvatarInitial: { fontSize: 20, color: '#fff', fontWeight: '700' },
  chatOnlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FBF5F6',
  },
  chatRowContent: { flex: 1 },
  chatRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  chatRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#302E2F',
    flex: 1,
    marginRight: 8,
  },
  chatRowNameUnread: { fontWeight: '800', color: '#1A1A1A' },
  chatRowTime: { fontSize: 11, color: '#B0ACAD' },
  chatRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatRowMsg: { fontSize: 13, color: '#B0ACAD', flex: 1 },
  chatRowMsgUnread: { color: '#5E5B5C', fontWeight: '500' },
  unreadBadge: {
    backgroundColor: '#B90034',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  lastActiveText: { fontSize: 11, color: '#B0ACAD', marginLeft: 8 },

  // Boost Banner
  boostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFF0F3',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFC2CD',
  },
  boostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  boostIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E0010',
    marginBottom: 2,
  },
  boostSub: { fontSize: 11, color: '#793F4C' },
  boostBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  boostBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B90034',
    letterSpacing: 0.8,
  },

  // Empty
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyMsg: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyBtn: { borderRadius: 14, overflow: 'hidden' },
  emptyBtnGradient: { paddingHorizontal: 32, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  noChatsContainer: { padding: 28, alignItems: 'center' },
  noChatsText: { color: '#B0ACAD', fontSize: 14, textAlign: 'center' },
});
