/**
 * HomeScreen - ULTIMATE SMOOTH VERSION
 *
 * Features:
 * - Scan animation plays until cards ready
 * - Scan fades OUT + Card fades IN simultaneously
 * - Smooth connected transition
 * - NOT time-dependent, dependent on actual loading
 */

import React, {
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
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
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_BASE_URL = 'http://192.168.100.154:9000';

// ════════════════════════════════════════════════════════════════════════════
// SCAN LOADING OVERLAY - ANIMATED
// ════════════════════════════════════════════════════════════════════════════

const ScanLoadingOverlay = ({ fadeOutOpacity }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOutOpacity.value,
  }));

  return (
    <Animated.View style={[styles.scanOverlayContainer, animatedStyle]}>
      {/* Scan animation */}
      <View style={styles.scanAnimationWrapper}>
        <LottieView
          source={require('../assets/animations/Scan.json')}
          autoPlay
          loop={true}
          style={styles.scanAnimation}
        />
      </View>

      {/* Mild text below */}
      <Text style={styles.scanText}>Scanning nearby users...</Text>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILE CARD - ANIMATED FADE IN
// ════════════════════════════════════════════════════════════════════════════

const ProfileCard = ({ user, cardFadeInOpacity }) => {
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

      <View style={styles.cardShadow} />
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// CUSTOM CARD RENDERER WITH ANIMATION PROPS
// ════════════════════════════════════════════════════════════════════════════

const AnimatedCardRenderer = ({
  item,
  index,
  cardFadeInOpacity,
  isFirstCard,
}) => {
  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }}>
      <ProfileCard
        user={item}
        cardFadeInOpacity={isFirstCard ? cardFadeInOpacity : undefined}
      />
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// OVERLAYS
// ════════════════════════════════════════════════════════════════════════════

const LikeOverlay = () => (
  <View style={[styles.overlay, styles.likeOverlay]}>
    <Text style={styles.overlayText}>❤️</Text>
    <Text style={styles.overlayLabel}>LIKE</Text>
  </View>
);

const PassOverlay = () => (
  <View style={[styles.overlay, styles.passOverlay]}>
    <Text style={styles.overlayText}>✕</Text>
    <Text style={styles.overlayLabel}>PASS</Text>
  </View>
);

const SuperlikeOverlay = () => (
  <View style={[styles.overlay, styles.superlikeOverlay]}>
    <Text style={styles.overlayText}>⭐</Text>
    <Text style={styles.overlayLabel}>SUPERLIKE!</Text>
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
  icon,
  label,
  onPress,
  color = '#FFF',
  size = 'medium',
  disabled = false,
}) => {
  const sizeStyle = size === 'small' ? styles.buttonSmall : styles.buttonMedium;

  return (
    <TouchableOpacity
      style={[styles.actionButton, sizeStyle, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text
        style={[
          styles.actionButtonIcon,
          { color, fontSize: size === 'small' ? 20 : 28 },
        ]}
      >
        {icon}
      </Text>
      {label && (
        <Text style={[styles.actionButtonLabel, { color }]}>{label}</Text>
      )}
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
// MAIN HOMESCREEN
// ════════════════════════════════════════════════════════════════════════════

const HomeScreen = () => {
  const { token, userId } = useContext(AuthContext);
  const navigation = useNavigation();

  const stackRef = useRef(null);

  // State
  const [isEmpty, setIsEmpty] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [matchedUsers, setMatchedUsers] = useState(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const currentCardIndex = useRef(0);

  // Animation shared values
  const scanFadeOutOpacity = useSharedValue(1);
  const cardFadeInOpacity = useSharedValue(0);

  // Custom hooks
  const swipeStack = useSwipeStack({
    token,
    filters: {
      minAge: 18,
      maxAge: 60,
      gender: 'Everyone',
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SHOW SCAN AND ANIMATE TRANSITION WHEN LOADING COMPLETES
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

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const handleSwipeComplete = useCallback(
    async (direction, user, index) => {
      if (!user) return;

      if (matchedUsers) {
        return;
      }

      try {
        currentCardIndex.current = index + 1;

        const typeMap = {
          left: 'pass',
          right: 'like',
          up: 'superlike',
        };

        console.log('[HomeScreen] Swiped:', typeMap[direction], 'Card:', index);

        const result = await swipeStack.handleSwipe(
          user.userId,
          typeMap[direction],
        );

        if (!result.success) {
          setLocalError(result.error || 'Failed to process swipe');
        } else if (result.match) {
          console.log('[HomeScreen] 🔥 MATCH! 🔥');

          if (userId) {
            const [loggedInUserData, matchedUserData] = await Promise.all([
              fetchUserProfile(userId, token),
              fetchUserProfile(user.userId, token),
            ]);

            if (loggedInUserData && matchedUserData) {
              setMatchedUsers({
                user1: loggedInUserData,
                user2: matchedUserData,
              });
            } else {
              setLocalError('Failed to load match profiles');
            }
          } else {
            setLocalError('User ID not found');
          }
        }
      } catch (err) {
        setLocalError(err.message || 'Unknown error');
        console.error('[HomeScreen] Swipe error:', err);
      }
    },
    [swipeStack, userId, token, matchedUsers],
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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  // Initial loading state
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF0059" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>
          {swipeStack.feedLength} profiles available
        </Text>
      </View>

      {/* Swipe Stack */}
      <View style={{ flex: 1, opacity: isModalVisible ? 0.5 : 1 }}>
        <SwipeableStack
          ref={stackRef}
          data={swipeStack.feed}
          keyExtractor={item => item.userId}
          renderCard={item => (
            <ProfileCard user={item} cardFadeInOpacity={cardFadeInOpacity} />
          )}
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
          maxRotation={12}
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
          icon="↩"
          onPress={() => stackRef.current?.undo()}
          color="#666"
          size="small"
          disabled={isModalVisible}
        />
        <ActionButton
          icon="✕"
          onPress={() => stackRef.current?.swipeLeft()}
          color="#EF4444"
          disabled={isModalVisible}
        />
        <ActionButton
          icon="♥"
          onPress={() => stackRef.current?.swipeRight()}
          color="#EC4899"
          disabled={isModalVisible}
        />
        <ActionButton
          icon="⭐"
          onPress={() => stackRef.current?.swipeUp()}
          color="#FFB800"
          disabled={isModalVisible}
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
    </View>
  );
};

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
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  stackContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
    backgroundColor: 'white',
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
    marginBottom: 20,
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

  // Card
  cardContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    height: '50%',
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
    color: '#FFF',
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

  cardShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    borderWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  likeOverlay: {
    borderColor: '#EC4899',
    transform: [{ rotate: '-20deg' }],
  },

  passOverlay: {
    borderColor: '#EF4444',
    transform: [{ rotate: '20deg' }],
  },

  superlikeOverlay: {
    borderColor: '#FFB800',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
  },

  overlayText: {
    fontSize: 40,
    marginBottom: 4,
  },

  overlayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  buttonSmall: {
    width: 48,
    height: 48,
  },

  buttonMedium: {
    width: 64,
    height: 64,
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

export default HomeScreen;
