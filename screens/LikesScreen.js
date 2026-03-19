/**
 * LikesScreen - Fully Updated
 *
 * Top tabs: Likes | Matches
 * Likes → Liked | Liked You (nested tabs)
 * Matches → Matched | Discover (nested tabs)
 *
 * Features:
 * - 2-column grid layout
 * - Real photo blur (BlurView) for free users
 * - Online status on cards
 * - Filter bar: All, New, Nearby, Active, With Bio, Verified
 * - Premium banner
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
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import axios from 'axios';
import Config from 'react-native-config';
import { AuthContext } from '../AuthContex';
import { useLikes, useSubscription } from '../src/hooks/usePremiumHooks';
import { useMatches } from '../src/hooks/useChatHook';
import { formatLastActive } from '../src/hooks/useOnlineStatus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.45;
const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const createApiClient = token =>
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

// ════════════════════════════════════════════════════════════════════════════
// FILTER BAR
// ════════════════════════════════════════════════════════════════════════════

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'active', label: 'Active' },
  { key: 'withBio', label: 'With Bio' },
  { key: 'verified', label: 'Verified' },
];

const FilterBar = ({ activeFilter, onFilterPress }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterBar}
    style={{ flexGrow: 0 }}
  >
    {FILTERS.map(f => (
      <TouchableOpacity
        key={f.key}
        style={[
          styles.filterChip,
          activeFilter === f.key && styles.filterChipActive,
        ]}
        onPress={() => onFilterPress(f.key)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.filterChipText,
            activeFilter === f.key && styles.filterChipTextActive,
          ]}
        >
          {f.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ════════════════════════════════════════════════════════════════════════════
// TOP TAB BAR
// ════════════════════════════════════════════════════════════════════════════

const TopTabBar = ({ tabs, activeTab, onTabPress }) => (
  <View style={styles.topTabBar}>
    {tabs.map(tab => (
      <TouchableOpacity
        key={tab.key}
        style={[styles.topTab, activeTab === tab.key && styles.topTabActive]}
        onPress={() => onTabPress(tab.key)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.topTabText,
            activeTab === tab.key && styles.topTabTextActive,
          ]}
        >
          {tab.label}
        </Text>
        {tab.count > 0 && (
          <View style={styles.topTabBadge}>
            <Text style={styles.topTabBadgeText}>{tab.count}</Text>
          </View>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// SUB TAB BAR
// ════════════════════════════════════════════════════════════════════════════

const SubTabBar = ({ tabs, activeTab, onTabPress }) => (
  <View style={styles.subTabBar}>
    {tabs.map(tab => (
      <TouchableOpacity
        key={tab.key}
        style={[styles.subTab, activeTab === tab.key && styles.subTabActive]}
        onPress={() => onTabPress(tab.key)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.subTabText,
            activeTab === tab.key && styles.subTabTextActive,
          ]}
        >
          {tab.label}
        </Text>
        {tab.count !== undefined && tab.count > 0 && (
          <View
            style={[
              styles.subTabBadge,
              activeTab === tab.key && styles.subTabBadgeActive,
            ]}
          >
            <Text style={styles.subTabBadgeText}>{tab.count}</Text>
          </View>
        )}
      </TouchableOpacity>
    ))}
    <View
      style={[
        styles.subTabIndicator,
        {
          left:
            tabs.findIndex(t => t.key === activeTab) *
            (SCREEN_WIDTH / tabs.length),
        },
      ]}
    />
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CARD — 2 col grid
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = ({
  item,
  onPress,
  blurred = false,
  isNew = false,
  showOnline = false,
}) => (
  <Animated.View entering={FadeIn.duration(300).springify()}>
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardImageWrapper}>
        {item.image ? (
          <>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            {/* ✅ Real BlurView over actual photo */}
            {blurred && (
              <BlurView
                style={StyleSheet.absoluteFillObject}
                blurType="light"
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(200,200,200,0.8)"
              />
            )}
          </>
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]}>
            <Text style={{ fontSize: 36 }}>📷</Text>
          </View>
        )}

        {/* ✅ NEW badge */}
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        {/* ✅ Online dot */}
        {showOnline && !blurred && (
          <View
            style={[
              styles.onlineDot,
              {
                backgroundColor: item.isOnline ? '#22C55E' : '#94A3B8',
              },
            ]}
          />
        )}

        {/* Gradient overlay — only non-blurred */}
        {!blurred && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.cardGradient}
          />
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        {/* ✅ Blurred — dashed name placeholder */}
        <Text
          style={[styles.cardName, blurred && styles.cardNameBlurred]}
          numberOfLines={1}
        >
          {blurred
            ? '— — — —'
            : `${item.name}${item.age ? `, ${item.age}` : ''}`}
        </Text>

        {!blurred ? (
          <>
            {item.hometown ? (
              <Text style={styles.cardLocation} numberOfLines={1}>
                📍 {item.hometown}
              </Text>
            ) : null}
            {/* ✅ Online status */}
            {showOnline && (item.isOnline || item.lastActiveAt) ? (
              <Text style={styles.cardActive} numberOfLines={1}>
                {item.isOnline
                  ? '🟢 Online'
                  : formatLastActive(item.lastActiveAt, 3)}
              </Text>
            ) : null}
          </>
        ) : (
          // ✅ Blurred — grey placeholder bars
          <>
            <View style={styles.blurBar} />
            <View style={[styles.blurBar, { width: '55%' }]} />
          </>
        )}
      </View>
    </TouchableOpacity>
  </Animated.View>
);

// ════════════════════════════════════════════════════════════════════════════
// PREMIUM LOCK BANNER
// ════════════════════════════════════════════════════════════════════════════

const PremiumBanner = ({ count, onUpgrade }) => (
  <TouchableOpacity
    style={styles.premiumBanner}
    onPress={onUpgrade}
    activeOpacity={0.88}
  >
    <LinearGradient
      colors={['#FF0059', '#FF6B6B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.premiumBannerGradient}
    >
      <Text style={styles.premiumBannerEmoji}>🔥</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.premiumBannerTitle}>{count} people liked you!</Text>
        <Text style={styles.premiumBannerSub}>
          Upgrade to see who liked you
        </Text>
      </View>
      <Text style={styles.premiumBannerArrow}>→</Text>
    </LinearGradient>
  </TouchableOpacity>
);

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════

const EmptyState = ({ emoji, title, subtitle }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySub}>{subtitle}</Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function LikesScreen({ navigation }) {
  const { token, userId } = useContext(AuthContext);
  const [topTab, setTopTab] = useState('likes');
  const [likesSubTab, setLikesSubTab] = useState('liked');
  const [matchesSubTab, setMatchesSubTab] = useState('matched');
  const [refreshing, setRefreshing] = useState(false);
  const [newUsers, setNewUsers] = useState([]);
  const [newUsersLoading, setNewUsersLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const apiClient = useRef(createApiClient(token));

  const {
    sentLikes,
    receivedLikes,
    loading: likesLoading,
    isBlurred,
    refetchSent,
    refetchReceived,
  } = useLikes({ token });

  const { subscription } = useSubscription({ token });
  const {
    matches,
    loading: matchesLoading,
    refetch: refetchMatches,
  } = useMatches({ token });

  const isPremium = subscription?.isPremium || false;

  // ── Fetch new users ──
  const fetchNewUsers = useCallback(async () => {
    try {
      setNewUsersLoading(true);
      const resp = await apiClient.current.get('/users/new', {
        params: { limit: 20 },
      });
      if (resp.data.success) setNewUsers(resp.data.users || []);
    } catch (e) {
      console.error('[LikesScreen] fetchNewUsers error:', e.message);
    } finally {
      setNewUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchNewUsers();
  }, [token, fetchNewUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSent(),
      refetchReceived(),
      refetchMatches(),
      fetchNewUsers(),
    ]);
    setRefreshing(false);
  }, [refetchSent, refetchReceived, refetchMatches, fetchNewUsers]);

  const handleCardPress = useCallback(
    item => {
      navigation.navigate('UserProfile', {
        targetUserId: item.userId,
        imageUrl: item.image,
      });
    },
    [navigation],
  );

  // ── Filter logic ──
  const applyFilter = useCallback(
    data => {
      switch (activeFilter) {
        case 'new':
          return data.filter(u => {
            if (!u.joinedAt) return false;
            return new Date() - new Date(u.joinedAt) < 7 * 24 * 60 * 60 * 1000;
          });
        case 'nearby':
          // Will work when currentUser hometown is available
          return data.filter(u => u.hometown);
        case 'active':
          return data.filter(
            u =>
              u.isOnline ||
              (u.lastActiveAt &&
                new Date() - new Date(u.lastActiveAt) < 24 * 60 * 60 * 1000),
          );
        case 'withBio':
          return data.filter(u => u.goals);
        case 'verified':
          return data.filter(u => u.isVerified);
        default:
          return data;
      }
    },
    [activeFilter],
  );

  // ════════════════════════════════════════════════════════════════════════════
  // TAB RENDERS
  // ════════════════════════════════════════════════════════════════════════════

  const renderLikedTab = () => {
    if (likesLoading)
      return (
        <ActivityIndicator
          size="large"
          color="#FF0059"
          style={{ marginTop: 40 }}
        />
      );

    const filtered = applyFilter(sentLikes);

    if (filtered.length === 0)
      return (
        <EmptyState
          emoji="💝"
          title={activeFilter !== 'all' ? 'No results' : 'No likes sent yet'}
          subtitle={
            activeFilter !== 'all'
              ? 'Try a different filter'
              : 'Start swiping to like profiles!'
          }
        />
      );

    return (
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => item.userId}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0059']}
          />
        }
        renderItem={({ item }) => (
          <ProfileCard
            item={item}
            showOnline={true}
            onPress={() => handleCardPress(item)}
          />
        )}
      />
    );
  };

  const renderLikedYouTab = () => {
    if (likesLoading)
      return (
        <ActivityIndicator
          size="large"
          color="#FF0059"
          style={{ marginTop: 40 }}
        />
      );

    if (receivedLikes.length === 0)
      return (
        <EmptyState
          emoji="👀"
          title="No likes yet"
          subtitle={
            isPremium
              ? 'No one liked you yet — keep swiping!'
              : 'Upgrade to see who liked you'
          }
        />
      );

    const filtered = isPremium ? applyFilter(receivedLikes) : receivedLikes;

    return (
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item, i) => item.userId || String(i)}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0059']}
          />
        }
        ListHeaderComponent={
          !isPremium && receivedLikes.length > 0 ? (
            <PremiumBanner
              count={receivedLikes.length}
              onUpgrade={() => {
                /* TODO: Premium modal */
              }}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <ProfileCard
            item={item}
            blurred={!isPremium}
            showOnline={isPremium}
            onPress={() => (isPremium ? handleCardPress(item) : null)}
          />
        )}
      />
    );
  };

  const renderMatchedTab = () => {
    if (matchesLoading)
      return (
        <ActivityIndicator
          size="large"
          color="#FF0059"
          style={{ marginTop: 40 }}
        />
      );

    const filtered = applyFilter(matches);

    if (filtered.length === 0)
      return (
        <EmptyState
          emoji="💕"
          title={activeFilter !== 'all' ? 'No results' : 'No matches yet'}
          subtitle={
            activeFilter !== 'all'
              ? 'Try a different filter'
              : 'Keep swiping to find your match!'
          }
        />
      );

    return (
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => item.matchId}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0059']}
          />
        }
        renderItem={({ item }) => (
          <ProfileCard
            item={{ ...item, userId: item.userId }}
            showOnline={true}
            onPress={() =>
              navigation.navigate('Conversation', {
                matchId: item.matchId,
                targetUserId: item.userId,
                name: item.name,
                image: item.image,
              })
            }
          />
        )}
      />
    );
  };

  const renderDiscoverTab = () => {
    if (newUsersLoading)
      return (
        <ActivityIndicator
          size="large"
          color="#FF0059"
          style={{ marginTop: 40 }}
        />
      );

    const filtered = applyFilter(newUsers);

    if (filtered.length === 0)
      return (
        <EmptyState
          emoji="🌟"
          title={activeFilter !== 'all' ? 'No results' : 'No new users'}
          subtitle={
            activeFilter !== 'all'
              ? 'Try a different filter'
              : 'Check back soon for new faces!'
          }
        />
      );

    return (
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => item.userId}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF0059']}
          />
        }
        renderItem={({ item }) => (
          <ProfileCard
            item={item}
            isNew={true}
            showOnline={true}
            onPress={() => handleCardPress(item)}
          />
        )}
      />
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {topTab === 'likes' ? '❤️ Likes' : '✨ Matches'}
        </Text>
      </View>

      {/* Top Tabs */}
      <TopTabBar
        tabs={[
          {
            key: 'likes',
            label: 'Likes',
            count: sentLikes.length + receivedLikes.length,
          },
          { key: 'matches', label: 'Matches', count: matches.length },
        ]}
        activeTab={topTab}
        onTabPress={tab => {
          setTopTab(tab);
          setActiveFilter('all'); // ✅ filter reset on tab change
        }}
      />

      {/* Content */}
      {topTab === 'likes' ? (
        <View style={{ flex: 1 }}>
          <SubTabBar
            tabs={[
              { key: 'liked', label: 'Liked', count: sentLikes.length },
              {
                key: 'likedYou',
                label: 'Liked You',
                count: receivedLikes.length,
              },
            ]}
            activeTab={likesSubTab}
            onTabPress={tab => {
              setLikesSubTab(tab);
              setActiveFilter('all'); // ✅ reset
            }}
          />
          {/* ✅ Filter bar */}
          <FilterBar
            activeFilter={activeFilter}
            onFilterPress={setActiveFilter}
          />
          {likesSubTab === 'liked' ? renderLikedTab() : renderLikedYouTab()}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <SubTabBar
            tabs={[
              { key: 'matched', label: 'Matched', count: matches.length },
              {
                key: 'discover',
                label: 'Discover ✨',
                count: newUsers.length,
              },
            ]}
            activeTab={matchesSubTab}
            onTabPress={tab => {
              setMatchesSubTab(tab);
              setActiveFilter('all'); // ✅ reset
            }}
          />
          {/* ✅ Filter bar */}
          <FilterBar
            activeFilter={activeFilter}
            onFilterPress={setActiveFilter}
          />
          {matchesSubTab === 'matched'
            ? renderMatchedTab()
            : renderDiscoverTab()}
        </View>
      )}
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },

  // ── Top Tabs ──
  topTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 20,
    gap: 8,
  },
  topTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  topTabActive: { backgroundColor: '#FFF1F5' },
  topTabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  topTabTextActive: { color: '#FF0059' },
  topTabBadge: {
    backgroundColor: '#FF0059',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  topTabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // ── Sub Tabs ──
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  subTabActive: {},
  subTabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  subTabTextActive: { color: '#FF0059' },
  subTabBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  subTabBadgeActive: { backgroundColor: '#FFF1F5' },
  subTabBadgeText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  subTabIndicator: {
    position: 'absolute',
    bottom: -2,
    width: SCREEN_WIDTH / 2,
    height: 2,
    backgroundColor: '#FF0059',
    borderRadius: 2,
  },

  // ── Filter bar ──
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FF0059',
    borderColor: '#FF0059',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: { color: '#fff' },

  // ── Grid ──
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // ── Card ──
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImageFallback: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },

  // ── NEW badge ──
  newBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Online dot ──
  onlineDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },

  // ── Card info ──
  cardInfo: {
    padding: 10,
    backgroundColor: '#fff',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardNameBlurred: {
    color: '#94A3B8',
    letterSpacing: 3,
  },
  cardLocation: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardActive: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },

  // ── Blur bars ──
  blurBar: {
    height: 8,
    width: '80%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 4,
  },

  // ── Premium banner ──
  premiumBanner: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  premiumBannerEmoji: { fontSize: 24 },
  premiumBannerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  premiumBannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  premiumBannerArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Empty ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
