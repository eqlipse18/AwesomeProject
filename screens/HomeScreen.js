/**
 * HomeScreen - WITH CONNECTED ANIMATED BUTTONS ✨ (FIXED)
 *
 * BUG FIX: Left swipe button now works correctly!
 * Features:
 * - PASS button: BLUE when swiping LEFT ✅
 * - LIKE button: GREEN when swiping RIGHT ✅
 * - SUPERLIKE button: YELLOW when swiping UP ✅
 * - Smooth fade animations connected to swipe progress
 * - Buttons fade back to WHITE when released
 */

import React, {
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect,
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
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

import { SwipeableStack } from '../src/components/swipe/SwipeableStackEnhanced';
import { useSwipeStack } from '../src/hooks/useSwipeStackHook';
import { MatchModal } from '../src/components/swipe/MatchModal';
import { AuthContext } from '../AuthContex';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useSubscription,
  useSuperlike,
  useRewind,
} from '../src/hooks/usePremiumHooks';
import axios from 'axios';
import Config from 'react-native-config';
import {
  responsiveFontSize,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import { useDailyFeed } from '../src/hooks/useDailyFeedHook';
import { formatLastActive } from '../src/hooks/useOnlineStatus';

// ── Lazy load premium modals ──
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

// ════════════════════════════════════════════════════════════════════════════
// SCAN LOADING OVERLAY
// ════════════════════════════════════════════════════════════════════════════

const ScanLoadingOverlay = ({ fadeOutOpacity }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOutOpacity.value,
  }));

  return (
    <Animated.View style={[styles.scanOverlayContainer, animatedStyle]}>
      <View style={styles.scanAnimationWrapper}>
        <LottieView
          source={require('../assets/animations/Scan.json')}
          autoPlay
          loop={true}
          style={styles.scanAnimation}
        />
      </View>

      <Text style={styles.scanText}>Scanning nearby users...</Text>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CARD
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = React.memo(({ user, cardFadeInOpacity, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardFadeInOpacity.value,
  }));

  if (!user) return null;

  const imageUrl = user.image || user.imageUrls?.[0];
  const lastActiveText = user.isOnline
    ? 'Online'
    : formatLastActive(user.lastActiveAt, 3); // ✅ cards pe 3 din tak

  // Render mein — pill hamesha dikhao agar text hai
  {
    lastActiveText && (
      <View
        style={[
          styles.onlinePill,
          {
            backgroundColor: user.isOnline
              ? 'rgba(34, 197, 94, 0.85)' // green
              : 'rgba(0, 0, 0, 0.45)', // dark grey
          },
        ]}
      >
        {/* ✅ dot + text dono */}
        <View
          style={[
            styles.onlinePillDot,
            { backgroundColor: user.isOnline ? '#fff' : '#94A3B8' },
          ]}
        />
        <Text style={styles.onlinePillText}>{lastActiveText}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        style={StyleSheet.absoluteFillObject}
      />
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
          {/* ✅ Online indicator */}
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
        <Text style={styles.hometown}>
          📍 {user.hometown || 'Location not set'}
        </Text>
        <Text style={styles.goals} numberOfLines={2} ellipsizeMode="tail">
          {user.goals || 'No goals set'}
        </Text>
      </View>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// OVERLAYS
// ════════════════════════════════════════════════════════════════════════════

const LikeOverlay = () => (
  <View style={[styles.overlay, styles.likeOverlay]}>
    <View style={styles.scanAnimationWrapper}>
      <LottieView
        source={require('../assets/animations/like.json')}
        autoPlay
        loop={true}
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
        loop={true}
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
      {'SUPERLIKE'}
    </Text>
    <Text style={styles.superText}>SUPERLIKE</Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// ANIMATED ACTION BUTTON - FIXED ✨
// ════════════════════════════════════════════════════════════════════════════

const AnimatedActionButton = ({
  iconSource,
  onPress,
  size = 'medium',
  disabled = false,
  swipeProgressX = new Animated.Value(0),
  swipeProgressY = new Animated.Value(0),
  direction = 'center',
}) => {
  const iconSize = size === 'small' ? 40 : 46;
  const buttonSize = size === 'small' ? 56 : 68;

  // ── Determine color and threshold ──
  let activeColor = '#FFF';
  let colorThreshold = 0;
  let isLeftDirection = false;
  let isRightDirection = false;
  let isUpDirection = false;

  if (direction === 'left') {
    activeColor = '#21f3dbc9'; // Blue
    colorThreshold = SCREEN_WIDTH * 0.15;
    isLeftDirection = true;
  } else if (direction === 'right') {
    activeColor = '#ff2b2bdc'; // Green
    colorThreshold = SCREEN_WIDTH * 0.15;
    isRightDirection = true;
  } else if (direction === 'up') {
    activeColor = '#27a9ff'; // Gold
    colorThreshold = SCREEN_HEIGHT * 0.12;
    isUpDirection = true;
  }

  // ── Animation with FIXED threshold logic ──
  const animatedStyle = useAnimatedStyle(() => {
    let progress = 0;

    if (isLeftDirection) {
      // ✅ FIXED: Use absolute value and check direction
      const absX = Math.abs(swipeProgressX.value);
      progress = Math.max(0, Math.min(1, absX / colorThreshold));

      // Only show if swiping LEFT (negative X)
      if (swipeProgressX.value >= 0) {
        progress = 0;
      }
    } else if (isRightDirection) {
      // Right swipe (positive X)
      progress = Math.max(
        0,
        Math.min(1, swipeProgressX.value / colorThreshold),
      );

      // Only show if swiping RIGHT (positive X)
      if (swipeProgressX.value <= 0) {
        progress = 0;
      }
    } else if (isUpDirection) {
      // ✅ FIXED: Use absolute value and check direction
      const absY = Math.abs(swipeProgressY.value);
      progress = Math.max(0, Math.min(1, absY / colorThreshold));

      // Only show if swiping UP (negative Y)
      if (swipeProgressY.value >= 0) {
        progress = 0;
      }
    }

    // Interpolate color from WHITE to activeColor
    const backgroundColor = interpolateColor(
      progress,
      [0, 1],
      ['#FFF', activeColor],
    );

    return {
      backgroundColor,
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
        <Image
          source={iconSource}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════

const EmptyState = ({ onReset, error }) => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateEmoji}>🎉</Text>
    <Text style={styles.emptyStateTitle}>{error ? 'Oops!' : 'All Done!'}</Text>
    <Text style={styles.emptyStateMessage}>
      {error
        ? 'Something went wrong. Please try again.'
        : "You've seen all available profiles. Check back later!"}
    </Text>
    {error && <Text style={styles.errorText}>{error}</Text>}
    <TouchableOpacity style={styles.emptyStateButton} onPress={onReset}>
      <Text style={styles.emptyStateButtonText}>
        {error ? 'Retry' : 'Refresh Feed'}
      </Text>
    </TouchableOpacity>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// FETCH USER PROFILE
// ════════════════════════════════════════════════════════════════════════════

const fetchUserProfile = async (userId, token) => {
  try {
    const axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });

    const response = await axiosInstance.post('/get-user-by-id', { userId });

    if (response.data.success && response.data.user) {
      const user = response.data.user;
      return {
        name: user.firstName || user.name,
        age: user.ageForSort || user.age,
        image: user.imageUrls?.[0] || user.image,
      };
    }
    return null;
  } catch (error) {
    console.error('[fetchUserProfile] Error:', error.message);
    return null;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN HOMESCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function HomeScreen({ navigation }) {
  const { token, userId } = useContext(AuthContext);

  const { subscription } = useSubscription({ token });
  const { superlike } = useSuperlike({ token });
  const { rewind } = useRewind({ token });

  const stackRef = useRef(null);
  const currentCardIndex = useRef(0);
  const stackContainerRef = useRef(null);

  const [isEmpty, setIsEmpty] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [matchedUsers, setMatchedUsers] = useState(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('SUPERLIKE');
  const { unseenCount } = useDailyFeed({ token });

  // ── Animation Shared Values ──
  const scanFadeOutOpacity = useSharedValue(1);
  const cardFadeInOpacity = useSharedValue(0);

  // ── SWIPE PROGRESS - Connected to buttons ──
  const swipeProgressX = useSharedValue(0);
  const swipeProgressY = useSharedValue(0);

  const swipeStack = useSwipeStack({
    token,
    filters: { minAge: 18, maxAge: 60 },
    limit: 20,
  });

  const renderCard = useCallback(
    item => <ProfileCard user={item} cardFadeInOpacity={cardFadeInOpacity} />,
    [cardFadeInOpacity],
  );

  // ── Scan → Card transition ──
  useEffect(() => {
    if (swipeStack.isInitialLoading && swipeStack.loading) {
      setShowLoadingOverlay(true);
      scanFadeOutOpacity.value = 1;
      cardFadeInOpacity.value = 0;

      console.log('[HomeScreen] Showing scan overlay...');
    } else if (
      !swipeStack.isInitialLoading &&
      showLoadingOverlay &&
      swipeStack.feed.length > 0
    ) {
      console.log('[HomeScreen] Loading complete! Animating transition...');

      scanFadeOutOpacity.value = withTiming(0, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      });

      cardFadeInOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      });

      setTimeout(() => {
        setShowLoadingOverlay(false);
      }, 600);
    }
  }, [
    swipeStack.isInitialLoading,
    swipeStack.loading,
    swipeStack.feed.length,
    showLoadingOverlay,
    scanFadeOutOpacity,
    cardFadeInOpacity,
  ]);

  // ── Image prefetching ──
  useEffect(() => {
    if (!swipeStack.feed || swipeStack.feed.length === 0) return;

    const preloadImages = async () => {
      const nextProfiles = swipeStack.feed.slice(0, 10);
      Promise.all(
        nextProfiles
          .map(p => p.image || p.imageUrls?.[0])
          .filter(Boolean)
          .map(url => Image.prefetch(url)),
      );
    };

    preloadImages();
  }, [swipeStack.feed]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

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
    if (!result.success) {
      setLocalError(result.error || 'Failed to rewind');
    }
  }, [subscription, rewind]);

  const handleSwipeComplete = useCallback(
    async (direction, user, index) => {
      if (!user || matchedUsers) return;

      const typeMap = {
        left: 'pass',
        right: 'like',
        up: 'superlike',
      };

      const type = typeMap[direction];
      if (!type) return;

      currentCardIndex.current = index + 1;
      console.log('[HomeScreen] Swiped:', type);

      // Reset button colors
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

        if (result.match) {
          console.log('[HomeScreen] 🔥 MATCH! 🔥');
          setMatchedUsers({
            user1: { name: 'You', age: '', image: null },
            user2: { name: user.name, age: user.age, image: user.image },
          });
        }
      } catch (err) {
        setLocalError(err.message || 'Unknown error');
        console.error('[HomeScreen] Swipe error:', err);
      }
    },
    [swipeStack, matchedUsers, swipeProgressX, swipeProgressY],
  );

  const handleEmpty = useCallback(() => {
    setIsEmpty(true);
  }, []);

  const handleReset = useCallback(async () => {
    setIsEmpty(false);
    setLocalError(null);
    currentCardIndex.current = 0;
    await swipeStack.refetchFeed();
  }, [swipeStack]);

  const handleKeepSwiping = useCallback(() => {
    setMatchedUsers(null);
  }, []);

  const handleLetsChat = useCallback(() => {
    setMatchedUsers(null);
    navigation.navigate('Chat', {
      matchId: null,
      userName: matchedUsers?.user2?.name || 'Match',
    });
  }, [matchedUsers, navigation]);

  const handleSelectPlan = useCallback(planType => {
    setShowPremiumModal(false);
    console.log('[HomeScreen] Selected plan:', planType);
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER STATES
  // ════════════════════════════════════════════════════════════════════════════

  if (swipeStack.isInitialLoading && swipeStack.loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF0059" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
        </View>
        <View style={styles.stackContainer} />
      </View>
    );
  }

  if (isEmpty || swipeStack.feed.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF0059" />
        <EmptyState
          onReset={handleReset}
          error={swipeStack.error || localError}
        />
      </View>
    );
  }

  const isModalVisible = matchedUsers !== null;
  const feedCount = swipeStack.feed?.length || 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Flames</Text>

            {/* Tab buttons */}
            <View style={styles.tabRow}>
              {/* Nearby — placeholder */}
              <TouchableOpacity style={styles.tabBtn} disabled>
                <Text style={styles.tabBtnText}>Nearby</Text>
              </TouchableOpacity>

              {/* Online — placeholder */}
              <TouchableOpacity style={styles.tabBtn} disabled>
                <Text style={styles.tabBtnText}>Online</Text>
              </TouchableOpacity>

              {/* Daily New — active */}
              <TouchableOpacity
                style={styles.dailyTabBtn}
                onPress={() => navigation.navigate('Daily')}
                activeOpacity={0.8}
              >
                <Text style={styles.dailyTabText}>Daily New</Text>
                {unseenCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifText}>
                      {unseenCount > 99 ? '99+' : unseenCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.headerSubtitle}>
            {feedCount} profile{feedCount !== 1 ? 's' : ''} available
          </Text>
        </View>

        {/* Swipe Stack */}
        <View
          ref={stackContainerRef}
          style={{ flex: 1, opacity: isModalVisible ? 0.5 : 1 }}
        >
          <SwipeableStack
            stackSize={5}
            ref={stackRef}
            data={swipeStack.feed}
            keyExtractor={item => item.userId}
            renderCard={renderCard}
            onSwipeRight={(item, index) =>
              handleSwipeComplete('right', item, index)
            }
            onSwipeLeft={(item, index) =>
              handleSwipeComplete('left', item, index)
            }
            onSwipeUp={(item, index) => handleSwipeComplete('up', item, index)}
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
              //  Axios directly — no apiClient needed
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
                    originX: pageX,
                    originY: pageY,
                    originWidth: width,
                    originHeight: height,
                  });
                },
              );
            }}
          />

          {showLoadingOverlay && (
            <ScanLoadingOverlay fadeOutOpacity={scanFadeOutOpacity} />
          )}
        </View>

        {/* ACTION BUTTONS - ANIMATED & FIXED ✨ */}
        <View
          style={[styles.buttonsContainer, isModalVisible && { opacity: 0.5 }]}
        >
          {/* Rewind Button */}
          <AnimatedActionButton
            iconSource={require('../assets/Images/rewind.png')}
            onPress={handleRewindPress}
            size="small"
            disabled={isModalVisible}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="center"
          />

          {/* PASS Button - BLUE on LEFT swipe ✅ */}
          <AnimatedActionButton
            iconSource={require('../assets/Images/cross.png')}
            onPress={() => stackRef.current?.swipeLeft()}
            size="medium"
            disabled={isModalVisible}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="left"
          />

          {/* LIKE Button - GREEN on RIGHT swipe ✅ */}
          <AnimatedActionButton
            iconSource={require('../assets/Images/circle.png')}
            onPress={() => stackRef.current?.swipeRight()}
            size="medium"
            disabled={isModalVisible}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="right"
          />

          {/* SUPERLIKE Button - YELLOW on UP swipe ✅ */}
          <AnimatedActionButton
            iconSource={require('../assets/Images/star.png')}
            onPress={handleSuperlikePress}
            size="small"
            disabled={isModalVisible}
            swipeProgressX={swipeProgressX}
            swipeProgressY={swipeProgressY}
            direction="up"
          />
        </View>

        {/* Error Toast */}
        {localError && (
          <View style={styles.errorToast}>
            <Text style={styles.errorToastText}>{localError}</Text>
            <TouchableOpacity onPress={() => setLocalError(null)}>
              <Text style={styles.errorToastClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Match Modal */}
        <MatchModal
          visible={isModalVisible}
          user1={matchedUsers?.user1}
          user2={matchedUsers?.user2}
          onKeepSwiping={handleKeepSwiping}
          onLetsChat={handleLetsChat}
        />

        {/* Premium Modals */}
        <Suspense fallback={<View />}>
          <PremiumModal
            visible={showPremiumModal}
            onClose={() => setShowPremiumModal(false)}
            feature={premiumFeature}
            onSelectPlan={handleSelectPlan}
          />

          <DailyLimitModal
            visible={showLimitModal}
            onClose={() => setShowLimitModal(false)}
            feature={premiumFeature}
            resetTime="00:00"
          />
        </Suspense>
      </View>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  onlinePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlinePillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ff0059',
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    opacity: 0.5,
  },
  tabBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  dailyTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'pink',
    backgroundColor: '#fff',
    gap: 6,
  },
  dailyTabText: {
    fontSize: 12,
    color: '#FF0059',
    fontWeight: '700',
  },
  notifBadge: {
    backgroundColor: '#FF0059',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  stackContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  scanOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },

  scanAnimationWrapper: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 1.3,
    justifyContent: 'center',
    alignItems: 'center',
  },

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

  scanAnimation: {
    width: '100%',
    height: '100%',
  },

  scanText: {
    fontSize: 14,
    color: '#666',
    opacity: 0.6,
    fontWeight: '500',
  },

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
    height: '35%',
  },

  profileInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    zIndex: 5,
  },

  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },

  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 8,
  },

  age: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  hometown: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },

  goals: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },

  imageFallback: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fallbackText: {
    fontSize: 48,
  },

  loadingCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },

  noDataText: {
    fontSize: 16,
    color: '#999',
  },

  overlay: {
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  likeOverlay: {
    borderColor: '#EC4899',
    transform: [{ rotate: '20deg' }],
  },

  passOverlay: {
    transform: [{ rotate: '20deg' }],
  },

  buttonsContainer: {
    position: 'absolute',
    bottom: 40,
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

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyStateMessage: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },

  emptyStateButton: {
    backgroundColor: '#FF0059',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },

  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

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

  errorToastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  errorToastClose: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
});

//  boost will be paid feature for premium user for whom 5 boost will be provided  to ther user who have purchased flame plus and 10 boost for user who have
