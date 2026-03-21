/**
 * DailyScreen - WITH LOCATION DISTANCE + END CARD ✨
 *
 * End card features:
 * - Last user's blurred image as background
 * - "Come back tomorrow!" message
 * - Live countdown to midnight reset
 * - "Scroll back up" button
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
import { AuthContext } from '../AuthContex';
import { useMyLocation } from '../LocationContext';
import { useDailyFeed } from '../src/hooks/useDailyFeedHook';
import { getLocationDisplay } from '../utils/locationUtils';
import changeNavigationBarColor from 'react-native-navigation-bar-color';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const _cardWidth = SCREEN_WIDTH * 0.76;
const _cardHeight = SCREEN_HEIGHT * 0.62;
const _spacing = 16;

// ════════════════════════════════════════════════════════════════════════════
// MIDNIGHT COUNTDOWN HOOK
// ════════════════════════════════════════════════════════════════════════════

const useMidnightCountdown = () => {
  const getTimeLeft = () => {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    const diff = midnight - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return {
      h,
      m,
      s,
      formatted: `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(
        2,
        '0',
      )}s`,
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
};

// ════════════════════════════════════════════════════════════════════════════
// TAG BADGE
// ════════════════════════════════════════════════════════════════════════════

const TAG_CONFIG = {
  superlike: { label: '⚡ Superliked You', bg: 'rgba(255, 0, 89, 0.88)' },
  boost: { label: '🚀 Boosted Profile', bg: 'rgba(39, 169, 255, 0.88)' },
  top_liked: { label: '🔥 Most Liked', bg: 'rgba(255, 149, 0, 0.88)' },
  discover: { label: '✨ Discover', bg: 'rgba(100, 100, 100, 0.75)' },
};

const TagBadge = ({ tag }) => {
  const config = TAG_CONFIG[tag] || TAG_CONFIG.top_liked;
  return (
    <View style={[styles.tagBadge, { backgroundColor: config.bg }]}>
      <Text style={styles.tagText}>{config.label}</Text>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// BACKDROP PHOTO
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
  const myLocation = useMyLocation();

  const locationDisplay = useMemo(
    () => getLocationDisplay(myLocation, item),
    [myLocation, item],
  );

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
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        style={styles.cardGradient}
      />

      <View style={styles.cardInfo}>
        <TagBadge tag={item.tag} />
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.age ? <Text style={styles.cardAge}>{item.age}</Text> : null}
        </View>
        {locationDisplay ? (
          <Text style={styles.cardLocation} numberOfLines={1}>
            {locationDisplay}
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
// END CARD ✨ — last user blurred bg + midnight countdown
// ════════════════════════════════════════════════════════════════════════════

const EndCard = ({ index, scrollX, lastImage, onScrollBack }) => {
  const { formatted } = useMidnightCountdown();

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

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Last user's blurred image */}
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

      {/* Dark overlay */}
      <View style={styles.endCardOverlay} />

      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        style={styles.cardGradient}
      />

      {/* Content */}
      <View style={styles.endCardContent}>
        <Text style={styles.endCardEmoji}>🌅</Text>

        <Text style={styles.endCardTitle}>Come back tomorrow!</Text>
        <Text style={styles.endCardSub}>
          You've seen all your daily picks.{'\n'}New profiles drop at midnight.
        </Text>

        {/* Countdown */}
        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>Resets in</Text>
          <Text style={styles.countdownTimer}>{formatted}</Text>
        </View>

        {/* Scroll back up button */}
        <TouchableOpacity
          style={styles.endCardBtn}
          onPress={onScrollBack}
          activeOpacity={0.8}
        >
          <Text style={styles.endCardBtnText}>↑ Scroll back up</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function DailyScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const { profiles, unseenCount, loading, error, markSeen } = useDailyFeed({
    token,
  });

  const scrollX = useSharedValue(0);
  const flatListRef = useRef(null);
  const lastSeenIndex = useRef(-1);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollX.value = e.contentOffset.x / (_cardWidth + _spacing);
  });

  const onMomentumScrollEnd = useCallback(
    e => {
      const index = Math.round(
        e.nativeEvent.contentOffset.x / (_cardWidth + _spacing),
      );
      if (index !== lastSeenIndex.current && profiles[index]) {
        lastSeenIndex.current = index;
        markSeen(profiles[index].userId);
      }
    },
    [profiles, markSeen],
  );

  // ── Scroll back to first card ──
  const handleScrollBack = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // ── Append end card after all profiles ──
  const listData = useMemo(() => {
    if (profiles.length === 0) return profiles;
    return [...profiles, { _isEndCard: true, userId: '__end__' }];
  }, [profiles]);

  const lastProfileImage =
    profiles.length > 0 ? profiles[profiles.length - 1]?.image : null;

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF0059" />
        <Text style={styles.loadingText}>Finding people for you...</Text>
      </View>
    );
  }

  // ── Empty / Error ──
  if (!loading && (error || profiles.length === 0)) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtnAbsolute}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.emptyEmoji}>{error ? '😕' : '✨'}</Text>
        <Text style={styles.emptyTitle}>
          {error ? 'Something went wrong' : "You're all caught up!"}
        </Text>
        <Text style={styles.emptyMsg}>
          {error
            ? error
            : 'No superlikes or boosted profiles today.\nCheck back tomorrow!'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Backdrop blurred photos — only real profiles, not end card */}
      <View style={StyleSheet.absoluteFillObject}>
        {profiles.map((p, i) => (
          <BackdropPhoto
            key={p.userId}
            uri={p.image}
            index={i}
            scrollX={scrollX}
          />
        ))}
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
          <Text style={styles.headerTitle}>Daily New</Text>
          <Text style={styles.headerSub}>
            {profiles.length} profile{profiles.length !== 1 ? 's' : ''} • resets
            at midnight
          </Text>
        </View>
        {unseenCount > 0 && (
          <View style={styles.unseenBadge}>
            <Text style={styles.unseenText}>{unseenCount}</Text>
          </View>
        )}
      </View>

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <Animated.FlatList
          ref={flatListRef}
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
            // ✅ End card
            if (item._isEndCard) {
              return (
                <EndCard
                  index={index}
                  scrollX={scrollX}
                  lastImage={lastProfileImage}
                  onScrollBack={handleScrollBack}
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
          onMomentumScrollEnd={onMomentumScrollEnd}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Swipe to explore profiles</Text>
      </View>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 40,
  },
  dimOverlay: { backgroundColor: 'rgba(0,0,0,0.52)' },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 12 },
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
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
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
  backBtnAbsolute: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: '#fff', marginTop: -1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  unseenBadge: {
    backgroundColor: '#FF0059',
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unseenText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card
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
    height: '55%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 22,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 5,
  },
  cardName: { fontSize: 26, fontWeight: '700', color: '#fff' },
  cardAge: { fontSize: 20, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  cardLocation: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 5,
  },
  cardGoals: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
  },

  // ── End Card ──
  endCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  endCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  endCardEmoji: { fontSize: 52, marginBottom: 14 },
  endCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  endCardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },

  // Countdown box
  countdownBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  countdownLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  countdownTimer: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },

  // Scroll back button — same as nearby inactive chip style
  endCardBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    alignItems: 'center',
  },
  endCardBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },

  footer: { paddingVertical: 12, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
});
