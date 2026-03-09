/**
 * HomeScreen - Production Version
 *
 * Fully integrated swipe stack with:
 * - Real feed from backend
 * - Like/Pass/Superlike support
 * - Match detection and notifications
 * - Error handling and loading states
 * - Proper authentication
 */

import React, {
  useCallback,
  useContext,
  useRef,
  useState,
  useMemo,
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
import { SwipeableStack } from '../src/components/swipe/SwipeableStackEnhanced';
import { useSwipeStack, useMatches } from '../src/hooks/useSwipeStackHook';
import { AuthContext } from '../AuthContex';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Card Component
 * Displays a single profile card
 */
const ProfileCard = ({ user }) => {
  console.log('[ProfileCard] User data:', user);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  if (!user) {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.noDataText}>Loading profile...</Text>
        </View>
      </View>
    );
  }
  if (!user.image) {
    console.log('[ProfileCard] NO IMAGE URL!', user); // ← ADD THIS
  }

  return (
    <View style={styles.cardContainer}>
      {/* Image with loading/error handling */}
      {user.image && !imageError ? (
        <>
          <Image
            source={{ uri: user.image }}
            style={styles.cardImage}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={e => {
              console.log('[ProfileCard] Image error:', user.image);
              setImageError(true);
            }}
          />
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="large" color="#FF0059" />
            </View>
          )}
        </>
      ) : (
        <View style={[styles.cardImage, styles.imageFallback]}>
          <Text style={styles.fallbackText}>📷</Text>
        </View>
      )}

      {/* Gradient overlay at bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.85)']}
        style={styles.gradient}
      />

      {/* Profile info */}
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

      {/* Card shadow */}
      <View style={styles.cardShadow} />
    </View>
  );
};

/**
 * Overlay Components
 */
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

/**
 * Match Notification Component
 */
const MatchNotification = ({ user, onDismiss, type }) => {
  return (
    <View style={styles.matchNotificationContainer}>
      <View style={styles.matchNotificationContent}>
        <Text style={styles.matchNotificationEmoji}>
          {type === 'superlike' ? '⭐' : '💕'}
        </Text>
        <Text style={styles.matchNotificationTitle}>It's a Match!</Text>
        <Text style={styles.matchNotificationSubtitle}>
          You and {user.name} liked each other
          {type === 'superlike' ? ' with superlike!' : '!'}
        </Text>

        <TouchableOpacity
          style={styles.matchNotificationButton}
          onPress={onDismiss}
        >
          <Text style={styles.matchNotificationButtonText}>Keep Swiping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Empty State Component
 */
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

/**
 * Action Button Component
 */
const ActionButton = ({
  icon,
  label,
  onPress,
  color = '#FFF',
  size = 'medium',
}) => {
  const sizeStyle = size === 'small' ? styles.buttonSmall : styles.buttonMedium;

  return (
    <TouchableOpacity
      style={[styles.actionButton, sizeStyle, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
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

/**
 * Main HomeScreen Component
 */
const HomeScreen = () => {
  const { token } = useContext(AuthContext);
  const stackRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Swipe stack hook with initial filters
  const swipeStack = useSwipeStack({
    token,
    filters: {
      minAge: 18,
      maxAge: 60,
      gender: 'Everyone',
      // Add hometown if needed: hometown: 'Kathmandu'
    },
  });

  // Matches hook
  const matches = useMatches({ token });

  /**
   * Handle swipe completion from card
   */
  const handleSwipeComplete = useCallback(
    async (direction, user, index) => {
      if (!user) return;

      try {
        // Map swipe direction to backend type
        const typeMap = {
          left: 'pass',
          right: 'like',
          up: 'superlike',
        };

        const result = await swipeStack.handleSwipe(
          user.userId,
          typeMap[direction],
        );

        if (!result.success) {
          setLocalError(result.error || 'Failed to process swipe');
          console.error('[HomeScreen] Swipe failed:', result.error);
        }
      } catch (err) {
        setLocalError(err.message || 'Unknown error');
        console.error('[HomeScreen] Swipe error:', err);
      }
    },
    [swipeStack],
  );

  /**
   * Handle empty state
   */
  const handleEmpty = useCallback(() => {
    setIsEmpty(true);
  }, []);

  /**
   * Reset feed
   */
  const handleReset = useCallback(async () => {
    setIsEmpty(false);
    setLocalError(null);
    await swipeStack.refetchFeed();
  }, [swipeStack]);

  /**
   * Get matched user data for notification
   */
  const getMatchedUser = useCallback(() => {
    if (!swipeStack.matchData || !swipeStack.feed.length) return null;
    // Find the matched user in the feed
    return swipeStack.feed.find(u => u.userId === swipeStack.matchData.matchId);
  }, [swipeStack.matchData, swipeStack.feed]);

  // Show loading state if initializing
  if (!swipeStack.isInitialized && swipeStack.loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF0059" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0059" />
          <Text style={styles.loadingText}>Finding profiles...</Text>
        </View>
      </View>
    );
  }

  // Show empty state
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

  const matchedUser = getMatchedUser();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF0059" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>
          {swipeStack.feedLength} profiles available
        </Text>
      </View>

      {/* Swipe Stack */}
      <SwipeableStack
        ref={stackRef}
        data={swipeStack.feed}
        keyExtractor={item => item.userId}
        renderCard={item => <ProfileCard user={item} />}
        onSwipeRight={(item, index) =>
          handleSwipeComplete('right', item, index)
        }
        onSwipeLeft={(item, index) => handleSwipeComplete('left', item, index)}
        onSwipeUp={(item, index) => handleSwipeComplete('up', item, index)}
        onEmpty={handleEmpty}
        swipeThreshold={SCREEN_WIDTH * 0.25}
        velocityThreshold={800}
        maxRotation={12}
        renderLeftOverlay={() => <PassOverlay />}
        renderRightOverlay={() => <LikeOverlay />}
        renderSuperlikeOverlay={() => <SuperlikeOverlay />}
        containerStyle={styles.stackContainer}
      />

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <ActionButton
          icon="↩"
          onPress={() => stackRef.current?.undo()}
          color="#666"
          size="small"
        />

        <ActionButton
          icon="✕"
          onPress={() => stackRef.current?.swipeLeft()}
          color="#EF4444"
        />

        <ActionButton
          icon="♥"
          onPress={() => stackRef.current?.swipeRight()}
          color="#EC4899"
        />

        <ActionButton
          icon="⭐"
          onPress={() => stackRef.current?.swipeUp()}
          color="#FFB800"
        />
      </View>

      {/* Match Notification */}
      {swipeStack.showMatchNotification && matchedUser && (
        <MatchNotification
          user={matchedUser}
          type={swipeStack.matchData?.type}
          onDismiss={swipeStack.dismissMatch}
        />
      )}

      {/* Error Toast */}
      {localError && (
        <View style={styles.errorToast}>
          <Text style={styles.errorToastText}>{localError}</Text>
          <TouchableOpacity onPress={() => setLocalError(null)}>
            <Text style={styles.errorToastClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
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

  // Stack Container
  stackContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120, // ← ADD THIS for tab bar space
    backgroundColor: 'white',
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
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 15,
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

  // Overlays
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

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 110, // ← ADD THIS to account for CustomTabBar
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

  // Empty State
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

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FF0059',
    marginTop: 16,
    fontWeight: '600',
  },

  // Match Notification
  matchNotificationContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  matchNotificationContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
    marginHorizontal: 24,
  },
  matchNotificationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  matchNotificationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  matchNotificationSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  matchNotificationButton: {
    backgroundColor: '#FF0059',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  matchNotificationButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error Toast
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

  // Error Text
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default HomeScreen;
