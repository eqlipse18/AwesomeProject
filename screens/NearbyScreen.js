/**
 * NearbyScreen - People closest to you 📍
 *
 * Features:
 * - Carousel same as DailyScreen
 * - Radius chips: 5km / 25km / 50km / 100km (default 25km)
 * - Header: "X people within 25km"
 * - Distance badge prominent on each card
 * - 300ms debounce on chip change
 * - Infinite scroll (load more offset-based)
 * - "All caught up" end card with last user's blurred image
 * - Empty state: no location / no profiles
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import axios from 'axios';
import Config from 'react-native-config';
import { AuthContext } from '../AuthContex';
import changeNavigationBarColor from 'react-native-navigation-bar-color';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const _cardWidth = SCREEN_WIDTH * 0.76;
const _cardHeight = SCREEN_HEIGHT * 0.62;
const _spacing = 16;

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const RADIUS_OPTIONS = [
  { label: '5 km', value: 5 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
];

const formatDistanceShort = km => {
  if (km < 1) return '< 1 km';
  if (km < 10) return `${Math.round(km)} km`;
  return `${Math.round(km / 5) * 5} km`;
};

// ════════════════════════════════════════════════════════════════════════════
// BACKDROP
// ════════════════════════════════════════════════════════════════════════════

const BackdropPhoto = ({ uri, index, scrollX }) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [index - 1, index - 0.4, index, index + 0.4, index + 1],
      [0, 0.45, 1, 0.45, 0],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.Image
      renderToHardwareTextureAndroid
      source={{ uri }}
      style={[StyleSheet.absoluteFillObject, style]}
      blurRadius={50}
    />
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CARD
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = ({ item, index, scrollX }) => {
  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [0.84, 1, 0.84],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [24, 0, 24],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }, { translateY }] };
  });

  const imageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [1.3, 1, 1.3],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [-4, 0, 4],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }, { rotate: `${rotate}deg` }] };
  });

  useEffect(() => {
    if (Platform.OS === 'android') changeNavigationBarColor('#000000', false);
  }, []);

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {item.image ? (
        <Animated.Image
          renderToHardwareTextureAndroid
          source={{ uri: item.image }}
          style={[StyleSheet.absoluteFillObject, imageStyle]}
        />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={{ fontSize: 48 }}>📷</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.cardGradient}
      />

      <View style={styles.cardInfo}>
        {/* ✅ Distance badge — USP */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>
            📍 {formatDistanceShort(item.distanceKm)} away
          </Text>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.age ? <Text style={styles.cardAge}>{item.age}</Text> : null}
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>

        {item.hometown ? (
          <Text style={styles.cardHometown} numberOfLines={1}>
            {item.hometown}
          </Text>
        ) : null}

        {item.goals ? (
          <Text style={styles.cardGoals} numberOfLines={2}>
            {item.goals}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// END CARD — last user's blurred image ✨
// ════════════════════════════════════════════════════════════════════════════

const EndCard = ({
  index,
  scrollX,
  lastImage,
  currentRadius,
  onExpand,
  onRefresh,
}) => {
  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [0.84, 1, 0.84],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [24, 0, 24],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }, { translateY }] };
  });

  // Next radius option
  const nextRadius = useMemo(() => {
    const idx = RADIUS_OPTIONS.findIndex(r => r.value === currentRadius);
    return idx < RADIUS_OPTIONS.length - 1 ? RADIUS_OPTIONS[idx + 1] : null;
  }, [currentRadius]);

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Last user's blurred image as bg */}
      {lastImage ? (
        <ImageBackground
          source={{ uri: lastImage }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={18}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: '#1a1a1a' },
          ]}
        />
      )}

      {/* Dark overlay for readability */}
      <View style={styles.endCardOverlay} />

      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={styles.cardGradient}
      />

      {/* Content — centered */}
      <View style={styles.endCardContent}>
        <Text style={styles.endCardEmoji}>🌏</Text>

        <Text style={styles.endCardTitle}>All caught up!</Text>
        <Text style={styles.endCardSub}>
          You've seen everyone{'\n'}within {currentRadius} km
        </Text>

        <View style={styles.endCardButtons}>
          {/* Expand — primary, same style as chipActive */}
          {nextRadius && (
            <TouchableOpacity
              style={styles.endCardBtnPrimary}
              onPress={() => onExpand(nextRadius.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.endCardBtnPrimaryText}>
                Expand to {nextRadius.label} →
              </Text>
            </TouchableOpacity>
          )}

          {/* Refresh — secondary, same style as inactive chip */}
          <TouchableOpacity
            style={styles.endCardBtnSecondary}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Text style={styles.endCardBtnSecondaryText}>↺ Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════

const EmptyState = ({ noLocation, radius, onEnableLocation }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>{noLocation ? '📍' : '🌏'}</Text>
    <Text style={styles.emptyTitle}>
      {noLocation ? 'Location Required' : `No one within ${radius} km`}
    </Text>
    <Text style={styles.emptyMsg}>
      {noLocation
        ? 'Enable location access to discover people near you'
        : 'Try increasing the radius to find more people'}
    </Text>
    {noLocation && (
      <TouchableOpacity style={styles.enableBtn} onPress={onEnableLocation}>
        <Text style={styles.enableBtnText}>Enable Location</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function NearbyScreen({ navigation }) {
  const { token } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [noLocation, setNoLocation] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(25);

  const scrollX = useSharedValue(0);
  const debounceTimer = useRef(null);

  const apiClient = useRef(
    axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }),
  );

  // ── Fetch ──
  const fetchNearby = useCallback(
    async (radius, currentOffset = 0, append = false) => {
      if (!token) return;
      try {
        if (currentOffset === 0) setLoading(true);
        else setLoadingMore(true);

        const resp = await apiClient.current.get('/nearby', {
          params: { radius, limit: 20, offset: currentOffset },
        });

        if (!resp.data.success) throw new Error(resp.data.error);

        if (resp.data.noLocation) {
          setNoLocation(true);
          setUsers([]);
          setTotal(0);
          return;
        }

        setNoLocation(false);
        setTotal(resp.data.total);
        setHasMore(resp.data.hasMore);
        setOffset(resp.data.nextOffset ?? 0);

        if (append) {
          setUsers(prev => [...prev, ...resp.data.users]);
        } else {
          setUsers(resp.data.users);
        }
      } catch (err) {
        console.error('[NearbyScreen] Fetch error:', err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchNearby(selectedRadius, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Radius chip change with debounce ──
  const handleRadiusChange = useCallback(
    radius => {
      setSelectedRadius(radius);
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        fetchNearby(radius, 0, false);
      }, 300);
    },
    [fetchNearby],
  );

  // ── End card actions ──
  const handleExpand = useCallback(
    newRadius => {
      setSelectedRadius(newRadius);
      fetchNearby(newRadius, 0, false);
    },
    [fetchNearby],
  );

  const handleRefresh = useCallback(() => {
    fetchNearby(selectedRadius, 0, false);
  }, [fetchNearby, selectedRadius]);

  // ── Load more on scroll end ──
  const handleScrollEnd = useCallback(
    e => {
      const idx = Math.round(
        e.nativeEvent.contentOffset.x / (_cardWidth + _spacing),
      );
      if (idx >= users.length - 3 && hasMore && !loadingMore) {
        fetchNearby(selectedRadius, offset, true);
      }
    },
    [users.length, hasMore, loadingMore, fetchNearby, selectedRadius, offset],
  );

  const onScroll = useAnimatedScrollHandler(e => {
    scrollX.value = e.contentOffset.x / (_cardWidth + _spacing);
  });

  // ── Append end card when no more profiles ──
  const listData = useMemo(() => {
    if (!hasMore && users.length > 0) {
      return [...users, { _isEndCard: true, userId: '__end__' }];
    }
    return users;
  }, [users, hasMore]);

  const lastUserImage =
    users.length > 0 ? users[users.length - 1]?.image : null;

  // ── Radius chips ──
  const RadiusChips = useMemo(
    () => (
      <View style={styles.chipsRow}>
        {RADIUS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              selectedRadius === opt.value && styles.chipActive,
            ]}
            onPress={() => handleRadiusChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                selectedRadius === opt.value && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
    [selectedRadius, handleRadiusChange],
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Backdrop */}
      <View style={StyleSheet.absoluteFillObject}>
        {users.map((u, i) =>
          u.image ? (
            <BackdropPhoto
              key={u.userId}
              uri={u.image}
              index={i}
              scrollX={scrollX}
            />
          ) : null,
        )}
      </View>
      <View style={[StyleSheet.absoluteFillObject, styles.dimOverlay]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Nearby</Text>
          <Text style={styles.headerSub}>
            {loading
              ? 'Looking around...'
              : noLocation
              ? 'Location not available'
              : `${total} ${
                  total === 1 ? 'person' : 'people'
                } within ${selectedRadius} km`}
          </Text>
        </View>
      </View>

      {/* Radius Chips */}
      {RadiusChips}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF0059" />
          <Text style={styles.loadingText}>Scanning nearby...</Text>
        </View>
      ) : noLocation || users.length === 0 ? (
        <EmptyState
          noLocation={noLocation}
          radius={selectedRadius}
          onEnableLocation={() => navigation.goBack()}
        />
      ) : (
        <View style={styles.carouselContainer}>
          <Animated.FlatList
            data={listData}
            horizontal
            keyExtractor={item => item.userId}
            showsHorizontalScrollIndicator={false}
            snapToInterval={_cardWidth + _spacing}
            decelerationRate="fast"
            overScrollMode="never"
            bounces={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              gap: _spacing,
              paddingHorizontal: (SCREEN_WIDTH - _cardWidth) / 2,
              alignItems: 'center',
            }}
            renderItem={({ item, index }) => {
              if (item._isEndCard) {
                return (
                  <EndCard
                    index={index}
                    scrollX={scrollX}
                    lastImage={lastUserImage}
                    currentRadius={selectedRadius}
                    onExpand={handleExpand}
                    onRefresh={handleRefresh}
                  />
                );
              }
              return (
                <TouchableOpacity
                  ref={ref => {
                    item._ref = ref;
                  }}
                  activeOpacity={0.95}
                  onPress={() => {
                    item._ref?.measure((x, y, width, height, pageX, pageY) => {
                      navigation.navigate('UserProfile', {
                        targetUserId: item.userId,
                        imageUrl: item.image,
                        targetLat: item.lat ?? null,
                        targetLng: item.lng ?? null,
                        targetHometown: item.hometown ?? null,
                        originX: pageX,
                        originY: pageY,
                        originWidth: width,
                        originHeight: height,
                      });
                    });
                  }}
                >
                  <ProfileCard item={item} index={index} scrollX={scrollX} />
                </TouchableOpacity>
              );
            }}
            onScroll={onScroll}
            scrollEventThrottle={1}
            onMomentumScrollEnd={handleScrollEnd}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews
          />
        </View>
      )}

      {!loading && !noLocation && users.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Swipe to explore · tap to view profile
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  dimOverlay: { backgroundColor: 'rgba(0,0,0,0.55)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: '#fff', marginTop: -1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipActive: { backgroundColor: '#FF0059', borderColor: '#FF0059' },
  chipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  chipTextActive: { color: '#fff' },

  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    width: _cardWidth,
    height: _cardHeight,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 22,
  },
  distanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 0, 89, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  distanceBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  cardName: { fontSize: 26, fontWeight: '700', color: '#fff' },
  cardAge: { fontSize: 20, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cardHometown: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  cardGoals: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
  },

  // ── End Card ──
  endCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  endCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  endCardEmoji: { fontSize: 52, marginBottom: 16 },
  endCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  endCardSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  endCardButtons: { width: '100%', gap: 12 },

  // Primary — same style as chipActive
  endCardBtnPrimary: {
    backgroundColor: '#FF0059',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF0059',
  },
  endCardBtnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Secondary — same style as inactive chip
  endCardBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  endCardBtnSecondaryText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  enableBtn: {
    backgroundColor: '#FF0059',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  enableBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  footer: { paddingVertical: 12, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
});
