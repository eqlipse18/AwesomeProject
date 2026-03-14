/**
 * HomeScreen - WITH PREMIUM SYSTEM INTEGRATED
 *
 * Features:
 * - Scan animation plays until cards ready
 * - Scan fades OUT + Card fades IN simultaneously
 * - SUPERLIKE button with premium gates
 * - REWIND button with daily limits
 * - Premium modals for plan selection
 * - Daily limit warnings
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
  AppState,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { SwipeableStack } from '../src/components/swipe/SwipeableStackEnhanced';
import { useSwipeStack, useMatches } from '../src/hooks/useSwipeStackHook';
import { MatchModal } from '../src/components/swipe/MatchModal';
import { AuthContext } from '../AuthContex';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useSubscription,
  useSuperlike,
  useRewind,
} from '../src/hooks/usePremiumHooks';
import axios from 'axios';
import Config from 'react-native-config';
// import {
//   PremiumModal,
//   DailyLimitModal,
//   FeatureLockedModal,
// } from '../src/components/PremiumModal';
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
const API_BASE_URL = Config.API_BASE_URL;

// ════════════════════════════════════════════════════════════════════════════
// SCAN LOADING OVERLAY - ANIMATED
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
// PROFILE CARD - ANIMATED FADE IN
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = React.memo(({ user, cardFadeInOpacity }) => {
  const [imageError, setImageError] = useState(false);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardFadeInOpacity.value,
  }));

  if (!user) {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.noDataText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
      {user.image && !imageError ? (
        <Image
          source={{ uri: user.image }}
          style={styles.cardImage}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.cardImage, styles.imageFallback]}>
          <Text style={styles.fallbackText}>📷</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.85)']}
        style={styles.gradient}
      />

      <View style={styles.profileInfo}>
        <View style={styles.nameAgeContainer}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.age}>{user.age}</Text>
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
// ACTION BUTTON
// ════════════════════════════════════════════════════════════════════════════
const ActionButton = ({
  iconSource,

  onPress,
  size = 'medium',
  disabled = false,
  backgroundColor = '#FFF', // default bg
}) => {
  const iconSize = size === 'small' ? 40 : 46;
  const buttonSize = size === 'small' ? 56 : 68; // circular size

  return (
    <TouchableOpacity
      style={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Image
        source={iconSource}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};
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
// MAIN HOMESCREEN - WITH PREMIUM INTEGRATION
// ════════════════════════════════════════════════════════════════════════════

export default function HomeScreen({ navigation }) {
  const { token, userId } = useContext(AuthContext);
  const swipeQueue = useRef([]);
  const tokenRef = useRef(token);

  // ── Premium Hooks ──
  const { subscription, refetch: refetchSubscription } = useSubscription({
    token,
  });
  const { superlike } = useSuperlike({ token });
  const { rewind } = useRewind({ token });

  // ── Refs ──
  const stackRef = useRef(null);
  const currentCardIndex = useRef(0);

  // ── State ──
  const [isEmpty, setIsEmpty] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [matchedUsers, setMatchedUsers] = useState(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  // ── Premium Modal States ──
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('SUPERLIKE');

  // ── Animation Shared Values ──
  const scanFadeOutOpacity = useSharedValue(1);
  const cardFadeInOpacity = useSharedValue(0);

  // ── Custom Hooks ──
  const swipeStack = useSwipeStack({
    token,
    filters: { minAge: 18, maxAge: 60 },
    limit: 20,
  });

  const renderCard = useCallback(
    item => <ProfileCard user={item} cardFadeInOpacity={cardFadeInOpacity} />,
    [],
  );
  // ════════════════════════════════════════════════════════════════════════════
  // ANIMATION: SHOW SCAN AND ANIMATE TRANSITION WHEN LOADING COMPLETES
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (swipeStack.isInitialLoading && swipeStack.loading) {
      // Show scan overlay
      setShowLoadingOverlay(true);
      scanFadeOutOpacity.value = 1;
      cardFadeInOpacity.value = 0;

      console.log('[HomeScreen] Showing scan overlay...');
    } else if (
      !swipeStack.isInitialLoading &&
      showLoadingOverlay &&
      swipeStack.feed.length > 0
    ) {
      // Loading complete, animate transition
      console.log('[HomeScreen] Loading complete! Animating transition...');

      // Scan fades OUT + Card fades IN simultaneously (600ms)
      scanFadeOutOpacity.value = withTiming(0, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      });

      cardFadeInOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      });

      // Hide overlay after animation
      setTimeout(() => {
        setShowLoadingOverlay(false);
      }, 600);
    }
  }, [
    swipeStack.isInitialLoading,
    swipeStack.loading,
    swipeStack.feed.length,
    showLoadingOverlay,
  ]);

  // -->Next 5 profiles load instantly
  useEffect(() => {
    if (!swipeStack.feed || swipeStack.feed.length === 0) return;

    const preloadImages = async () => {
      const nextProfiles = swipeStack.feed.slice(0, 10);

      Promise.all(
        nextProfiles.filter(p => p.image).map(p => Image.prefetch(p.image)),
      );
    };

    preloadImages();
  }, [swipeStack.feed]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  // ── Handle SUPERLIKE Button Press ──
  const handleSuperlikePress = async () => {
    // Check if premium
    if (!subscription?.isPremium) {
      setPremiumFeature('SUPERLIKE');
      setShowPremiumModal(true);
      return;
    }

    // Check daily limit
    if (
      !subscription?.usage?.superlikes?.remaining ||
      subscription.usage.superlikes.remaining <= 0
    ) {
      setShowLimitModal(true);
      return;
    }

    // Trigger SUPERLIKE swipe animation (upward)
    if (stackRef.current) {
      stackRef.current.swipeUp();
    }
  };

  // ── Handle REWIND Button Press ──
  const handleRewindPress = async () => {
    // Check if premium
    if (!subscription?.isPremium) {
      setPremiumFeature('REWIND');
      setShowPremiumModal(true);
      return;
    }

    // Check daily limit
    if (
      !subscription?.usage?.rewinds?.remaining ||
      subscription.usage.rewinds.remaining <= 0
    ) {
      setShowLimitModal(true);
      return;
    }

    // Trigger rewind animation
    stackRef.current?.undo();

    // Call API to increment usage
    const result = await rewind();
    if (!result.success) {
      setLocalError(result.error || 'Failed to rewind');
    }
  };

  // ── Handle Swipe Complete ──
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
      console.log('[HomeScreen] Swiped:', type, 'on:', user.userId);

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
    [swipeStack, matchedUsers],
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

  const handleSelectPlan = planType => {
    setShowPremiumModal(false);
    // TODO: Navigate to payment screen
    console.log('[HomeScreen] Selected plan:', planType);
    // navigation.navigate('PaymentScreen', { plan: planType });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: INITIAL LOADING
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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: EMPTY STATE
  // ════════════════════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN SCREEN
  // ════════════════════════════════════════════════════════════════════════════

  const isModalVisible = matchedUsers !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Flames</Text>
          <Text style={styles.headerSubtitle}>
            {swipeStack.feedLength} profile
            {swipeStack.feedLength > 1 ? 's' : ''} available
          </Text>
        </View>

        {/* Swipe Stack */}
        <View style={{ flex: 1, opacity: isModalVisible ? 0.5 : 1 }}>
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
          />

          {/* Scan Animation Overlay (only while loading) */}
          {showLoadingOverlay && (
            <ScanLoadingOverlay fadeOutOpacity={scanFadeOutOpacity} />
          )}
        </View>

        {/* Action Buttons */}
        <View
          style={[styles.buttonsContainer, isModalVisible && { opacity: 0.5 }]}
        >
          <ActionButton
            iconSource={require('../assets/Images/rewind.png')}
            onPress={handleRewindPress}
            color="#666"
            size="small"
            disabled={isModalVisible}
          />
          <ActionButton
            iconSource={require('../assets/Images/cross.png')}
            onPress={() => stackRef.current?.swipeLeft()}
            color="#EF4444"
            size="medium"
            disabled={isModalVisible}
          />
          <ActionButton
            iconSource={require('../assets/Images/circle.png')}
            onPress={() => stackRef.current?.swipeRight()}
            size="medium"
            disabled={isModalVisible}
            backgroundColor="#ffffff"
          />
          <ActionButton
            iconSource={require('../assets/Images/star.png')}
            onPress={handleSuperlikePress}
            size="small" // 👈 THIS WAS MISSING
            disabled={isModalVisible}
            backgroundColor="#ffffff"
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

        {/* ══════════════════════════════════════════════════════════════════════════════════ */}
        {/* PREMIUM MODALS */}
        {/* ══════════════════════════════════════════════════════════════════════════════════ */}

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

  stackContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 125,
    backgroundColor: '#ffffff3f',
  },

  // Scan Loading Overlay
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
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
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
    top: '-10%', // bit above center
    textAlign: 'center',
    fontSize: 32, // big text
    fontWeight: '900',
    color: '#0099FF', // blue text
    textTransform: 'uppercase',
    textShadowColor: '#FFF', // white border effect
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
    paddingHorizontal: 10,
    letterSpacing: 5,
  },

  // Card
  cardContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },

  renderToHardwareTextureAndroid: true,
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

  superlikeOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 40,
    marginBottom: 4,
  },

  overlayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EC4899',
  },

  overlayLabelpass: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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

  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: '#ffffff',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonSmall: {
    width: 56,
    height: 56,
  },

  buttonMedium: {
    width: 68,
    height: 68,
  },

  actionButtonIcon: {
    fontWeight: '700',
  },

  actionButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
