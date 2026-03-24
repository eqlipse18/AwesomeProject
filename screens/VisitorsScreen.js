/**
 * VisitorsScreen.js
 * - Top row: recent 6 visitors horizontal scroll
 * - Grid: all visitors in card style
 * - Stats: total profile views
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
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import ReAnimated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import axios from 'axios';
import Config from 'react-native-config';
import { AuthContext } from '../AuthContex';
import { formatLastActive } from '../src/hooks/useOnlineStatus';

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
      <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
        <View
          style={{
            width: '70%',
            height: 12,
            borderRadius: 6,
            backgroundColor: '#CBD5E1',
            marginBottom: 6,
          }}
        />
        <View
          style={{
            width: '40%',
            height: 10,
            borderRadius: 5,
            backgroundColor: '#CBD5E1',
          }}
        />
      </View>
    </Animated.View>
  );
};

const SkeletonRow = () => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 16,
    }}
  >
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// TOP RECENT VISITOR AVATAR
// ════════════════════════════════════════════════════════════════════════════

const RecentVisitorAvatar = ({ item, onPress }) => (
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
          <Text style={{ fontSize: 22 }}>📷</Text>
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
// VISITOR CARD — grid style
// ════════════════════════════════════════════════════════════════════════════

const VisitorCard = ({ item, onPress }) => (
  <ReAnimated.View entering={FadeInDown.duration(300).springify()}>
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardFallback]}>
          <Text style={{ fontSize: 36 }}>📷</Text>
        </View>
      )}

      {/* Online dot badge */}
      {item.isOnline && (
        <View style={styles.onlineBadge}>
          <View style={styles.onlineBadgeDot} />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
          {item.age ? `, ${item.age}` : ''}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {item.isOnline
            ? '🟢 Online'
            : formatLastActive(item.lastActiveAt, 3) || ''}
        </Text>
        <Text style={styles.visitedAt} numberOfLines={1}>
          👀 {formatLastActive(item.visitedAt, 1) || 'Recently'}
        </Text>
      </View>
    </TouchableOpacity>
  </ReAnimated.View>
);

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════

const EmptyState = () => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>👀</Text>
    <Text style={styles.emptyTitle}>No visitors yet</Text>
    <Text style={styles.emptySub}>
      When someone views your profile, they'll show up here
    </Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function VisitorsScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const apiClient = useRef(createApiClient(token));

  const [visitors, setVisitors] = useState([]);
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisitors = useCallback(async () => {
    try {
      const [visitorsResp, statsResp] = await Promise.all([
        apiClient.current.get('/profile-visitors'),
        apiClient.current.get('/likes/stats'),
      ]);

      if (visitorsResp.data.success)
        setVisitors(visitorsResp.data.visitors || []);

      if (statsResp.data.success)
        setTotalViews(statsResp.data.stats?.profileViews || 0);
    } catch (e) {
      console.error('[VisitorsScreen]', e.message);
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

  const handleCardPress = useCallback(
    item => {
      navigation.navigate('UserProfile', {
        targetUserId: item.userId,
        imageUrl: item.image,
      });
    },
    [navigation],
  );

  // Split: top 6 recent + rest in grid
  const recentVisitors = useMemo(() => visitors.slice(0, 6), [visitors]);
  const gridVisitors = useMemo(() => visitors.slice(6), [visitors]);

  // Pair grid visitors for manual 2-col layout
  const pairedGrid = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < gridVisitors.length; i += 2) {
      pairs.push({
        _key: `pair_${i}`,
        left: gridVisitors[i],
        right: gridVisitors[i + 1] || null,
      });
    }
    return pairs;
  }, [gridVisitors]);

  const renderPair = useCallback(
    ({ item }) => (
      <View style={styles.row}>
        <VisitorCard
          item={item.left}
          onPress={() => handleCardPress(item.left)}
        />
        {item.right ? (
          <VisitorCard
            item={item.right}
            onPress={() => handleCardPress(item.right)}
          />
        ) : (
          <View style={{ width: CARD_WIDTH }} />
        )}
      </View>
    ),
    [handleCardPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile Visitors</Text>
        <ReAnimated.View
          entering={FadeIn.duration(400)}
          style={styles.viewsBadge}
        >
          <Text style={styles.viewsIcon}>👀</Text>
          <Text style={styles.viewsCount}>
            {totalViews > 999 ? '999+' : totalViews}
          </Text>
          <Text style={styles.viewsLabel}>total views</Text>
        </ReAnimated.View>
      </View>

      {loading ? (
        <View style={{ paddingTop: 12 }}>
          {/* Skeleton top row */}
          <View style={styles.recentSkeletonRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.avatarSkeletonWrapper}>
                <View style={styles.avatarSkeletonCircle} />
                <View style={styles.avatarSkeletonName} />
              </View>
            ))}
          </View>
          {/* Skeleton grid */}
          {[...Array(3)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : visitors.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={pairedGrid}
          keyExtractor={item => item._key}
          renderItem={renderPair}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF0059']}
            />
          }
          ListHeaderComponent={
            recentVisitors.length > 0 ? (
              <View style={styles.recentSection}>
                {/* Section label */}
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>Recently Viewed</Text>
                  <Text style={styles.sectionCount}>
                    {visitors.length} visitors
                  </Text>
                </View>

                {/* Horizontal avatar row */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarRow}
                >
                  {recentVisitors.map(item => (
                    <RecentVisitorAvatar
                      key={item.userId}
                      item={item}
                      onPress={() => handleCardPress(item)}
                    />
                  ))}
                </ScrollView>

                {/* Divider before grid */}
                {gridVisitors.length > 0 && (
                  <View style={styles.sectionDividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>All Visitors</Text>
                    <View style={styles.dividerLine} />
                  </View>
                )}
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  viewsIcon: { fontSize: 14 },
  viewsCount: { fontSize: 16, fontWeight: '800', color: '#FF0059' },
  viewsLabel: { fontSize: 11, color: '#FF0059', fontWeight: '600' },

  // Recent section
  recentSection: { paddingBottom: 8 },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  sectionCount: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  // Avatar row
  avatarRow: { paddingHorizontal: 16, gap: 16, paddingBottom: 4 },
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

  // Divider
  sectionDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },

  // Grid
  grid: { paddingTop: 12, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
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
  cardFallback: {
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
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  cardName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cardMeta: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  visitedAt: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // Online badge on card
  onlineBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineBadgeDot: { flex: 1 },

  // Skeleton
  recentSkeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 20,
  },
  avatarSkeletonWrapper: { alignItems: 'center', gap: 6 },
  avatarSkeletonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E8F0',
  },
  avatarSkeletonName: {
    width: 48,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
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
