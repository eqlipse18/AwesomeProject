/**
 * LikedMeScreen
 * Standalone screen — shows only received likes (Liked You tab)
 * Navigate from ProfileScreen → "See Who Likes Me" button
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
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import ReAnimated, { FadeInDown, FadeIn } from 'react-native-reanimated';
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

// ── Filter / Sort config ──────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'superliked', label: 'Superliked' },
  { key: 'mutual', label: 'Mutual' },
];
const SORTS = [
  { key: 'recent', label: 'Recent' },
  { key: 'online', label: 'Online First' },
];

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
    <Animated.View style={[s.card, { opacity }]}>
      <View style={[s.cardImage, { backgroundColor: '#E2E8F0' }]} />
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
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════
const EmptyState = ({ activeFilter }) => (
  <View style={s.emptyState}>
    <LottieView
      source={require('../assets/animations/hearts.json')}
      autoPlay
      loop
      style={s.emptyLottie}
      resizeMode="contain"
    />
    <Text style={s.emptyTitle}>
      {activeFilter !== 'all' ? 'No results' : 'No likes yet'}
    </Text>
    <Text style={s.emptySub}>
      {activeFilter !== 'all'
        ? 'Try a different filter'
        : 'Keep swiping — someone will like you soon! 💫'}
    </Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// FILTER + SORT BAR
// ════════════════════════════════════════════════════════════════════════════
const FilterSortBar = ({
  activeFilter,
  onFilterPress,
  activeSort,
  onSortPress,
}) => (
  <View style={s.filterBarWrapper}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filterBar}
    >
      {FILTERS.map(f => (
        <TouchableOpacity
          key={f.key}
          style={[s.filterChip, activeFilter === f.key && s.filterChipActive]}
          onPress={() => onFilterPress(f.key)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              s.filterChipText,
              activeFilter === f.key && s.filterChipTextActive,
            ]}
          >
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
      <View style={s.sortDivider} />
      {SORTS.map(sort => (
        <TouchableOpacity
          key={sort.key}
          style={[s.sortChip, activeSort === sort.key && s.sortChipActive]}
          onPress={() => onSortPress(sort.key)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              s.filterChipText,
              activeSort === sort.key && s.filterChipTextActive,
            ]}
          >
            {sort.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CARD
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
        style={s.card}
        onPress={onPress}
        activeOpacity={blurred ? 1 : 0.9}
        onLongPress={onLikeBack}
        delayLongPress={300}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={s.cardImage}
            blurRadius={blurred ? 18 : 0}
          />
        ) : (
          <View style={[s.cardImage, s.cardImageFallback]}>
            <Text style={{ fontSize: 36 }}>📷</Text>
          </View>
        )}

        {isSuperlike && !blurred && (
          <View style={s.superlikeBadge}>
            <Text style={s.badgeText}>⭐</Text>
          </View>
        )}
        {isMutual && !blurred && (
          <View style={s.mutualBadge}>
            <Text style={s.badgeText}> Matched</Text>
          </View>
        )}

        {blurred ? (
          <>
            <View style={s.glassOverlay} />
            <View style={s.blurredBottomBar}>
              <View style={s.blurredNameRow}>
                <View style={s.namePill} />
                {!!item.age && <Text style={s.blurredAge}>{item.age}</Text>}
                {item.isVerified && <Text style={s.verifiedBadge}>✔</Text>}
              </View>
              {item.isOnline ? (
                <View style={s.onlineRow}>
                  <View style={s.onlineDot} />
                  <Text style={[s.blurredStatus, { color: '#22C55E' }]}>
                    Online
                  </Text>
                </View>
              ) : item.lastActiveAt ? (
                <Text style={s.blurredStatus}>
                  Active {formatLastActive(item.lastActiveAt, 3)}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
              style={s.cardGradient}
            />
            <View style={s.cardInfoOverlay}>
              <View style={s.nameRow}>
                <Text style={s.cardName} numberOfLines={1}>
                  {item.name}
                  {item.age ? `, ${item.age}` : ''}
                </Text>
              </View>
              {item.isOnline ? (
                <View style={s.onlineRow}>
                  <View style={s.onlineDot} />
                  <Text style={s.onlineText}>Online</Text>
                </View>
              ) : item.lastActiveAt ? (
                <Text style={s.cardActive}>
                  {formatLastActive(item.lastActiveAt, 3)}
                </Text>
              ) : null}
              {onLikeBack && !isMutual && (
                <Text style={s.likeBackHint}>Hold to like back</Text>
              )}
            </View>

            {isMutual && onMessage && (
              <TouchableOpacity
                style={s.messageCta}
                onPress={onMessage}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FF0059', '#FF6B6B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.messageCtaGradient}
                >
                  <Image
                    source={require('../assets/Images/chat.png')}
                    style={s.messageCtaIcon}
                    resizeMode="contain"
                  />
                  <Text style={s.messageCtaText}>Chat</Text>
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
    <Pressable style={s.sheetOverlay} onPress={onClose}>
      <Pressable style={s.actionSheet}>
        {user?.image && (
          <Image source={{ uri: user.image }} style={s.sheetImage} />
        )}
        <Text style={s.sheetName}>
          {user?.name}
          {user?.age ? `, ${user.age}` : ''}
        </Text>
        {user?.goals && <Text style={s.sheetGoals}>{user.goals}</Text>}
        <View style={s.sheetActions}>
          <TouchableOpacity
            style={s.sheetPassBtn}
            onPress={onPass}
            activeOpacity={0.8}
          >
            <Text style={s.sheetPassText}>✕ Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.sheetLikeBtn}
            onPress={onLike}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF0059', '#FF6B6B']}
              style={s.sheetLikeGradient}
            >
              <Text style={s.sheetLikeText}>❤️ Like Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onViewProfile} style={s.sheetViewProfile}>
          <Text style={s.sheetViewProfileText}>View Full Profile →</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════
export default function LikedMeScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const apiClient = useRef(createApiClient(token));
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('recent');
  const [refreshing, setRefreshing] = useState(false);
  const [actionSheetUser, setActionSheetUser] = useState(null);
  const [matchedUsers, setMatchedUsers] = useState(null);
  const [currentUserImage, setCurrentUserImage] = useState(null);

  const { receivedLikes, loading, refetch, isBlurred } = useLikes({ token });
  const { subscription } = useSubscription({ token });

  useEffect(() => {
    if (!token) return;
    apiClient.current
      .get('/user-profile')
      .then(resp => {
        if (resp.data.success) {
          setCurrentUserImage(resp.data.user?.imageUrls?.[0] || null);
        }
      })
      .catch(() => {});
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ── Process data ────────────────────────────────────────────────────────
  const processedData = useMemo(() => {
    let filtered = [...receivedLikes];
    switch (activeFilter) {
      case 'new':
        filtered = filtered.filter(
          u => u.likedAt && new Date() - new Date(u.likedAt) < 48 * 3600000,
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
  }, [receivedLikes, activeFilter, activeSort]);

  // ── New / old separator ─────────────────────────────────────────────────
  const dataWithSep = useMemo(() => {
    const newItems = processedData.filter(
      u => u.likedAt && new Date() - new Date(u.likedAt) < 48 * 3600000,
    );
    const oldItems = processedData.filter(
      u => !u.likedAt || new Date() - new Date(u.likedAt) >= 48 * 3600000,
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
  }, [processedData]);

  const pairedData = useMemo(() => {
    const result = [];
    let i = 0;
    while (i < dataWithSep.length) {
      if (dataWithSep[i]._separator) {
        result.push({ _type: 'separator', ...dataWithSep[i] });
        i++;
      } else {
        result.push({
          _type: 'pair',
          _key: `pair_${i}`,
          left: dataWithSep[i],
          right: dataWithSep[i + 1] || null,
        });
        i += 2;
      }
    }
    return result;
  }, [dataWithSep]);

  // ── Handlers ────────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }) => {
      if (item._type === 'separator') {
        return (
          <View style={s.separator}>
            <View style={s.separatorLine} />
            <Text style={s.separatorText}>{item._label}</Text>
            <View style={s.separatorLine} />
          </View>
        );
      }
      return (
        <View style={s.row}>
          <ProfileCard
            item={item.left}
            blurred={isBlurred}
            onPress={() => handleCardPress(item.left)}
            onMessage={
              item.left.isMatched ? () => handleMessage(item.left) : null
            }
            onLikeBack={
              !item.left.isMatched ? () => setActionSheetUser(item.left) : null
            }
          />
          {item.right ? (
            <ProfileCard
              item={item.right}
              blurred={isBlurred}
              onPress={() => handleCardPress(item.right)}
              onMessage={
                item.right.isMatched ? () => handleMessage(item.right) : null
              }
              onLikeBack={
                !item.right.isMatched
                  ? () => setActionSheetUser(item.right)
                  : null
              }
            />
          ) : (
            <View style={{ width: CARD_WIDTH }} />
          )}
        </View>
      );
    },
    [isBlurred, handleCardPress, handleMessage],
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.backIco}>←</Text>
        </TouchableOpacity>

        <Text style={s.headerTitle}>Liked Me</Text>

        <ReAnimated.View entering={FadeIn.duration(400)} style={s.countBadge}>
          <Text style={s.countEmoji}>❤️</Text>
          <Text style={s.countNum}>
            {receivedLikes.length > 99 ? '99+' : receivedLikes.length}
          </Text>
          <Text style={s.countLabel}>likes</Text>
        </ReAnimated.View>
      </View>

      {/* ── Filter + Sort ── */}
      <FilterSortBar
        activeFilter={activeFilter}
        onFilterPress={setActiveFilter}
        activeSort={activeSort}
        onSortPress={setActiveSort}
      />

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <SkeletonGrid />
      ) : processedData.length === 0 ? (
        <EmptyState activeFilter={activeFilter} />
      ) : (
        <FlatList
          data={pairedData}
          keyExtractor={(item, i) => item._key || String(i)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.grid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF0059']}
            />
          }
        />
      )}

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
          navigation.navigate('Chat');
        }}
      />
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  backIco: { fontSize: 18, color: '#0F172A' },
  headerTitle: {
    flex: 1,
    fontSize: 26,
    fontFamily: 'LobsterTwo-BoldItalic',
    color: '#0F172A',
    letterSpacing: 1,
  },
  countBadge: {
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
  countEmoji: { fontSize: 11 },
  countNum: { fontSize: 16, fontWeight: '800', color: '#FF0059' },
  countLabel: { fontSize: 14, color: '#FF0059', fontWeight: '600' },

  // Filter bar
  filterBarWrapper: {
    backgroundColor: 'rgba(255,228,236,0.5)',
    borderRadius: 20,
    marginHorizontal: 10,
    marginBottom: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'pink',
    backgroundColor: 'white',
  },
  filterChipActive: { backgroundColor: '#FF0059', borderColor: '#fc86ab' },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: { backgroundColor: '#546586', borderColor: '#3d4b6a' },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    color: '#75757599',
    letterSpacing: 0.3,
  },
  filterChipTextActive: { color: '#fff' },
  sortDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },

  // Grid
  grid: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
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
  separatorLine: { flex: 1, height: 1, backgroundColor: '#FFE4EC' },
  separatorText: { fontSize: 12, fontWeight: '700', color: '#FF0059' },

  // Card
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
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
  cardName: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },
  cardActive: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  likeBackHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignSelf: 'flex-start',
    borderRadius: 12,
  },

  // Online
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  onlineText: { fontSize: 11, fontWeight: '700', color: '#22C55E' },

  // Blurred state
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,10,20,0.25)',
  },
  blurredBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 40,
  },
  blurredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  namePill: {
    width: 90,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(200,200,200,0.55)',
  },
  blurredAge: { fontSize: 14, fontWeight: '700', color: '#fff' },
  blurredStatus: { fontSize: 13, fontWeight: '700', color: '#fff' },
  verifiedBadge: { fontSize: 14, color: '#3B82F6' },

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

  // Match CTA
  messageCta: {
    position: 'absolute',
    bottom: 38,
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

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  emptyLottie: { width: 200, height: 200 },
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
    marginTop: 8,
  },
});
