/**
 * LikesScreen — Parent Tabs: Likes | Visitors
 * Likes subtabs: Liked You | You Liked
 * Visitors: inline VisitorsScreen content
 *
 * Changes:
 *  - Lottie hearts.json on empty state
 *  - Smooth fade + slide parent tab transition
 *  - Glassmorphism stats row (blue / pink / gold per stat)
 *  - Match CTA (chat.png) on mutual cards — bottom-right overlay
 *  - Visitor card: both "active" + "seen x ago" overlays, clearly labelled
 *  - Bottom padding for custom tab bar
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
import LottieView from 'lottie-react-native';
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
const TAB_BAR_HEIGHT = 82; // adjust to match your custom tab bar height
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
// SKELETON
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
// EMPTY STATE — Lottie hearts animation
// ════════════════════════════════════════════════════════════════════════════

const EmptyState = ({ title, subtitle }) => (
  <View style={styles.emptyState}>
    <LottieView
      source={require('../assets/animations/hearts.json')}
      autoPlay
      loop
      style={styles.emptyLottie}
      resizeMode="contain"
    />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySub}>{subtitle}</Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// STATS ROW — Glassmorphism with per-stat colors
// ════════════════════════════════════════════════════════════════════════════

const STAT_CONFIGS = [
  {
    key: 'views',
    label: 'Views',
    icon: '👀',
    colors: ['#EFF6FF', '#DBEAFE'],
    valueColor: '#1D4ED8',
    iconBg: 'rgba(59,130,246,0.13)',
    borderColor: 'rgba(59,130,246,0.18)',
  },
  {
    key: 'likes',
    label: 'Likes',
    icon: '❤️',
    colors: ['#FFF1F5', '#FFE4EE'],
    valueColor: '#FF0059',
    iconBg: 'rgba(255,0,89,0.1)',
    borderColor: 'rgba(255,0,89,0.18)',
  },
  {
    key: 'superlikes',
    label: 'Superlikes',
    icon: '⭐',
    colors: ['#FFFBEB', '#FEF3C7'],
    valueColor: '#D97706',
    iconBg: 'rgba(217,119,6,0.12)',
    borderColor: 'rgba(245,158,11,0.22)',
  },
];

const StatsRow = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <View style={styles.statsGlassWrapper}>
        <View style={styles.statsGlassCard}>
          {[...Array(3)].map((_, i) => (
            <React.Fragment key={i}>
              <View style={styles.statBubbleSkeleton}>
                <View style={styles.statSkeletonIcon} />
                <View style={styles.statSkeletonNum} />
                <View style={styles.statSkeletonLabel} />
              </View>
              {i < 2 && <View style={styles.statVertDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  const values = [
    stats.profileViews || 0,
    stats.totalReceived || 0,
    stats.superlikesReceived || 0,
  ];

  return (
    <ReAnimated.View
      entering={FadeIn.duration(400)}
      style={styles.statsGlassWrapper}
    >
      {/* outer glass card */}
      <View style={styles.statsGlassCard}>
        {STAT_CONFIGS.map((cfg, i) => (
          <React.Fragment key={cfg.key}>
            <LinearGradient
              colors={cfg.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statBubble, { borderColor: cfg.borderColor }]}
            >
              {/* icon pill */}
              <View
                style={[styles.statIconBubble, { backgroundColor: cfg.iconBg }]}
              >
                <Text style={styles.statIconText}>{cfg.icon}</Text>
              </View>
              <Text style={[styles.statValue, { color: cfg.valueColor }]}>
                {values[i] > 999 ? '999+' : values[i]}
              </Text>
              <Text style={styles.statLabel}>{cfg.label}</Text>
            </LinearGradient>
            {i < STAT_CONFIGS.length - 1 && (
              <View style={styles.statVertDivider} />
            )}
          </React.Fragment>
        ))}
      </View>
    </ReAnimated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PARENT TAB BAR — Likes | Visitors
// ════════════════════════════════════════════════════════════════════════════

const ParentTabBar = ({ activeParent, onPress, likesCount, visitorsCount }) => {
  // 0 = likes (left), 1 = visitors (right)
  const slideAnim = useRef(
    new Animated.Value(activeParent === 'likes' ? 0 : 1),
  ).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeParent === 'likes' ? 0 : 1,
      useNativeDriver: true,
      bounciness: 6,
      speed: 16,
    }).start();
  }, [activeParent]);

  const PILL_WIDTH = containerWidth > 0 ? (containerWidth - 8) / 2 : 0; // half minus padding
  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PILL_WIDTH],
  });

  const tabs = [
    { key: 'likes', label: '❤️ Likes', count: likesCount },
    { key: 'visitors', label: '👀 Visitors', count: visitorsCount },
  ];

  return (
    <View style={styles.parentTabWrapper}>
      <View
        style={styles.parentTabContainer}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {/* sliding gradient pill — sits behind labels */}
        {PILL_WIDTH > 0 && (
          <Animated.View
            style={[
              styles.parentTabPill,
              {
                width: PILL_WIDTH,
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['#FF0059', '#FF6B6B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {tabs.map(tab => {
          const isActive = activeParent === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.parentTab}
              onPress={() => onPress(tab.key)}
              activeOpacity={0.85}
            >
              <View style={styles.parentTabInner}>
                <Text
                  style={[
                    styles.parentTabText,
                    isActive && styles.parentTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.parentTabBadge,
                      isActive && styles.parentTabBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.parentTabBadgeText,
                        isActive && styles.parentTabBadgeTextActive,
                      ]}
                    >
                      {tab.count > 99 ? '99+' : tab.count}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// CHILD TAB BAR — Liked You | You Liked
// ════════════════════════════════════════════════════════════════════════════

const ChildTabBar = ({ activeTab, onTabPress, receivedCount, likedCount }) => (
  <View style={styles.childTabBar}>
    {[
      { key: 'received', label: 'Liked You', count: receivedCount },
      { key: 'liked', label: 'You Liked', count: likedCount },
    ].map(tab => {
      const isActive = activeTab === tab.key;
      return (
        <TouchableOpacity
          key={tab.key}
          style={styles.childTab}
          onPress={() => onTabPress(tab.key)}
          activeOpacity={0.8}
        >
          <View style={styles.childTabLabelRow}>
            <Text
              style={[
                styles.childTabText,
                isActive && styles.childTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  styles.childTabBadge,
                  isActive && styles.childTabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.childTabBadgeText,
                    isActive && styles.childTabBadgeTextActive,
                  ]}
                >
                  {tab.count > 99 ? '99+' : tab.count}
                </Text>
              </View>
            )}
          </View>
          {isActive && <View style={styles.childTabIndicator} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// FILTER + SORT BAR
// ════════════════════════════════════════════════════════════════════════════

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: '✨ New' },
  { key: 'nearby', label: '📍 Nearby' },
  { key: 'superliked', label: '⭐ Superliked' },
  { key: 'mutual', label: '💜 Mutual' },
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
// PROFILE CARD (Likes)
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = ({
  item,
  onPress,
  onLikeBack,
  onMessage,
  blurred = false,
}) => {
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

        {/* ── Superlike badge — top left ── */}
        {isSuperlike && !blurred && (
          <View style={styles.superlikeBadge}>
            <Text style={styles.badgeText}>⭐</Text>
          </View>
        )}

        {/* ── Mutual badge — top right ── */}
        {isMutual && !blurred && (
          <View style={styles.mutualBadge}>
            <Text style={styles.badgeText}>💜 Matched</Text>
          </View>
        )}

        {blurred ? (
          <>
            <View style={styles.glassOverlay} />
            <View style={styles.upgradeOverlay}>
              <Text style={styles.upgradeEmoji}>🔥</Text>
              <Text style={styles.upgradeTitle}>Upgrade to</Text>
              <Text style={styles.upgradeBrand}>Flame Plus</Text>
              <View style={styles.upgradePill}>
                <Text style={styles.upgradePillText}>Unlock →</Text>
              </View>
            </View>
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
              {onLikeBack && !isMutual && (
                <Text style={styles.likeBackHint}>Hold to like back</Text>
              )}
            </View>

            {/* ── Match CTA — bottom-right overlay for mutual cards ── */}
            {isMutual && onMessage && (
              <TouchableOpacity
                style={styles.messageCta}
                onPress={onMessage}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FF0059', '#FF6B6B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.messageCtaGradient}
                >
                  <Image
                    source={require('../assets/Images/chat.png')}
                    style={styles.messageCtaIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.messageCtaText}>Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>
    </ReAnimated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// VISITOR AVATAR (top row)
// ════════════════════════════════════════════════════════════════════════════

const VisitorAvatar = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.avatarWrapper}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.avatarContainer}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatarImage, styles.avatarFallback]}>
          <Text style={{ fontSize: 20 }}>📷</Text>
        </View>
      )}
      {item.isOnline && <View style={styles.avatarOnlineDot} />}
    </View>
    <Text style={styles.avatarName} numberOfLines={1}>
      {item.name}
    </Text>
    <Text style={styles.avatarTime} numberOfLines={1}>
      {formatLastActive(item.visitedAt, 1) || 'Recently'}
    </Text>
  </TouchableOpacity>
);

// ════════════════════════════════════════════════════════════════════════════
// VISITOR CARD (grid) — online status + seen time, both overlays
// ════════════════════════════════════════════════════════════════════════════

const VisitorCard = ({ item, onPress }) => (
  <ReAnimated.View entering={FadeInDown.duration(300).springify()}>
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Text style={{ fontSize: 36 }}>📷</Text>
        </View>
      )}

      {/* online dot — top right */}
      {item.isOnline && <View style={styles.onlineBadge} />}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.75)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardInfoOverlay}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
          {item.age ? `, ${item.age}` : ''}
        </Text>

        {/* line 1 — active status */}
        <Text style={styles.cardActive} numberOfLines={1}>
          {item.isOnline
            ? '🟢 Online now'
            : item.lastActiveAt
            ? `Active ${formatLastActive(item.lastActiveAt, 3)}`
            : ''}
        </Text>

        {/* line 2 — when they visited your profile */}
        {item.visitedAt && (
          <Text style={styles.visitedAtText} numberOfLines={1}>
            👀 Seen {formatLastActive(item.visitedAt, 1) || 'recently'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  </ReAnimated.View>
);

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
      <Pressable style={styles.actionSheet}>
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
// VISITORS CONTENT — inline
// ════════════════════════════════════════════════════════════════════════════

const VisitorsContent = ({ navigation, token, totalViews }) => {
  const apiClient = useRef(createApiClient(token));
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisitors = useCallback(async () => {
    try {
      const resp = await apiClient.current.get('/profile-visitors');
      if (resp.data.success) setVisitors(resp.data.visitors || []);
    } catch (e) {
      console.error('[VisitorsContent]', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVisitors();
    setRefreshing(false);
  }, [fetchVisitors]);

  const handlePress = useCallback(
    item => {
      navigation.navigate('UserProfile', {
        targetUserId: item.userId,
        imageUrl: item.image,
      });
    },
    [navigation],
  );

  const recentVisitors = useMemo(() => visitors.slice(0, 6), [visitors]);
  const gridVisitors = useMemo(() => visitors.slice(6), [visitors]);

  const pairedGrid = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < gridVisitors.length; i += 2) {
      pairs.push({
        _key: `vpair_${i}`,
        left: gridVisitors[i],
        right: gridVisitors[i + 1] || null,
      });
    }
    return pairs;
  }, [gridVisitors]);

  if (loading && !refreshing) return <SkeletonGrid />;

  if (visitors.length === 0)
    return (
      <EmptyState
        title="No visitors yet"
        subtitle="When someone views your profile, they'll appear here"
      />
    );

  return (
    <FlatList
      data={pairedGrid}
      keyExtractor={item => item._key}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.grid,
        { paddingBottom: TAB_BAR_HEIGHT + 16 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#FF0059']}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <VisitorCard
            item={item.left}
            onPress={() => handlePress(item.left)}
          />
          {item.right ? (
            <VisitorCard
              item={item.right}
              onPress={() => handlePress(item.right)}
            />
          ) : (
            <View style={{ width: CARD_WIDTH }} />
          )}
        </View>
      )}
      ListHeaderComponent={
        recentVisitors.length > 0 ? (
          <View style={styles.visitorsHeader}>
            <View style={styles.visitorsSectionRow}>
              <Text style={styles.visitorsSectionLabel}>Recently Viewed</Text>
              <View style={styles.visitorsCountBadge}>
                <Text style={styles.visitorsCountText}>
                  {visitors.length} visitors
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarRow}
            >
              {recentVisitors.map(item => (
                <VisitorAvatar
                  key={item.userId}
                  item={item}
                  onPress={() => handlePress(item)}
                />
              ))}
            </ScrollView>
            {gridVisitors.length > 0 && (
              <View style={styles.visitorsDividerRow}>
                <View style={styles.visitorsDividerLine} />
                <Text style={styles.visitorsDividerText}>All Visitors</Text>
                <View style={styles.visitorsDividerLine} />
              </View>
            )}
          </View>
        ) : null
      }
    />
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function LikesScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const apiClient = useRef(createApiClient(token));

  const [activeParent, setActiveParent] = useState('likes');
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
        if (resp.data.success)
          setCurrentUserImage(resp.data.user?.imageUrls?.[0] || null);
      })
      .catch(() => {});
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleParentTabPress = useCallback(tab => {
    setActiveParent(tab);
  }, []);

  const handleChildTabPress = useCallback(tab => {
    setActiveTab(tab);
    setActiveFilter('all');
    setActiveSort('recent');
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
  const handleMessage = useCallback(
    item => {
      console.log('MATCH ITEM:', JSON.stringify(item));
      console.log('CHAT NAV ITEM:', item.userId, 'matchId:', item.matchId);
      navigation.navigate('Conversation', {
        matchId: item.matchId,
        targetUserId: item.userId,
        name: item.name,
        image: item.image,
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
            user1: { name: 'You', age: '', image: currentUserImage },
            user2: { name: item.name, age: item.age, image: item.image },
          });
        }
      } catch (e) {
        console.error('[LikeBack]', e.message);
      }
    },
    [currentUserImage],
  );

  const processData = useCallback(
    data => {
      let filtered = [...data];
      switch (activeFilter) {
        case 'new':
          filtered = filtered.filter(
            u =>
              u.likedAt &&
              new Date() - new Date(u.likedAt) < 48 * 60 * 60 * 1000,
          );
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
      if (activeSort === 'online') {
        filtered.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return new Date(b.likedAt || 0) - new Date(a.likedAt || 0);
        });
      } else {
        filtered.sort(
          (a, b) => new Date(b.likedAt || 0) - new Date(a.likedAt || 0),
        );
      }
      return filtered;
    },
    [activeFilter, activeSort],
  );

  const processedReceived = useMemo(
    () => processData(receivedLikes),
    [receivedLikes, processData],
  );
  const processedSent = useMemo(
    () => processData(sentLikes),
    [sentLikes, processData],
  );

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
    }
    result.push(...oldItems);
    return result;
  }, []);

  const getPairedData = useCallback(data => {
    const result = [];
    let i = 0;
    while (i < data.length) {
      if (data[i]._separator) {
        result.push({ _type: 'separator', ...data[i] });
        i++;
      } else {
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

  const currentData =
    activeTab === 'received' ? processedReceived : processedSent;
  const pairedData = useMemo(
    () => getPairedData(getDataWithSeparator(currentData)),
    [currentData, getPairedData, getDataWithSeparator],
  );

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
              blurred={false}
              onPress={() => handleCardPress(item.left)}
              onMessage={
                item.left.isMatched ? () => handleMessage(item.left) : null
              }
              onLikeBack={
                activeTab === 'received' && !item.left.isMatched
                  ? () => setActionSheetUser(item.left)
                  : null
              }
            />
            {item.right ? (
              <ProfileCard
                item={item.right}
                blurred={false}
                onPress={() => handleCardPress(item.right)}
                onMessage={
                  item.right.isMatched ? () => handleMessage(item.right) : null
                }
                onLikeBack={
                  activeTab === 'received' && !item.right.isMatched
                    ? () => setActionSheetUser(item.right)
                    : null
                }
              />
            ) : (
              <View style={{ width: CARD_WIDTH }} />
            )}
          </View>
        );
      }
      return null;
    },
    [activeTab, handleCardPress, handleMessage],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {/* ── Stats Row ── */}
      <StatsRow stats={stats} loading={loading} />

      {/* ── Parent Tabs ── */}
      <ParentTabBar
        activeParent={activeParent}
        onPress={handleParentTabPress}
        likesCount={receivedLikes.length + sentLikes.length}
        visitorsCount={stats?.profileViews || 0}
      />

      {/* ── Content Area ── */}
      <View style={styles.content}>
        {activeParent === 'likes' ? (
          <>
            {/* Child Tabs */}
            <ChildTabBar
              activeTab={activeTab}
              onTabPress={handleChildTabPress}
              receivedCount={receivedLikes.length}
              likedCount={sentLikes.length}
            />
            {/* Filter + Sort */}
            <FilterSortBar
              activeFilter={activeFilter}
              onFilterPress={setActiveFilter}
              activeSort={activeSort}
              onSortPress={setActiveSort}
            />
            {/* Likes Grid */}
            {loading && !refreshing ? (
              <SkeletonGrid />
            ) : currentData.length === 0 ? (
              <EmptyState
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
                    ? 'Keep swiping — someone will like you!'
                    : 'Start swiping to like profiles!'
                }
              />
            ) : (
              <FlatList
                data={pairedData}
                keyExtractor={(item, i) => item._key || String(i)}
                contentContainerStyle={[
                  styles.grid,
                  { paddingBottom: TAB_BAR_HEIGHT + 16 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#FF0059']}
                  />
                }
                renderItem={renderItem}
              />
            )}
          </>
        ) : (
          /* ── Visitors Tab ── */
          <VisitorsContent
            navigation={navigation}
            token={token}
            totalViews={stats?.profileViews || 0}
          />
        )}
      </View>

      {/* ── Like-back Sheet ── */}
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

      {/* ── Match Modal ── */}
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

  // ── Stats Glassmorphism ──
  statsGlassWrapper: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  statsGlassCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    overflow: 'hidden',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  statBubble: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 4,
    borderWidth: 0,
    borderRightWidth: 0,
  },
  statIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statIconText: { fontSize: 15 },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  statVertDivider: {
    width: 1,
    backgroundColor: 'rgba(226,232,240,0.9)',
    alignSelf: 'stretch',
  },

  // skeleton stats
  statBubbleSkeleton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  statSkeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  statSkeletonNum: {
    width: 40,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  statSkeletonLabel: {
    width: 52,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },

  // ── Parent Tabs ──
  parentTabWrapper: { paddingHorizontal: 16, paddingBottom: 12 },
  parentTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    position: 'relative',
  },
  // animated sliding pill — absolutely positioned behind labels
  parentTabPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  parentTab: { flex: 1, borderRadius: 10, zIndex: 1 },
  parentTabActive: {},
  parentTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    borderRadius: 10,
  },
  parentTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  parentTabText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  parentTabTextActive: { color: '#fff' },
  parentTabBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  parentTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  parentTabBadgeText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  parentTabBadgeTextActive: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // ── Child Tabs ──
  childTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  childTab: { flex: 1, alignItems: 'center' },
  childTabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  childTabText: { fontSize: 13, fontWeight: '600', color: '#CBD5E1' },
  childTabTextActive: { color: '#0F172A' },
  childTabBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  childTabBadgeActive: { backgroundColor: '#FEE2E2' },
  childTabBadgeText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  childTabBadgeTextActive: { color: '#FF0059' },
  childTabIndicator: {
    width: '60%',
    height: 2,
    backgroundColor: '#FF0059',
    borderRadius: 2,
    marginBottom: -1,
  },

  // Filter Bar
  filterBarWrapper: { backgroundColor: '#fff', paddingTop: 2 },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#FF0059', borderColor: '#FF0059' },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },
  sortDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },

  // Content
  content: { flex: 1 },
  grid: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // Separator
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  separatorText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },

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
  visitedAtText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },
  likeBackHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Match CTA — bottom-right overlay ──
  messageCta: {
    position: 'absolute',
    bottom: 38, // sits just above name row
    right: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  messageCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 4,
  },
  messageCtaIcon: { width: 13, height: 13, tintColor: '#fff' },
  messageCtaText: { fontSize: 11, fontWeight: '700', color: '#fff' },

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
  onlineBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },

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

  // Blur / premium
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,10,20,0.45)',
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
  upgradeEmoji: { fontSize: 28, marginBottom: 6 },
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
  },
  upgradePillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
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

  // Visitors
  visitorsHeader: { paddingBottom: 8 },
  visitorsSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitorsSectionLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  visitorsCountBadge: {
    backgroundColor: '#FFF1F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  visitorsCountText: { fontSize: 11, fontWeight: '700', color: '#FF0059' },
  avatarRow: { gap: 16, paddingBottom: 4 },
  avatarWrapper: { alignItems: 'center', width: 64 },
  avatarContainer: { position: 'relative', marginBottom: 6 },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#FF0059',
  },
  avatarFallback: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    maxWidth: 64,
  },
  avatarTime: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },
  visitorsDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
    gap: 8,
  },
  visitorsDividerLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  visitorsDividerText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },

  // Action Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
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

  // Empty State — Lottie
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    // paddingTop: 40,
    paddingBottom: 40,
  },
  emptyLottie: { width: 230, height: 230 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',

    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
