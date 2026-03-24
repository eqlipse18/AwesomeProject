/**
 * LikesScreen — Gen Z Polished
 * - Stats row: views · likes · superlikes
 * - Skeleton loading
 * - Superlike ⭐ + Mutual 💜 badges
 * - Like-back action sheet (received tab)
 * - Sort: Recent / Online first
 * - New likes separator
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
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
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import ReAnimated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import axios from 'axios';
import Config from 'react-native-config';
import { AuthContext } from '../AuthContex';
import { useLikes, useSubscription } from '../src/hooks/usePremiumHooks';
import { formatLastActive } from '../src/hooks/useOnlineStatus';
import { MatchModal } from '../src/components/swipe/MatchModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.55;
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
// SKELETON CARD
// ════════════════════════════════════════════════════════════════════════════

const SkeletonCard = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={[styles.cardImage, { backgroundColor: '#E2E8F0' }]} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonAge} />
      </View>
    </Animated.View>
  );
};

const SkeletonGrid = () => (
  <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
    {[...Array(3)].map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <SkeletonCard />
        <SkeletonCard />
      </View>
    ))}
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// STATS ROW
// ════════════════════════════════════════════════════════════════════════════

const StatsRow = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <View style={styles.statsRow}>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={styles.statItem}>
            <View style={styles.statSkeletonNum} />
            <View style={styles.statSkeletonLabel} />
          </View>
        ))}
      </View>
    );
  }

  const items = [
    { value: stats.profileViews || 0, label: 'Profile Views', icon: '👀' },
    { value: stats.totalReceived || 0, label: 'Likes', icon: '❤️' },
    { value: stats.superlikesReceived || 0, label: 'Superlikes', icon: '⭐' },
  ];

  return (
    <ReAnimated.View entering={FadeIn.duration(400)} style={styles.statsRow}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>{item.icon}</Text>
            <Text style={styles.statValue}>
              {item.value > 999 ? '999+' : item.value}
            </Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
          {i < items.length - 1 && <View style={styles.statDivider} />}
        </React.Fragment>
      ))}
    </ReAnimated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FILTER + SORT BAR
// ════════════════════════════════════════════════════════════════════════════

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: '✨ New' },
  { key: 'nearby', label: '📍 Nearby' },
  { key: 'superliked', label: '⭐ Superliked' }, // new
  { key: 'mutual', label: '💜 Mutual' }, // new
];

const SORTS = [
  { key: 'recent', label: 'Recent' },
  { key: 'online', label: 'Online First' },
];

const FilterSortBar = ({
  activeFilter,
  onFilterPress,
  activeSort,
  onSortPress,
}) => (
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

      <View style={styles.sortDivider} />

      {SORTS.map(s => (
        <TouchableOpacity
          key={s.key}
          style={[
            styles.sortChip,
            activeSort === s.key && styles.sortChipActive,
          ]}
          onPress={() => onSortPress(s.key)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              activeSort === s.key && styles.filterChipTextActive,
            ]}
          >
            {s.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// TAB BAR
// ════════════════════════════════════════════════════════════════════════════

const TabBar = ({ activeTab, onTabPress, receivedCount, likedCount }) => (
  <View style={styles.tabBar}>
    {[
      { key: 'received', label: 'Liked You', count: receivedCount },
      { key: 'liked', label: 'You Liked', count: likedCount },
    ].map(tab => {
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
                <Text style={styles.tabBadgeText}>
                  {tab.count > 99 ? '99+' : tab.count}
                </Text>
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
// PROFILE CARD
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = ({ item, onPress, onLikeBack, blurred = false }) => {
  const isSuperlike = item.type === 'superlike';
  const isMutual = item.isMatched;

  return (
    <ReAnimated.View entering={FadeInDown.duration(300).springify()}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={blurred ? 1 : 0.9}
        onLongPress={onLikeBack}
        delayLongPress={300}
      >
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

        {/* ── Superlike badge ── */}
        {isSuperlike && !blurred && (
          <View style={styles.superlikeBadge}>
            <Text style={styles.badgeText}>⭐</Text>
          </View>
        )}

        {/* ── Mutual badge ── */}
        {isMutual && !blurred && (
          <View style={styles.mutualBadge}>
            <Text style={styles.badgeText}>💜 Matched</Text>
          </View>
        )}

        {blurred ? (
          <>
            {/* Glassmorphism overlay */}
            <View style={styles.glassOverlay} />

            {/* Frosted content */}
            <View style={styles.upgradeOverlay}>
              <Text style={styles.upgradeEmoji}>🔥</Text>
              <Text style={styles.upgradeTitle}>Upgrade to</Text>
              <Text style={styles.upgradeBrand}>Flame Plus</Text>
              <View style={styles.upgradePill}>
                <Text style={styles.upgradePillText}>Unlock →</Text>
              </View>
            </View>

            {/* Bottom glass strip — blurred name */}
            <View style={styles.glassStrip}>
              <Text style={styles.blurredName}>— — — —</Text>
            </View>
          </>
        ) : (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
              style={styles.cardGradient}
            />
            <View style={styles.cardInfoOverlay}>
              <View style={styles.nameRow}>
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
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                  {item.age ? `, ${item.age}` : ''}
                </Text>
              </View>
              {!item.isOnline && item.lastActiveAt && (
                <Text style={styles.cardActive}>
                  {formatLastActive(item.lastActiveAt, 3)}
                </Text>
              )}
              {/* Like back hint */}
              {onLikeBack && (
                <Text style={styles.likeBackHint}>Hold to like back</Text>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>
    </ReAnimated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// LIKE-BACK ACTION SHEET
// ════════════════════════════════════════════════════════════════════════════

const LikeBackSheet = ({
  visible,
  user,
  onClose,
  onLike,
  onPass,
  onViewProfile,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={styles.sheetOverlay} onPress={onClose}>
      <Pressable style={styles.sheet}>
        {user?.image && (
          <Image source={{ uri: user.image }} style={styles.sheetImage} />
        )}
        <Text style={styles.sheetName}>
          {user?.name}
          {user?.age ? `, ${user.age}` : ''}
        </Text>
        {user?.goals && <Text style={styles.sheetGoals}>{user.goals}</Text>}

        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={styles.sheetPassBtn}
            onPress={onPass}
            activeOpacity={0.8}
          >
            <Text style={styles.sheetPassText}>✕ Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetLikeBtn}
            onPress={onLike}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF0059', '#FF6B6B']}
              style={styles.sheetLikeGradient}
            >
              <Text style={styles.sheetLikeText}>❤️ Like Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onViewProfile}
          style={styles.sheetViewProfile}
        >
          <Text style={styles.sheetViewProfileText}>View Full Profile →</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

// ════════════════════════════════════════════════════════════════════════════
// PREMIUM BANNER
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
  const apiClient = useRef(createApiClient(token));

  const [activeTab, setActiveTab] = useState('received');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('recent');
  const [refreshing, setRefreshing] = useState(false);
  const [actionSheetUser, setActionSheetUser] = useState(null);
  const [matchedUsers, setMatchedUsers] = useState(null);
  const [currentUserImage, setCurrentUserImage] = useState(null);

  const { sentLikes, receivedLikes, stats, loading, refetch } = useLikes({
    token,
  });
  const { subscription } = useSubscription({ token });
  const isPremium = subscription?.isPremium || false;

  useEffect(() => {
    if (!token) return;
    apiClient.current
      .get('/user-profile')
      .then(resp => {
        if (resp.data.success) {
          setCurrentUserImage(resp.data.user?.imageUrls?.[0] || null);
        }
      })
      .catch(e => console.log('[LikesScreen] fetchProfile:', e.message));
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTabPress = useCallback(tab => {
    setActiveTab(tab);
    setActiveFilter('all');
    setActiveSort('recent');
  }, []);

  // const handleCardPress = useCallback(
  //   item => {
  //     if (!isPremium && activeTab === 'received') return;
  //     navigation.navigate('UserProfile', {
  //       targetUserId: item.userId,
  //       imageUrl: item.image,
  //     });
  //   },
  //   [navigation, isPremium, activeTab],
  // );
  const handleCardPress = useCallback(
    item => {
      navigation.navigate('UserProfile', {
        targetUserId: item.userId,
        imageUrl: item.image,
      });
    },
    [navigation],
  );

  const handleLikeBack = useCallback(
    async item => {
      try {
        const resp = await apiClient.current.post('/swipe', {
          likedId: item.userId,
          type: 'like',
        });

        setActionSheetUser(null);

        if (resp.data.success && resp.data.match) {
          setMatchedUsers({
            user1: {
              name: 'You',
              age: '',
              image: currentUserImage, //  actual image
            },
            user2: {
              name: item.name,
              age: item.age,
              image: item.image,
            },
          });
        }
      } catch (e) {
        console.error('[LikeBack]', e.message);
      }
    },
    [currentUserImage],
  );

  // ── Filter + Sort logic ──
  const processData = useCallback(
    (data, tab) => {
      let filtered = [...data];

      // Filter
      switch (activeFilter) {
        case 'new':
          filtered = filtered.filter(u => {
            if (!u.likedAt) return false;
            return new Date() - new Date(u.likedAt) < 48 * 60 * 60 * 1000; // 48h
          });
          break;
        case 'nearby':
          filtered = filtered.filter(u => u.lat && u.lng);
          break;
        case 'superliked':
          filtered = filtered.filter(u => u.type === 'superlike');
          break;
        case 'mutual':
          filtered = filtered.filter(u => u.isMatched);
          break;
      }

      // Sort
      if (activeSort === 'online') {
        filtered.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return new Date(b.likedAt || 0) - new Date(a.likedAt || 0);
        });
      } else {
        // Recent
        filtered.sort(
          (a, b) => new Date(b.likedAt || 0) - new Date(a.likedAt || 0),
        );
      }

      return filtered;
    },
    [activeFilter, activeSort],
  );

  const processedReceived = useMemo(
    () => processData(receivedLikes, 'received'),
    [receivedLikes, processData],
  );

  const processedSent = useMemo(
    () => processData(sentLikes, 'liked'),
    [sentLikes, processData],
  );

  // ── Render card ──
  const renderCard = useCallback(
    ({ item }) => {
      const isReceivedTab = activeTab === 'received';
      // const blurred = isReceivedTab && !isPremium;
      const blurred = false;

      return (
        <ProfileCard
          item={item}
          blurred={blurred}
          onPress={() => handleCardPress(item)}
          onLikeBack={
            isReceivedTab && isPremium && !item.isMatched
              ? () => setActionSheetUser(item)
              : null
          }
        />
      );
    },
    [activeTab, isPremium, handleCardPress],
  );

  // ── New separator logic (48h) ──
  const getDataWithSeparator = useCallback(data => {
    const newItems = data.filter(
      u => u.likedAt && new Date() - new Date(u.likedAt) < 48 * 60 * 60 * 1000,
    );
    const oldItems = data.filter(
      u =>
        !u.likedAt || new Date() - new Date(u.likedAt) >= 48 * 60 * 60 * 1000,
    );

    const result = [];
    if (newItems.length > 0) {
      result.push({
        _separator: true,
        _label: `🔥 ${newItems.length} New`,
        _key: 'sep_new',
      });
      result.push(...newItems);
    }
    if (oldItems.length > 0 && newItems.length > 0) {
      result.push({ _separator: true, _label: 'Earlier', _key: 'sep_old' });
      result.push(...oldItems);
    } else {
      result.push(...oldItems);
    }
    return result;
  }, []);

  // renderItem update
  const renderItem = useCallback(
    ({ item }) => {
      if (item._type === 'separator') {
        return (
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>{item._label}</Text>
            <View style={styles.separatorLine} />
          </View>
        );
      }

      if (item._type === 'pair') {
        return (
          <View style={styles.row}>
            <ProfileCard
              item={item.left}
              blurred={activeTab === 'received' && !isPremium}
              onPress={() => handleCardPress(item.left)}
              // onLikeBack={
              //   activeTab === 'received' && isPremium && !item.left.isMatched
              //     ? () => setActionSheetUser(item.left)
              //     : null
              // }
              onLikeBack={
                activeTab === 'received' && !item.left.isMatched
                  ? () => setActionSheetUser(item.left)
                  : null
              }
            />
            {item.right ? (
              <ProfileCard
                item={item.right}
                blurred={activeTab === 'received' && !isPremium}
                onPress={() => handleCardPress(item.right)}
                // onLikeBack={
                //   activeTab === 'received' && isPremium && !item.right.isMatched
                //     ? () => setActionSheetUser(item.right)
                //     : null
                // }
                onLikeBack={
                  activeTab === 'received' && !item.right.isMatched
                    ? () => setActionSheetUser(item.right)
                    : null
                }
              />
            ) : (
              <View style={{ width: CARD_WIDTH }} /> // empty placeholder
            )}
          </View>
        );
      }

      return null;
    },
    [activeTab, isPremium, handleCardPress],
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  const currentData =
    activeTab === 'received' ? processedReceived : processedSent;
  // dataWithSeparator ki jagah pairs banao
  const getPairedData = useCallback(data => {
    const result = [];
    let i = 0;
    while (i < data.length) {
      if (data[i]._separator) {
        result.push({ _type: 'separator', ...data[i] });
        i++;
      } else {
        // pair banao
        result.push({
          _type: 'pair',
          _key: `pair_${i}`,
          left: data[i],
          right: data[i + 1] || null,
        });
        i += 2;
      }
    }
    return result;
  }, []);

  const pairedData = useMemo(
    () => getPairedData(getDataWithSeparator(currentData)),
    [currentData, getDataWithSeparator, getPairedData],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes</Text>
      </View>
      {/* Stats Row */}
      <StatsRow stats={stats} loading={loading} />
      {/* Tab Bar */}
      <TabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        receivedCount={receivedLikes.length}
        likedCount={sentLikes.length}
      />
      {/* Filter + Sort Bar */}
      <FilterSortBar
        activeFilter={activeFilter}
        onFilterPress={setActiveFilter}
        activeSort={activeSort}
        onSortPress={setActiveSort}
      />
      {/* Content */}
      <View style={styles.content}>
        {loading && !refreshing ? (
          <SkeletonGrid />
        ) : currentData.length === 0 ? (
          <EmptyState
            emoji={activeTab === 'received' ? '👀' : '💝'}
            title={
              activeFilter !== 'all'
                ? 'No results'
                : activeTab === 'received'
                ? 'No likes yet'
                : 'No likes sent yet'
            }
            subtitle={
              activeFilter !== 'all'
                ? 'Try a different filter'
                : activeTab === 'received'
                ? isPremium
                  ? 'Keep swiping — someone will like you!'
                  : 'Upgrade to see who liked you'
                : 'Start swiping to like profiles!'
            }
          />
        ) : (
          // FlatList mein ye changes karo

          <FlatList
            data={pairedData}
            keyExtractor={(item, i) => item._key || item.userId || String(i)}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FF0059']}
              />
            }
            // ListHeaderComponent={
            //   activeTab === 'received' &&
            //   !isPremium &&
            //   receivedLikes.length > 0 ? (
            //     <PremiumBanner
            //       count={receivedLikes.length}
            //       onUpgrade={() => {}}
            //     />
            //   ) : null
            // }
            ListHeaderComponent={null}
            renderItem={renderItem}
          />
        )}
      </View>
      {/* Like-back Action Sheet */}
      <LikeBackSheet
        visible={!!actionSheetUser}
        user={actionSheetUser}
        onClose={() => setActionSheetUser(null)}
        onLike={() => handleLikeBack(actionSheetUser)}
        onPass={() => setActionSheetUser(null)}
        onViewProfile={() => {
          setActionSheetUser(null);
          navigation.navigate('UserProfile', {
            targetUserId: actionSheetUser.userId,
            imageUrl: actionSheetUser.image,
          });
        }}
      />
      <MatchModal
        visible={matchedUsers !== null}
        user1={matchedUsers?.user1}
        user2={matchedUsers?.user2}
        onKeepSwiping={() => setMatchedUsers(null)}
        onLetsChat={() => {
          setMatchedUsers(null);
          navigation.navigate('Chat', {
            matchId: null,
            userName: matchedUsers?.user2?.name || 'Match',
          });
        }}
      />
      ;
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 16 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  statDivider: { width: 1, height: 36, backgroundColor: '#E2E8F0' },
  statSkeletonNum: {
    width: 40,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  statSkeletonLabel: {
    width: 60,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
  },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 0 },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#FF0059' },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeActive: { backgroundColor: '#FFF1F5' },
  tabBadgeText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  tabIndicator: {
    width: '70%',
    height: 2.5,
    backgroundColor: '#FF0059',
    borderRadius: 2,
    marginBottom: -1.5,
  },

  // Filter Bar
  filterBarWrapper: { backgroundColor: '#fff', zIndex: 9, elevation: 2 },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#FF0059', borderColor: '#FF0059' },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },
  sortDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },

  // Content
  content: { flex: 1 },
  grid: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 0,
  },

  // Separator
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
    gap: 8,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  separatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    paddingHorizontal: 4,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
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
    paddingBottom: 10,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDotInline: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cardName: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },
  cardActive: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  likeBackHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    fontWeight: '500',
  },

  // Badges
  superlikeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.6)',
  },
  mutualBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(139,92,246,0.85)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Skeleton
  skeletonInfo: { position: 'absolute', bottom: 10, left: 10, right: 10 },
  skeletonName: {
    width: '70%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    marginBottom: 6,
  },
  skeletonAge: {
    width: '40%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  skeletonRowLeft: { marginBottom: 12 },
  skeletonRowRight: { marginBottom: 12, alignSelf: 'flex-end' },

  // Blur card
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
  lockIcon: { fontSize: 18 },
  unlockHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
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
  },

  // Premium banner
  premiumBanner: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
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

  // Action Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  sheetImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  sheetName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sheetGoals: { fontSize: 13, color: '#94A3B8', marginBottom: 20 },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  sheetPassBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  sheetPassText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  sheetLikeBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  sheetLikeGradient: { paddingVertical: 14, alignItems: 'center' },
  sheetLikeText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sheetViewProfile: { paddingVertical: 8 },
  sheetViewProfileText: { fontSize: 13, color: '#FF0059', fontWeight: '600' },

  // Styles — purane lockCenter, lockIconWrapper, lockIcon, unlockHint hata ke yeh add karo
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 10, 20, 0.45)',
  },
  upgradeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 50,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  upgradeEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  upgradeTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  upgradeBrand: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  upgradePill: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#FF0059',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  upgradePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  // Empty
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
