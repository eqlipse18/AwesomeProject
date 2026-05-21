import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  Animated,
  PanResponder,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';

const { width: W, height: H } = Dimensions.get('window');
const SHEET_H = H * 0.52;
const SLIDE_W = W;

// ── Stars decoration ──────────────────────────────────────────────────────
const Stars = ({ color }) => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    {['⭐', '✨', '⭐', '✨', '⭐', '✨'].map((s, i) => (
      <Text
        key={i}
        style={{
          position: 'absolute',
          fontSize: i % 2 === 0 ? 18 : 12,
          opacity: 0.6,
          left: `${[8, 25, 72, 88, 15, 65][i]}%`,
          top: `${[15, 35, 10, 28, 65, 55][i]}%`,
          color,
        }}
      >
        {s}
      </Text>
    ))}
  </View>
);

// ── Slide 1 — Superlike hero ──────────────────────────────────────────────
const HeroSlide = () => (
  <LinearGradient colors={['#0a0010', '#1a0030', '#00b3ff']} style={sl.slide}>
    <Stars color="#FFD700" />
    <View style={sl.lottieContainer}>
      <LottieView
        source={require('../../assets/animations/gopro.json')}
        autoPlay
        loop
        style={sl.heroLottie}
        resizeMode="contain"
        renderMode="SOFTWARE"
      />
    </View>

    <View style={sl.heroStarRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={sl.heroBigStar}>
          ⭐
        </Text>
      ))}
    </View>
    <Text style={sl.heroTitle}>Superlike</Text>
    <Text style={sl.heroStat}>10x</Text>
    <Text style={sl.heroStatLabel}>more chances of matching</Text>
    <Text style={sl.heroDesc}>
      When you Superlike someone, they'll know you're extra interested. It
      skyrockets your chances of matching!
    </Text>
  </LinearGradient>
);

// ── Slide 2 — Flame Plus ─────────────────────────────────────────────────
const PlusSlide = ({ onPress }) => (
  <LinearGradient colors={['#1a0500', '#3d1000', '#ff9500']} style={sl.slide}>
    <Stars color="#FF8C00" />
    <LottieView
      source={require('../../assets/animations/PremiumGold.json')}
      autoPlay
      loop
      style={sl.planLottie}
      resizeMode="contain"
    />
    <View style={sl.planBadge}>
      <Text style={[sl.planBadgeTxt, { color: '#FF8C00' }]}>FLAME PLUS</Text>
    </View>
    <Text style={sl.planTitle}>5 Superlikes Per Day</Text>
    <View style={sl.featuresList}>
      {[
        '⭐  5 Superlikes every day',
        '❤️  See who liked you',
        '↩️  Unlimited rewinds',
        '👀  Unlock profile visitors',
        '🚀  1 Boost every 15 days',
      ].map((f, i) => (
        <Text key={i} style={sl.featureItem}>
          {f}
        </Text>
      ))}
    </View>
    <TouchableOpacity
      style={[sl.planBtn, { borderColor: '#FF8C00' }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={['#FF8C00', '#FF6B00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={sl.planBtnGrad}
      >
        <Text style={sl.planBtnTxt}>Get Flame Plus · ₹299/mo</Text>
      </LinearGradient>
    </TouchableOpacity>
  </LinearGradient>
);

// ── Slide 3 — Flame Ultra ─────────────────────────────────────────────────
const UltraSlide = ({ onPress }) => (
  <LinearGradient colors={['#0a0015', '#1a0035', '#2f00ff']} style={sl.slide}>
    <Stars color="#C084FC" />
    <LottieView
      source={require('../../assets/animations/Diamond.json')}
      autoPlay
      loop
      style={sl.planLottie}
      resizeMode="contain"
    />
    <View
      style={[
        sl.planBadge,
        {
          backgroundColor: 'rgba(192,132,252,0.15)',
          borderColor: 'rgba(192,132,252,0.4)',
        },
      ]}
    >
      <Text style={[sl.planBadgeTxt, { color: '#C084FC' }]}>FLAME ULTRA</Text>
    </View>
    <Text style={sl.planTitle}>Unlimited Superlikes</Text>
    <View style={sl.featuresList}>
      {[
        '⭐  Unlimited Superlikes daily',
        '⚡  Instant Match feature',
        '🚀  Always-on Full Boost',
        '👑  #1 in Daily New tab',
        '💎  Ultra identity badge',
        '🔥  All Flame Plus features',
      ].map((f, i) => (
        <Text key={i} style={[sl.featureItem, { color: '#E9D5FF' }]}>
          {f}
        </Text>
      ))}
    </View>
    <TouchableOpacity style={sl.planBtn} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={['#C084FC', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={sl.planBtnGrad}
      >
        <Text style={sl.planBtnTxt}>Get Flame Ultra · ₹399/mo</Text>
      </LinearGradient>
    </TouchableOpacity>
  </LinearGradient>
);

// ── Main Sheet ─────────────────────────────────────────────────────────────
export default function SuperlikeSheet({ visible, onClose, navigation }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const flatRef = useRef(null);

  // SuperlikeSheet.js — visible useEffect mein add karo
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SHEET_H,
      damping: 22,
      stiffness: 180,
      useNativeDriver: true,
    }).start();

    if (!visible) {
      setActiveIdx(0);
      return;
    }

    // ← Auto-scroll to slide 2 after 0.8s
    const timer = setTimeout(() => {
      flatRef.current?.scrollToIndex({ index: 1, animated: true });
      setActiveIdx(1);
    }, 1400);

    return () => clearTimeout(timer);
  }, [visible]);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.8) onClose();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    }),
  ).current;

  const handleNav = useCallback(
    plan => {
      onClose();
      setTimeout(() => navigation.navigate('Premium', { plan }), 250);
    },
    [onClose, navigation],
  );

  const slides = [
    { key: 'hero', component: <HeroSlide /> },
    { key: 'plus', component: <PlusSlide onPress={() => handleNav('plus')} /> },
    {
      key: 'ultra',
      component: <UltraSlide onPress={() => handleNav('ultra')} />,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={sl.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View style={[sl.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={sl.dragArea}>
          <View style={sl.handle} />
        </View>

        {/* Carousel */}
        <FlatList
          ref={flatRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i.key}
          onMomentumScrollEnd={e => {
            setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / SLIDE_W));
          }}
          renderItem={({ item }) => item.component}
          snapToInterval={SLIDE_W}
          decelerationRate="fast"
          bounces={false}
          style={{ flex: 1 }}
        />

        {/* Dots */}
        <View style={sl.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIdx(i);
              }}
            >
              <View
                style={[
                  sl.dot,
                  i === activeIdx
                    ? {
                        width: 20,
                        backgroundColor:
                          activeIdx === 2
                            ? '#C084FC'
                            : activeIdx === 1
                            ? '#FF8C00'
                            : '#FFD700',
                      }
                    : { width: 6, backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Skip */}
        <TouchableOpacity style={sl.skip} onPress={onClose}>
          <Text style={sl.skipTxt}>Not now</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const sl = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  dragArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Slides
  slide: {
    width: SLIDE_W,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // Hero slide
  heroLottie: { width: W * 0.65, height: 120 },
  heroStarRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  heroBigStar: { fontSize: 22 },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroStat: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 78,
  },
  heroStatLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginBottom: 14,
  },
  heroDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Plan slides
  planLottie: { width: 90, height: 90, marginBottom: 6 },
  planBadge: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  planBadgeTxt: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: { alignSelf: 'stretch', gap: 8, marginBottom: 20 },
  featureItem: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  planBtn: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
  },
  planBtnGrad: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  planBtnTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  // Dots + skip
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
    alignItems: 'center',
  },
  dot: { height: 6, borderRadius: 3 },
  skip: { paddingBottom: 20, alignItems: 'center' },
  skipTxt: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  lottieContainer: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});
