/**
 * LikesScreen — Polished
 *
 * Two tabs: Received Likes (left) | Liked (right)
 * Filter chips: All / New / Nearby — shown on both tabs
 * Cards: info overlay on image, no white stripe
 * Blurred cards: glassmorphism treatment
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
import { formatLastActive } from '../src/hooks/useOnlineStatus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.55; // taller — full image, no bottom strip
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
// FILTER BAR — All / New / Nearby only
// ════════════════════════════════════════════════════════════════════════════

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: '✨ New' },
  { key: 'nearby', label: '📍 Nearby' },
];

const FilterBar = ({ activeFilter, onFilterPress }) => (
  <View style={styles.filterBarWrapper}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
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
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// TAB BAR — Received Likes | Liked
// ════════════════════════════════════════════════════════════════════════════

const TabBar = ({ activeTab, onTabPress, receivedCount, likedCount }) => (
  <View style={styles.tabBar}>
    {[
      { key: 'received', label: 'Received Likes', count: receivedCount },
      { key: 'liked', label: 'Liked', count: likedCount },
    ].map((tab, idx) => {
      const isActive = activeTab === tab.key;
      return (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => onTabPress(tab.key)}
          activeOpacity={0.8}
        >
          <View style={styles.tabLabelRow}>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[styles.tabBadge, isActive && styles.tabBadgeActive]}
              >
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </View>
          {isActive && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CARD — info on image, no white stripe
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = ({
  item,
  onPress,
  blurred = false,
  isNew = false,
  showOnline = false,
}) => (
  <Animated.View entering={FadeIn.duration(300).springify()}>
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={blurred ? 1 : 0.9}
    >
      {/* ── Image ── */}
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.cardImage}
          blurRadius={blurred ? 18 : 0}
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Text style={{ fontSize: 36 }}>📷</Text>
        </View>
      )}

      {/* ── NEW badge ── */}
      {isNew && !blurred && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}

      {/* ════ BLURRED — glassmorphism overlay ════ */}
      {blurred ? (
        <>
          {/* dark scrim */}
          <View style={styles.blurScrim} />

          {/* lock icon centered */}
          <View style={styles.lockCenter}>
            <View style={styles.lockIconWrapper}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.unlockHint}>Upgrade to see</Text>
          </View>

          {/* glass info strip at bottom */}
          <View style={styles.glassStrip}>
            <Text style={styles.blurredName}>— — — —</Text>
            <View style={styles.blurBarRow}>
              <View style={[styles.blurBar, { width: '60%' }]} />
            </View>
          </View>
        </>
      ) : (
        /* ════ NORMAL — gradient + info overlay ════ */
        <>
          {/* gradient for readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
            style={styles.cardGradient}
          />

          {/* info overlay */}
          <View style={styles.cardInfoOverlay}>
            {/* name row with inline online dot */}
            <View style={styles.nameRow}>
              {showOnline && (
                <View
                  style={[
                    styles.onlineDotInline,
                    {
                      backgroundColor: item.isOnline
                        ? '#22C55E'
                        : 'rgba(255,255,255,0.35)',
                    },
                  ]}
                />
              )}
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
                {item.age ? `, ${item.age}` : ''}
              </Text>
            </View>

            {/* active status (only if not online — online is shown via dot) */}
            {showOnline && !item.isOnline && item.lastActiveAt && (
              <Text style={styles.cardActive} numberOfLines={1}>
                {formatLastActive(item.lastActiveAt, 3)}
              </Text>
            )}
          </View>
        </>
      )}
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
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('received'); // received | liked
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    sentLikes,
    receivedLikes,
    loading: likesLoading,
    refetchSent,
    refetchReceived,
  } = useLikes({ token });

  const { subscription } = useSubscription({ token });
  const isPremium = subscription?.isPremium || false;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSent(), refetchReceived()]);
    setRefreshing(false);
  }, [refetchSent, refetchReceived]);

  const handleTabPress = useCallback(tab => {
    setActiveTab(tab);
    setActiveFilter('all');
  }, []);

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
          return data.filter(u => u.lat && u.lng);
        default:
          return data;
      }
    },
    [activeFilter],
  );

  // ════════════════════════════════════════════════════════════════════════════
  // TAB RENDERS
  // ════════════════════════════════════════════════════════════════════════════

  const renderReceivedTab = () => {
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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>❤️ Likes</Text>
      </View>

      {/* Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        receivedCount={receivedLikes.length}
        likedCount={sentLikes.length}
      />

      {/* Filter Chips — sits above FlatList with proper zIndex */}
      <FilterBar activeFilter={activeFilter} onFilterPress={setActiveFilter} />

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'received' ? renderReceivedTab() : renderLikedTab()}
      </View>
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
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 0,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FF0059',
  },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeActive: {
    backgroundColor: '#FFF1F5',
  },
  tabBadgeText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  tabIndicator: {
    width: '70%',
    height: 2.5,
    backgroundColor: '#FF0059',
    borderRadius: 2,
    marginBottom: -1.5,
  },

  // ── Filter Bar ──
  // zIndex ensures chips sit above FlatList cards on scroll
  filterBarWrapper: {
    backgroundColor: '#fff',
    zIndex: 9,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
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

  // ── Content area ──
  content: {
    flex: 1,
    zIndex: 1,
  },

  // ── Grid ──
  grid: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // ── Card ──
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  cardImageFallback: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Gradient + info overlay (normal cards) ──
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  cardInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDotInline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  cardActive: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
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
    zIndex: 2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Glassmorphism blur card ──
  blurScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  lockCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  lockIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 18,
  },
  unlockHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  // glass info strip at bottom of blurred card
  glassStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  blurredName: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 4,
    marginBottom: 5,
  },
  blurBarRow: {
    flexDirection: 'row',
  },
  blurBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
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
  premiumBannerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  premiumBannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  premiumBannerArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // ── Empty ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
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
