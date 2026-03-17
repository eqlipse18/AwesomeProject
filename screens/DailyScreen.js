/**
 * DailyScreen - Carousel of daily profiles
 *
 * Shows today's 20 profiles (superlikes + boosts)
 * Resets at midnight | Backdrop blur | Scale + parallax animation
 */

import React, { useCallback, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
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
import { useDailyFeed } from '../src/hooks/useDailyFeedHook';
import changeNavigationBarColor from 'react-native-navigation-bar-color';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const _cardWidth = SCREEN_WIDTH * 0.76;
const _cardHeight = SCREEN_HEIGHT * 0.62; // ✅ screen height based — zyada tall
const _spacing = 16;

// ════════════════════════════════════════════════════════════════════════════
// TAG BADGE
// ════════════════════════════════════════════════════════════════════════════

const TAG_CONFIG = {
  superlike: {
    label: '⚡ Superliked You',
    bg: 'rgba(255, 0, 89, 0.88)',
  },
  boost: {
    label: '🚀 Boosted Profile',
    bg: 'rgba(39, 169, 255, 0.88)',
  },
  top_liked: {
    label: '🔥 Most Liked',
    bg: 'rgba(255, 149, 0, 0.88)',
  },
  discover: {
    label: '✨ Discover',
    bg: 'rgba(100, 100, 100, 0.75)', // neutral grey
  },
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
// BACKDROP PHOTO (blurred bg)
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
      [0.84, 1, 0.84], // ✅ side cards aur chhote
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      [index - 1, index, index + 1],
      [24, 0, 24], // ✅ side cards neeche, center card upar — depth feel
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
    if (Platform.OS === 'android') {
      changeNavigationBarColor('#000000', false);
    }
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
        {item.hometown ? (
          <Text style={styles.cardLocation} numberOfLines={1}>
            📍 {item.hometown}
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
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function DailyScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const { profiles, unseenCount, loading, error, markSeen } = useDailyFeed({
    token,
  });

  const scrollX = useSharedValue(0);
  const lastSeenIndex = useRef(-1);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollX.value = e.contentOffset.x / (_cardWidth + _spacing);
  });

  // Mark profile as seen when it snaps into focus
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

      {/* Backdrop blurred photos */}
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

      {/* Dim overlay */}
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
          data={profiles}
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
          renderItem={({ item, index }) => (
            <ProfileCard item={item} index={index} scrollX={scrollX} />
          )}
          onScroll={onScroll}
          scrollEventThrottle={1}
          onMomentumScrollEnd={onMomentumScrollEnd}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
        />
      </View>

      {/* Footer */}
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
    marginBottom: 0,
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
    elevation: 12, // ✅ Android shadow
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
  superlikeBadge: { backgroundColor: 'rgba(255,0,89,0.85)' },
  boostBadge: { backgroundColor: 'rgba(39,169,255,0.85)' },
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
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  cardGoals: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
  },

  footer: { paddingVertical: 12, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
});
