/**
 * HomeScreen — Infinite Swipe + Static Layout
 *
 * Key changes:
 * - Header + action buttons ALWAYS visible — no early return for empty/loading
 * - Scan overlay shown from very first load until cards appear
 * - handleEmpty → auto-refetchFeed (infinite) instead of setIsEmpty
 * - "Seen all" shown as in-stack overlay card, not full screen takeover
 * - If DB also empty → "You've seen everyone" + auto-retry every 30s
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolateColor,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';

import FilterSvg from '../assets/SVG/filter';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import Config from 'react-native-config';

import { SwipeableStack } from '../src/components/swipe/SwipeableStackEnhanced';
import { useSwipeStack } from '../src/hooks/useSwipeStackHook';
import { MatchModal } from '../src/components/swipe/MatchModal';
import { AuthContext } from '../AuthContex';
import { useMyLocation, useLocationPermission } from '../LocationContext';
import { useSubscription, useRewind } from '../src/hooks/usePremiumHooks';
import { useDailyFeed } from '../src/hooks/useDailyFeedHook';
import { formatLastActive } from '../src/hooks/useOnlineStatus';
import { getLocationDisplay } from '../utils/locationUtils';
import FeedFilterModal from '../src/components/feed/FeedFilterModal';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { useFocusEffect } from '@react-navigation/native';

const PremiumModal = React.lazy(() =>
  import('../src/components/PremiumModal').then(m => ({
    default: m.PremiumModal,
  })),
);
const DailyLimitModal = React.lazy(() =>
  import('../src/components/PremiumModal').then(m => ({
    default: m.DailyLimitModal,
  })),
);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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

const DEFAULT_FILTERS = {
  ageMin: 18,
  ageMax: 50,
  distance: 100,
  expandSearch: true,
  showMe: null,
  goals: [],
  verifiedOnly: false,
  selectedCity: null,
  customLat: null,
  customLng: null,
};

// ════════════════════════════════════════════════════════════════════════════
// DAILY BADGE (from your current version — unchanged)
// ════════════════════════════════════════════════════════════════════════════

const DailyBadge = ({ count }) => {
  const [phase, setPhase] = useState('heart');
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!count) return;
    setPhase('heart');
    scale.value = 0.6;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.ease),
    });

    const holdTimer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.7, { duration: 150 });
    }, 800);

    const switchTimer = setTimeout(() => {
      setPhase('count');
      scale.value = 0.7;
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.ease),
      });
    }, 1000);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(switchTimer);
    };
  }, [count]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!count) return null;
  return (
    <View style={styles.dailyBadgeSlot}>
      <Animated.View style={animStyle}>
        {phase === 'heart' ? (
          <Image
            source={require('../assets/Images/redheart.png')}
            style={styles.heartImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.countBubble}>
            <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// NEARBY BADGE (from your current version — unchanged)
// ════════════════════════════════════════════════════════════════════════════

const NearbyBadge = ({ count }) => {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!count || hasAnimated.current) return;
    hasAnimated.current = true;
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 140 });
      scale.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.ease),
      });
    }, 250);
  }, [count]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!count) return null;
  const label = count >= 20 ? '20+' : String(count);
  return (
    <Animated.View style={[styles.nearbyBadge, animStyle]}>
      <Text style={styles.nearbyBadgeText}>{label}</Text>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SCAN LOADING OVERLAY — shown over stack area
// ════════════════════════════════════════════════════════════════════════════

const ScanLoadingOverlay = ({ visible }) => {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: 400,
      easing: Easing.inOut(Easing.ease),
    });
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value > 0.1 ? 'auto' : 'none',
  }));

  return (
    <Animated.View style={[styles.scanOverlayContainer, animStyle]}>
      <View style={styles.scanAnimationWrapper}>
        <LottieView
          source={require('../assets/animations/Scan.json')}
          autoPlay
          loop
          style={styles.scanAnimation}
        />
      </View>
      <Text style={styles.scanText}>Scanning nearby users...</Text>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SEEN ALL CARD — shown inside stack area when DB also empty
// ════════════════════════════════════════════════════════════════════════════

const SeenAllCard = ({ onRefresh, isRetrying }) => (
  <View style={styles.seenAllCard}>
    <Text style={styles.seenAllEmoji}>🎉</Text>
    <Text style={styles.seenAllTitle}>You've seen everyone!</Text>
    <Text style={styles.seenAllSub}>
      No new profiles right now.{'\n'}Check back soon!
    </Text>
    <TouchableOpacity
      style={[styles.seenAllBtn, isRetrying && styles.seenAllBtnDisabled]}
      onPress={onRefresh}
      disabled={isRetrying}
      activeOpacity={0.8}
    >
      <Text style={styles.seenAllBtnText}>
        {isRetrying ? 'Refreshing...' : '↺  Refresh'}
      </Text>
    </TouchableOpacity>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// EXPAND BANNER
// ════════════════════════════════════════════════════════════════════════════

const ExpandBanner = ({ expandedTo, originalDistance, onDismiss }) => {
  if (!expandedTo) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(350).springify()}
      exiting={FadeOutUp.duration(250)}
      style={styles.expandBanner}
    >
      <Text style={styles.expandBannerIcon}>📍</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.expandBannerText}>
          Expanded to{' '}
          <Text style={styles.expandBannerBold}>{expandedTo}km</Text>
        </Text>
        <Text style={styles.expandBannerSub}>
          Not enough profiles within {originalDistance}km
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.expandBannerClose}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CARD
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = React.memo(({ user, cardFadeInOpacity }) => {
  const myLocation = useMyLocation();
  const [imageError, setImageError] = useState(false);
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardFadeInOpacity.value,
  }));
  const locationDisplay = useMemo(
    () => getLocationDisplay(myLocation, user),
    [myLocation, user],
  );

  if (!user) return null;
  const imageUrl = user.image || user.imageUrls?.[0];
  const lastActiveText = user.isOnline
    ? 'Online'
    : formatLastActive(user.lastActiveAt, 3);

  return (
    <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
      {imageUrl && !imageError ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.cardImage, styles.imageFallback]}>
          <Text style={styles.fallbackText}>📷</Text>
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />
      <View style={styles.profileInfo}>
        <View style={styles.nameAgeContainer}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.age}>{user.age}</Text>
          {lastActiveText && (
            <View
              style={[
                styles.onlinePill,
                {
                  backgroundColor: user.isOnline
                    ? '#22C55E'
                    : 'rgba(255,255,255,0.25)',
                },
              ]}
            >
              <Text style={styles.onlinePillText}>{lastActiveText}</Text>
            </View>
          )}
        </View>
        {locationDisplay && (
          <Text style={styles.hometown}>{locationDisplay}</Text>
        )}
        <Text style={styles.goals} numberOfLines={2} ellipsizeMode="tail">
          {user.goals || 'No goals set'}
        </Text>
      </View>
    </Animated.View>
  );
});

const NoFilterResults = ({ onClearFilters }) => (
  <View style={styles.seenAllCard}>
    <LottieView
      source={require('../assets/animations/hearts.json')}
      autoPlay
      loop
      style={styles.emptyLottie}
      resizeMode="contain"
    />
    <Text style={styles.seenAllTitle}>No profiles found</Text>
    <Text style={styles.seenAllSub}>
      No one matches your current filters.{'\n'}Try adjusting them!
    </Text>
    <TouchableOpacity
      style={styles.seenAllBtn}
      onPress={onClearFilters}
      activeOpacity={0.8}
    >
      <Text style={styles.seenAllBtnText}>Clear Filters</Text>
    </TouchableOpacity>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// OVERLAYS
// ════════════════════════════════════════════════════════════════════════════

const LikeOverlay = () => (
  <View style={[styles.overlay, styles.likeOverlay]}>
    <View style={styles.scanAnimationWrapper}>
      <LottieView
        source={require('../assets/animations/like.json')}
        autoPlay
        loop
        style={styles.scanAnimation}
      />
    </View>
  </View>
);
const PassOverlay = () => (
  <View style={[styles.overlay, styles.passOverlay]}>
    <View style={styles.crossWrapper}>
      <LottieView
        source={require('../assets/animations/cross.json')}
        autoPlay
        loop
        style={styles.scanAnimation}
      />
    </View>
  </View>
);
const SuperlikeOverlay = () => (
  <View style={styles.superWrapper}>
    <LottieView
      source={require('../assets/animations/Star.json')}
      autoPlay
      loop
      style={styles.scanAnimation}
    />
    <Text
      style={[
        styles.superText,
        { color: '#FFF', top: '-8%', left: 0, right: -1 },
      ]}
    >
      SUPERLIKE
    </Text>
    <Text style={styles.superText}>SUPERLIKE</Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// ANIMATED ACTION BUTTON
// ════════════════════════════════════════════════════════════════════════════

const AnimatedActionButton = ({
  iconSource,
  onPress,
  size = 'medium',
  disabled = false,
  swipeProgressX,
  swipeProgressY,
  direction = 'center',
}) => {
  const iconSize = size === 'small' ? 40 : 46;
  const buttonSize = size === 'small' ? 56 : 68;
  const isLeft = direction === 'left';
  const isRight = direction === 'right';
  const isUp = direction === 'up';
  const activeColor = isLeft
    ? '#21f3dbc9'
    : isRight
    ? '#ff8fab'
    : isUp
    ? '#27a9ff'
    : '#FFF';
  const colorThreshold =
    isLeft || isRight ? SCREEN_WIDTH * 0.15 : SCREEN_HEIGHT * 0.12;
  const isSvg =
    typeof iconSource === 'function' ||
    (typeof iconSource === 'object' && iconSource?.displayName);
  const IconComponent = isSvg ? iconSource : null;

  const animatedStyle = useAnimatedStyle(() => {
    let progress = 0;
    if (isLeft)
      progress =
        swipeProgressX.value < 0
          ? Math.min(1, Math.abs(swipeProgressX.value) / colorThreshold)
          : 0;
    if (isRight)
      progress =
        swipeProgressX.value > 0
          ? Math.min(1, swipeProgressX.value / colorThreshold)
          : 0;
    if (isUp)
      progress =
        swipeProgressY.value < 0
          ? Math.min(1, Math.abs(swipeProgressY.value) / colorThreshold)
          : 0;

    return {
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        isRight
          ? ['#ffffff', '#ff0059']
          : isLeft
          ? ['#ffffff', '#3e2f43']
          : isUp
          ? ['#ffffff', '#60a5fa']
          : ['#ffffff', '#ffffff'],
      ),
    };
  });

  return (
    <TouchableOpacity
      style={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Animated.View
        style={[
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
          },
          animatedStyle,
        ]}
      >
        {isSvg ? (
          <IconComponent width={iconSize} height={iconSize} />
        ) : (
          <Image
            source={iconSource}
            style={{ width: iconSize, height: iconSize }}
            resizeMode="contain"
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FILTER ICON
// ════════════════════════════════════════════════════════════════════════════

const FilterIcon = ({ hasActiveFilters }) => (
  <View style={styles.filterIconWrapper}>
    <FilterSvg
      width={20}
      height={20}
      fill={hasActiveFilters ? '#ff0059' : '#8a8a8a'}
    />
    {hasActiveFilters && <View style={styles.filterActiveDot} />}
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function HomeScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const apiClient = useRef(createApiClient(token));
  const requestLocationPermission = useLocationPermission();

  const [myImage, setMyImage] = useState(null);
  const { subscription } = useSubscription({ token });
  const { rewind } = useRewind({ token });

  const stackRef = useRef(null);
  const currentCardIndex = useRef(0);
  const stackContainerRef = useRef(null);
  const autoRetryTimer = useRef(null); // for 30s auto-retry

  const [seenAll, setSeenAll] = useState(false); // DB bhi khaali
  const [isRetrying, setIsRetrying] = useState(false);
  const [matchedUsers, setMatchedUsers] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('SUPERLIKE');
  const [filterVisible, setFilterVisible] = useState(false);
  const [currentCity, setCurrentCity] = useState('');
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [localError, setLocalError] = useState(null);

  const { unseenCount } = useDailyFeed({ token });

  const cardFadeInOpacity = useSharedValue(0);
  const swipeProgressX = useSharedValue(0);
  const swipeProgressY = useSharedValue(0);

  const swipeStack = useSwipeStack({
    token,
    filters: DEFAULT_FILTERS,
    limit: 20,
  });
  const [stackKey, setStackKey] = useState(0);

  // ── Is loading overlay visible? ──
  // Show when: initial loading OR feed is empty but still loading (auto-refetch in progress)
  const showScanOverlay = swipeStack.loading || swipeStack.isInitialLoading;

  // ── Fade cards in when first batch arrives ──
  useEffect(() => {
    if (!swipeStack.isInitialLoading && swipeStack.feed.length > 0) {
      cardFadeInOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [swipeStack.isInitialLoading, swipeStack.feed.length]);
  useEffect(() => {
    if (!token) return;
    apiClient.current
      .get('/user-profile')
      .then(resp => {
        if (resp.data.success)
          setMyImage(resp.data.user?.imageUrls?.[0] || null);
      })
      .catch(() => {});
  }, [token]);

  const renderCard = useCallback(
    item => <ProfileCard user={item} cardFadeInOpacity={cardFadeInOpacity} />,
    [cardFadeInOpacity],
  );

  // ── Location ──
  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => requestLocationPermission(), 1500);
    return () => clearTimeout(t);
  }, [token]);

  // ── Saved filters ──
  useEffect(() => {
    if (!token) return;
    apiClient.current
      .get('/filter-preferences')
      .then(resp => {
        if (resp.data.success) {
          const saved = resp.data.filters;
          setActiveFilters(saved);
          setCurrentCity(resp.data.city || '');
          // ✅ Sirf tab updateFilters karo jab DEFAULT se alag ho
          const isDifferent =
            JSON.stringify(saved) !== JSON.stringify(DEFAULT_FILTERS);
          if (isDifferent) swipeStack.updateFilters(saved);
        }
      })
      .catch(() => {});
  }, [token]);

  // ── Nearby count ──
  useEffect(() => {
    if (!token) return;
    apiClient.current
      .get('/nearby', { params: { radius: 25, limit: 20 } })
      .then(resp => {
        if (resp.data.success)
          setNearbyCount(Math.min(resp.data.total || 0, 20));
      })
      .catch(() => {});
  }, [token]);

  // ── Prefetch ──
  useEffect(() => {
    if (!swipeStack.feed?.length) return;
    swipeStack.feed
      .slice(0, 10)
      .map(p => p.image || p.imageUrls?.[0])
      .filter(Boolean)
      .forEach(url => Image.prefetch(url));
  }, [swipeStack.feed]);

  // ── Cleanup auto-retry on unmount ──
  useEffect(() => {
    return () => {
      if (autoRetryTimer.current) clearTimeout(autoRetryTimer.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      changeNavigationBarColor('#fef3fe', true);
    }
  }, []);
  // ════════════════════════════════════════════════════════════════════════
  // handleEmpty — INFINITE AUTO-REFRESH
  // Called by SwipeableStack when all cards swiped
  // ════════════════════════════════════════════════════════════════════════

  const handleEmpty = useCallback(async () => {
    setSeenAll(false);
    cardFadeInOpacity.value = 0;

    const result = await swipeStack.refetchFeed();

    if (!result?.success || result?.count === 0) {
      setSeenAll(true);
      autoRetryTimer.current = setTimeout(async () => {
        setIsRetrying(true);
        const retryResult = await swipeStack.refetchFeed();
        setIsRetrying(false);
        if (retryResult?.count > 0) {
          setSeenAll(false);
          setStackKey(k => k + 1); // ✅ force SwipeableStack remount
        }
      }, 30000);
    } else {
      // ✅ New cards aaye — stack ko reset karo
      setStackKey(k => k + 1);
    }
  }, [swipeStack, cardFadeInOpacity]);

  // ── Manual refresh from SeenAllCard ──
  const handleManualRefresh = useCallback(async () => {
    if (autoRetryTimer.current) clearTimeout(autoRetryTimer.current);
    setIsRetrying(true);
    cardFadeInOpacity.value = 0;
    const result = await swipeStack.refetchFeed();
    setIsRetrying(false);
    if (result?.count > 0) {
      setSeenAll(false);
    }
  }, [swipeStack, cardFadeInOpacity]);

  const handleFilterApply = useCallback(
    filters => {
      setActiveFilters(filters);
      setSeenAll(false);
      cardFadeInOpacity.value = 0;
      swipeStack.updateFilters(filters);

      // ✅ null values strip karo before sending to backend
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== null),
      );
      apiClient.current
        .patch('/filter-preferences', cleanFilters)
        .catch(console.error);
    },
    [swipeStack, cardFadeInOpacity],
  );

  const handleSuperlikePress = useCallback(() => {
    if (!subscription?.isPremium) {
      setPremiumFeature('SUPERLIKE');
      setShowPremiumModal(true);
      return;
    }
    if (
      !subscription?.usage?.superlikes?.remaining ||
      subscription.usage.superlikes.remaining <= 0
    ) {
      setPremiumFeature('SUPERLIKE');
      setShowLimitModal(true);
      return;
    }
    stackRef.current?.swipeUp();
  }, [subscription]);

  const handleRewindPress = useCallback(async () => {
    if (!subscription?.isPremium) {
      setPremiumFeature('REWIND');
      setShowPremiumModal(true);
      return;
    }
    if (
      !subscription?.usage?.rewinds?.remaining ||
      subscription.usage.rewinds.remaining <= 0
    ) {
      setPremiumFeature('REWIND');
      setShowLimitModal(true);
      return;
    }
    stackRef.current?.undo();
    const result = await rewind();
    if (!result.success) setLocalError(result.error || 'Failed to rewind');
  }, [subscription, rewind]);

  const handleSwipeComplete = useCallback(
    async (direction, user, index) => {
      if (!user || matchedUsers) return;
      const type = { left: 'pass', right: 'like', up: 'superlike' }[direction];
      if (!type) return;
      currentCardIndex.current = index + 1;
      swipeProgressX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      swipeProgressY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      try {
        const result = await swipeStack.handleSwipe(user.userId, type);
        if (!result?.success) {
          setLocalError(result?.error || 'Failed to process swipe');
          return;
        }
        if (result.match)
          setMatchedUsers({
            user1: { name: 'You', age: '', image: myImage },
            user2: { name: user.name, age: user.age, image: user.image },
          });
      } catch (err) {
        setLocalError(err.message || 'Unknown error');
      }
    },
    [swipeStack, matchedUsers, swipeProgressX, swipeProgressY],
  );

  const handleKeepSwiping = useCallback(() => setMatchedUsers(null), []);
  const handleLetsChat = useCallback(() => {
    setMatchedUsers(null);
    navigation.navigate('Chat', {
      matchId: null,
      userName: matchedUsers?.user2?.name || 'Match',
    });
  }, [matchedUsers, navigation]);
  const handleNearbyPress = useCallback(() => {
    setNearbyCount(0);
    navigation.navigate('Nearby');
  }, [navigation]);
  const handleDailyPress = useCallback(
    () => navigation.navigate('Daily'),
    [navigation],
  );

  const hasActiveFilters = !!(
    activeFilters.ageMin !== 18 ||
    activeFilters.ageMax !== 50 ||
    activeFilters.distance !== 100 ||
    activeFilters.goals?.length > 0 ||
    activeFilters.verifiedOnly ||
    activeFilters.selectedCity
  );

  const isModalVisible = matchedUsers !== null;
  const feedCount = swipeStack.feed?.length || 0;

  // ── Should show stack or seenAll? ──
  const showStack = !seenAll && (feedCount > 0 || swipeStack.loading);
  const showSeenAll = seenAll && !swipeStack.loading;
  const showNoFilterResults =
    !swipeStack.loading &&
    !swipeStack.isInitialLoading &&
    swipeStack.feed.length === 0 &&
    !seenAll &&
    hasActiveFilters;

  // ════════════════════════════════════════════════════════════════════════
  // RENDER — header + buttons ALWAYS visible, no early returns
  // ════════════════════════════════════════════════════════════════════════
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBackgroundColor('#fef3fe');
      StatusBar.setBarStyle('dark-content');
    }, []),
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={styles.container}>
        {/* ── HEADER — always visible ── */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {/* Left: Hearts + Title */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <Text style={styles.headerTitle}>Flames</Text>
              <LottieView
                source={require('../assets/animations/hearts.json')}
                autoPlay
                loop
                style={{
                  width: 80, // smaller size like a badge
                  height: 80,
                  position: 'absolute', // absolute to overlap
                  right: -45, // tweak to sit very close to text end
                  top: -25, // adjust vertical alignment if needed
                }}
                resizeMode="contain"
              />
            </View>

            {/* Right: Tabs + Filter */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 30 }}
            >
              <View style={styles.tabRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.tabBtn,
                    {
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={handleNearbyPress}
                >
                  <Text style={styles.tabBtnText}>Nearby</Text>
                  <NearbyBadge count={nearbyCount} />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.dailyTabBtn,
                    {
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={handleDailyPress}
                >
                  <Text style={styles.dailyTabText}>Daily New</Text>
                  <DailyBadge count={unseenCount} />
                </Pressable>
              </View>

              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setFilterVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FilterIcon hasActiveFilters={hasActiveFilters} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginLeft: 6 }}>
            <Text style={styles.headerSubtitle}>
              {swipeStack.loading
                ? 'Finding profiles...'
                : seenAll
                ? "You're all caught up!"
                : `${feedCount} profile${feedCount !== 1 ? 's' : ''} available`}
            </Text>
          </View>
        </View>

        {/* Expand banner */}
        <ExpandBanner
          expandedTo={swipeStack.expandedTo}
          originalDistance={swipeStack.originalDistance}
          onDismiss={swipeStack.dismissExpand}
        />

        {/* ── STACK AREA — always rendered ── */}
        <View
          ref={stackContainerRef}
          style={[styles.stackArea, isModalVisible && { opacity: 0.5 }]}
        >
          {/* SwipeableStack — only when we have cards */}
          {showStack && (
            <SwipeableStack
              key={stackKey}
              stackSize={5}
              ref={stackRef}
              data={swipeStack.feed}
              keyExtractor={item => item.userId}
              renderCard={renderCard}
              onSwipeRight={(item, idx) =>
                handleSwipeComplete('right', item, idx)
              }
              onSwipeLeft={(item, idx) =>
                handleSwipeComplete('left', item, idx)
              }
              onSwipeUp={(item, idx) => handleSwipeComplete('up', item, idx)}
              onEmpty={handleEmpty}
              swipeThreshold={SCREEN_WIDTH * 0.25}
              velocityThreshold={800}
              maxRotation={15}
              renderLeftOverlay={() => <PassOverlay />}
              renderRightOverlay={() => <LikeOverlay />}
              renderSuperlikeOverlay={() => <SuperlikeOverlay />}
              containerStyle={styles.stackContainer}
              disabled={isModalVisible}
              swipeProgressX={swipeProgressX}
              swipeProgressY={swipeProgressY}
              onCardPress={item => {
                axios
                  .post(
                    `${API_BASE_URL}/get-user-by-id`,
                    { userId: item.userId },
                    { headers: { Authorization: `Bearer ${token}` } },
                  )
                  .catch(() => {});
                stackContainerRef.current?.measure(
                  (x, y, width, height, pageX, pageY) => {
                    navigation.navigate('UserProfile', {
                      targetUserId: item.userId,
                      imageUrl: item.image || item.imageUrls?.[0],
                      targetLat: item.lat ?? null,
                      targetLng: item.lng ?? null,
                      targetHometown: item.hometown ?? null,
                      originX: pageX,
                      originY: pageY,
                      originWidth: width,
                      originHeight: height,
                    });
                  },
                );
              }}
            />
          )}

          {/* ✅ SeenAll card — inside stack area, not full screen */}
          {showSeenAll && (
            <SeenAllCard
              onRefresh={handleManualRefresh}
              isRetrying={isRetrying}
            />
          )}
          {showNoFilterResults && (
            <NoFilterResults
              onClearFilters={() => handleFilterApply(DEFAULT_FILTERS)}
            />
          )}

          {/* ✅ Scan overlay — shown from start until cards arrive */}
          <ScanLoadingOverlay visible={showScanOverlay} />
        </View>

        {/* ── ACTION BUTTONS — always visible ── */}
        <View
          style={[styles.buttonsContainer, isModalVisible && { opacity: 0.5 }]}
        >
          <AnimatedActionButton
            iconSource={require('../assets/Images/rewind.png')}
            onPress={handleRewindPress}
            size="small"
            disabled={isModalVisible || seenAll || swipeStack.loading}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="center"
          />
          <AnimatedActionButton
            iconSource={require('../assets/Images/cross.png')}
            onPress={() => stackRef.current?.swipeLeft()}
            size="medium"
            disabled={isModalVisible || seenAll || swipeStack.loading}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="left"
          />
          <AnimatedActionButton
            iconSource={require('../assets/Images/circle.png')}
            onPress={() => stackRef.current?.swipeRight()}
            size="medium"
            disabled={isModalVisible || seenAll || swipeStack.loading}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="right"
          />
          <AnimatedActionButton
            iconSource={require('../assets/Images/star.png')}
            onPress={handleSuperlikePress}
            size="small"
            disabled={isModalVisible || seenAll || swipeStack.loading}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="up"
          />
        </View>

        {/* Error toast */}
        {localError && (
          <View style={styles.errorToast}>
            <Text style={styles.errorToastText}>{localError}</Text>
            <TouchableOpacity onPress={() => setLocalError(null)}>
              <Text style={styles.errorToastClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <MatchModal
          visible={isModalVisible}
          user1={matchedUsers?.user1}
          user2={matchedUsers?.user2}
          onKeepSwiping={handleKeepSwiping}
          onLetsChat={handleLetsChat}
        />

        <Suspense fallback={<View />}>
          <PremiumModal
            visible={showPremiumModal}
            onClose={() => setShowPremiumModal(false)}
            feature={premiumFeature}
            onSelectPlan={() => setShowPremiumModal(false)}
          />
          <DailyLimitModal
            visible={showLimitModal}
            onClose={() => setShowLimitModal(false)}
            feature={premiumFeature}
            resetTime="00:00"
          />
        </Suspense>

        <FeedFilterModal
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          onApply={handleFilterApply}
          initialFilters={activeFilters}
          currentCity={currentCity}
        />
      </View>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 12,
    backgroundColor: '#fef3fe',
    marginLeft: 5,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 31,
    fontFamily: 'LobsterTwo-Bold',
    color: '#ff0059',
    marginTop: 2,
    letterSpacing: 3,
  },
  headerSubtitle: { fontSize: 9, color: '#64748b96' },

  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 7,
  },

  // Nearby tab
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 17,
    paddingVertical: 6,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'pink',
    backgroundColor: '#ffffff',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff0059',
    letterSpacing: 1,
  },
  nearbyBadge: {
    position: 'absolute',
    top: -5,
    right: -6,
    backgroundColor: '#FF3040',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  nearbyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Daily tab
  dailyTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 6,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'pink',
    backgroundColor: '#ffffff',
    gap: 5,
    position: 'relative',
  },
  dailyTabText: {
    fontSize: 12,
    color: '#FF0059',
    fontWeight: '600',
    letterSpacing: 1,
  },
  dailyBadgeSlot: { position: 'absolute', top: -4, right: -6 },
  heartImage: { width: 18, height: 18 },
  countBubble: {
    backgroundColor: '#FF3040',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  countText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Filter
  filterBtn: {
    marginTop: 6,
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterIconWrapper: {
    width: 20,
    gap: 4,
    justifyContent: 'center',
    position: 'relative',
  },

  filterActiveDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF0059',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },

  // Expand banner
  expandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 10,
  },
  expandBannerIcon: { fontSize: 16 },
  expandBannerText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
  expandBannerBold: { fontWeight: '800', color: '#C2410C' },
  expandBannerSub: { fontSize: 11, color: '#B45309', marginTop: 1 },
  expandBannerClose: {
    fontSize: 14,
    color: '#B45309',
    fontWeight: '700',
    paddingLeft: 4,
  },

  // ── Stack area — flex: 1, contains stack + overlays ──
  stackArea: {
    flex: 1,
    position: 'relative',
  },

  // ── SwipeableStack container ──
  stackContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 80,
    backgroundColor: '#fef3fe',
  },

  // ── Scan overlay — absolute over stack area ──
  scanOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: '#fef3fe',
  },
  scanAnimationWrapper: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAnimation: { width: '100%', height: '100%' },
  scanText: { fontSize: 14, color: '#666', opacity: 0.6, fontWeight: '500' },

  // ── Seen All card — centered in stack area ──
  seenAllCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
    backgroundColor: '#fef3fe',
  },
  seenAllEmoji: { fontSize: 64, marginBottom: 16 },
  seenAllTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  seenAllSub: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  seenAllBtn: {
    backgroundColor: '#ff0059',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  seenAllBtnDisabled: { backgroundColor: '#FFA0B4' },
  seenAllBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Overlays
  crossWrapper: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5 * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  superWrapper: {
    width: SCREEN_WIDTH - 52,
    height: (SCREEN_WIDTH - 52) * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: { borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  likeOverlay: { borderColor: '#EC4899', transform: [{ rotate: '20deg' }] },
  passOverlay: { transform: [{ rotate: '20deg' }] },
  superText: {
    position: 'absolute',
    top: '-10%',
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '900',
    color: '#0099FF',
    textTransform: 'uppercase',
    textShadowColor: '#FFF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
    paddingHorizontal: 10,
    letterSpacing: 5,
  },

  // Cards
  cardContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
  },
  profileInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 26,
    zIndex: 5,
    marginBottom: 40,
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    fontSize: 42,
    fontFamily: 'Nunito-Bold',
    color: '#ffffff',
    marginRight: 5,
    letterSpacing: 0.5,
  },
  age: {
    fontSize: 38,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
    top: -5,
    gap: 4,
  },
  onlinePillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  hometown: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  goals: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginBottom: 4,
  },
  imageFallback: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: { fontSize: 48 },
  emptyLottie: { width: 230, height: 230 },

  // ── Action buttons — always rendered at bottom ──
  buttonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    zIndex: 50,
    paddingVertical: 20,
    paddingBottom: 50,
  },

  // Error toast
  errorToast: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 999,
  },
  errorToastText: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },
  errorToastClose: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
