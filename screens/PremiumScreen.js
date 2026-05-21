import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated2, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AuthContext } from '../AuthContex';
import LottieView from 'lottie-react-native';

const { width: W, height: H } = Dimensions.get('window');
const CARD_WIDTH = W * 0.52;
const CARD_GAP = 12;
const LEFT_PAD = 20;
const SIDE_PEEK = (W - CARD_WIDTH) / 2 - CARD_GAP;

// ── Plan Config ───────────────────────────────────────────────────────────
const PLANS = {
  plus: {
    id: 'plus',
    name: 'FLAME PLUS',
    tagline: 'Unlock your dating potential',
    lottie: require('../assets/animations/PremiumGold.json'), // ← ADD
    lottieSize: 140,
    lottieSpeed: 1,
    glowSize: 90,
    headerColors: ['#1a0a00', '#3d1500', '#6b2500'],
    accentColor: '#FF8C00',
    accentLight: '#FFB347',
    badgeColor: '#FF8C00',
    btnColors: ['#FF8C00', '#FF6B00'],
    cardBorder: 'rgba(255,140,0,0.4)',
    cardSelected: 'rgba(255,140,0,0.15)',
    headerLabel: 'PREMIUM Exclusive Privileges',
    headerLabelBg: 'rgba(255,140,0,0.2)',
    pricing: [
      {
        id: 'p1m',
        duration: '1',
        unit: 'month',
        price: '₹299',
        perMonth: '₹299/mo',
        total: '₹299',
        hot: false,
      },
      {
        id: 'p3m',
        duration: '3',
        unit: 'months',
        price: '₹249',
        perMonth: '₹249/mo',
        total: '₹747',
        hot: true,
      },
      {
        id: 'p6m',
        duration: '6',
        unit: 'months',
        price: '₹199',
        perMonth: '₹199/mo',
        total: '₹1,194',
        hot: false,
      },
    ],
    features: [
      {
        title: 'Advanced Filters',
        sub: 'Relationship goals, verified only & more',
        icon: '🎯',
      },
      {
        title: 'Unlimited Card Rewinds',
        sub: 'Undo your last swipe anytime',
        icon: '↩️',
      },
      {
        title: '5 Superlikes Per Day',
        sub: 'Stand out and get 5x more attention',
        icon: '⭐',
      },
      {
        title: 'See Who Liked You',
        sub: 'View all profiles that liked you first',
        icon: '❤️',
      },
      {
        title: 'Unlock Who Viewed Me',
        sub: 'Never miss someone who checked your profile',
        icon: '👀',
      },
      {
        title: '1 Boost Every 15 Days',
        sub: 'Be seen by 10x more people in your area',
        icon: '🚀',
      },
      {
        title: 'Hide Last Seen',
        sub: 'Browse privately without others knowing',
        icon: '🔒',
      },
      {
        title: 'Featured in Daily & Nearby',
        sub: 'Get priority placement in discovery tabs',
        icon: '✨',
      },
      {
        title: '1 Message Request/Day',
        sub: 'Reach out to anyone without matching first',
        icon: '💌',
      },
    ],
  },
  ultra: {
    id: 'ultra',
    name: 'FLAME ULTRA',
    tagline: 'The ultimate dating experience',
    lottie: require('../assets/animations/Diamond.json'),
    lottieSize: 130,
    lottieSpeed: 0.8,
    glowSize: 130,
    headerColors: ['#0a0015', '#1a0030', '#2d0050'],
    accentColor: '#C084FC',
    accentLight: '#E9D5FF',
    badgeColor: '#A855F7',
    btnColors: ['#C084FC', '#7C3AED'],
    cardBorder: 'rgba(192,132,252,0.4)',
    cardSelected: 'rgba(192,132,252,0.12)',
    headerLabel: 'Exclusive ULTRA Privileges',
    headerLabelBg: 'rgba(192,132,252,0.15)',
    pricing: [
      {
        id: 'u1m',
        duration: '1',
        unit: 'month',
        price: '₹399',
        perMonth: '₹399/mo',
        total: '₹399',
        hot: false,
      },
      {
        id: 'u3m',
        duration: '3',
        unit: 'months',
        price: '₹329',
        perMonth: '₹329/mo',
        total: '₹987',
        hot: true,
      },
      {
        id: 'u6m',
        duration: '6',
        unit: 'months',
        price: '₹279',
        perMonth: '₹279/mo',
        total: '₹1,674',
        hot: false,
      },
    ],
    features: [
      {
        title: 'All Flame Plus Features',
        sub: 'Everything in Flame Plus included',
        icon: '🔥',
        isAll: true,
      },
      {
        title: 'Instant Match',
        sub: 'Match instantly with other premium users',
        icon: '⚡',
      },
      {
        title: 'Full-time Boost',
        sub: 'Always visible — 10x more profile views',
        icon: '🚀',
      },
      {
        title: 'Unlimited Superlikes',
        sub: 'Superlike everyone, match 5x faster',
        icon: '⭐',
      },
      {
        title: '#1 in Daily New Tab',
        sub: 'Always first in daily discovery feed',
        icon: '👑',
      },
      {
        title: 'Ultra Identity Badge',
        sub: 'Stand out with an exclusive Ultra badge on profile',
        icon: '💎',
      },
    ],
  },
};

// ── Particle Component ─────────────────────────────────────────────────────
const Particle = ({ x, y, size, opacity, color }) => (
  <Animated2.View
    entering={FadeIn.delay(Math.random() * 1000).duration(800)}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity,
    }}
  />
);

// ── Pricing Card ───────────────────────────────────────────────────────────
const PricingCard = ({ plan: p, item, selected, onSelect }) => {
  const opacity = useSharedValue(selected ? 1 : 0.45);

  useEffect(() => {
    opacity.value = withTiming(selected ? 1 : 0.45, { duration: 160 });
  }, [selected]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated2.View
      style={[animStyle, { width: CARD_WIDTH, marginHorizontal: CARD_GAP / 2 }]}
    >
      <TouchableOpacity
        style={[
          ps.pricingCard,
          {
            borderColor: selected ? p.accentColor : 'rgba(255,255,255,0.1)',
            backgroundColor: selected
              ? p.cardSelected
              : 'rgba(255,255,255,0.05)',
          },
        ]}
        onPress={() => onSelect(item.id)}
        activeOpacity={0.85}
      >
        {item.hot && (
          <View style={[ps.hotBadge, { backgroundColor: p.badgeColor }]}>
            <Text style={ps.hotTxt}>HOT</Text>
          </View>
        )}
        <Text
          style={[
            ps.cardDuration,
            { color: selected ? p.accentLight : '#fff' },
          ]}
        >
          <Text style={ps.cardDurationNum}>{item.duration}</Text> {item.unit}
        </Text>
        <Text
          style={[
            ps.cardPrice,
            { color: selected ? p.accentColor : 'rgba(255,255,255,0.4)' },
          ]}
        >
          {item.perMonth}
        </Text>
        {/* Total line — always render, just invisible when not selected to keep height fixed */}
        <Text
          style={[
            ps.cardTotal,
            { color: selected ? p.accentLight : 'transparent' },
          ]}
        >
          Total: {item.total}
        </Text>
      </TouchableOpacity>
    </Animated2.View>
  );
};
// ── Feature Row ────────────────────────────────────────────────────────────
const FeatureRow = ({ item, accentColor, accentLight, index }) => (
  <Animated2.View
    entering={FadeInDown.delay(index * 60).duration(350)}
    style={[ps.featureRow, item.isAll && ps.featureRowAll]}
  >
    <View style={[ps.featureCheck, { backgroundColor: `${accentColor}22` }]}>
      <Text style={{ fontSize: 14 }}>{item.icon}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[ps.featureTitle, item.isAll && { color: accentColor }]}>
        {item.title}
      </Text>
      <Text style={ps.featureSub}>{item.sub}</Text>
    </View>
  </Animated2.View>
);

// ── Main Screen ────────────────────────────────────────────────────────────
export default function PremiumScreen({ navigation, route }) {
  const planId = route.params?.plan || 'plus';
  const p = PLANS[planId];

  const [selectedPlan, setSelectedPlan] = useState(
    p.pricing.find(x => x.hot)?.id || p.pricing[0].id,
  );

  const selectedPricing = p.pricing.find(x => x.id === selectedPlan);

  // Particles
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      y: Math.random() * H * 0.45,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
    })),
  ).current;

  return (
    <View style={{ flex: 1, backgroundColor: p.headerColors[0] }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        bounces={false}
      >
        {/* ── Hero Section ── */}
        <LinearGradient colors={p.headerColors} style={ps.hero}>
          {/* Particles */}
          {particles.map(pt => (
            <Particle
              key={pt.id}
              x={pt.x}
              y={pt.y}
              size={pt.size}
              opacity={pt.opacity}
              color={p.accentColor}
            />
          ))}

          {/* Close button */}
          <SafeAreaView style={ps.closeWrap}>
            <TouchableOpacity
              style={ps.closeBtn}
              onPress={() => navigation.goBack()}
              hitSlop={12}
            >
              <Text style={ps.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={[ps.heroLabel, { color: p.accentLight }]}>
              {p.name}
            </Text>
            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* ── Icon — Lottie ── */}
          <Animated2.View
            entering={FadeIn.delay(200).duration(600)}
            style={ps.iconWrap}
          >
            <View
              style={[
                ps.iconGlow,
                {
                  backgroundColor: p.accentColor,
                  width: p.glowSize,
                  height: p.glowSize,
                  borderRadius: p.glowSize / 2,
                },
              ]}
            />
            <LottieView
              source={p.lottie}
              autoPlay
              loop
              speed={p.lottieSpeed}
              style={{ width: p.lottieSize, height: p.lottieSize }}
              resizeMode="cover"
            />
          </Animated2.View>

          <Animated2.Text
            entering={FadeInDown.delay(300).duration(400)}
            style={[ps.heroTagline, { color: 'rgba(255,255,255,0.7)' }]}
          >
            {p.tagline}
          </Animated2.Text>
        </LinearGradient>

        {/* ── Pricing Cards ── */}
        <View style={[ps.section, { backgroundColor: p.headerColors[0] }]}>
          <FlatList
            data={p.pricing}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            // ─── snap config ───
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="start"
            decelerationRate={0.92} // 0.92 = very fast snap, "fast" se better
            // ─── padding ───
            contentContainerStyle={{
              paddingLeft: LEFT_PAD,
              paddingRight: LEFT_PAD,
              paddingVertical: 8,
            }}
            // ─── initial position ───
            initialScrollIndex={p.pricing.findIndex(x => x.hot) || 0}
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH + CARD_GAP,
              offset: (CARD_WIDTH + CARD_GAP) * index,
              index,
            })}
            // ─── sync selection on snap ───
            onMomentumScrollEnd={e => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP),
              );
              const snapped =
                p.pricing[Math.max(0, Math.min(index, p.pricing.length - 1))];
              if (snapped) setSelectedPlan(snapped.id);
            }}
            renderItem={({ item }) => (
              <PricingCard
                plan={p}
                item={item}
                selected={selectedPlan === item.id}
                onSelect={setSelectedPlan}
              />
            )}
          />

          {/* Dots */}
          <View style={ps.dots}>
            {p.pricing.map((item, i) => (
              <View
                key={i}
                style={[
                  ps.dot,
                  selectedPlan === item.id
                    ? { backgroundColor: p.accentColor, width: 18 }
                    : { backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── Features ── */}
        <View
          style={[ps.featuresSection, { backgroundColor: p.headerColors[0] }]}
        >
          {/* Header pill */}
          <View
            style={[
              ps.featuresHeader,
              { backgroundColor: p.headerLabelBg, borderColor: p.cardBorder },
            ]}
          >
            <View
              style={[ps.featuresHeaderDot, { backgroundColor: p.accentColor }]}
            />
            <Text style={[ps.featuresHeaderTxt, { color: p.accentLight }]}>
              {p.headerLabel}
            </Text>
          </View>

          {/* Feature list */}
          <View style={[ps.featuresList, { borderColor: p.cardBorder }]}>
            {p.features.map((feat, i) => (
              <FeatureRow
                key={i}
                item={feat}
                accentColor={p.accentColor}
                accentLight={p.accentLight}
                index={i}
              />
            ))}
          </View>
        </View>

        {/* Legal text */}
        <Text style={ps.legal}>
          Auto-renewable subscription. Cancel anytime in Play Store settings.
          Renews 24 hours before end of period.
        </Text>
      </ScrollView>

      {/* ── Sticky CTA Button ── */}
      <View style={[ps.ctaWrap, { backgroundColor: p.headerColors[0] }]}>
        <TouchableOpacity
          style={ps.ctaBtn}
          activeOpacity={0.88}
          onPress={() => {
            // In-app purchase flow — coming soon
            console.log('[Premium] Purchase:', selectedPlan, selectedPricing);
          }}
        >
          <LinearGradient
            colors={p.btnColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ps.ctaBtnGradient}
          >
            <Text style={ps.ctaBtnTxt}>
              {selectedPricing?.total} — Get {p.name.split(' ')[1]}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[ps.ctaSub, { color: `${p.accentColor}99` }]}>
          {selectedPricing?.perMonth} • Cancel anytime
        </Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  hero: {
    minHeight: H * 0.35,
    alignItems: 'center',
    paddingBottom: 24,
  },
  closeWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  heroLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  iconWrap: {
    marginTop: 20,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    borderRadius: 45,
    opacity: 0.25,
    transform: [{ scaleX: 1.4 }],
  },
  iconEmoji: { fontSize: 72 },
  heroTagline: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    letterSpacing: 0.3,
  },

  // Pricing
  section: { paddingTop: 20 },
  pricingRow: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  pricingCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  hotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8, // sirf non-absolute use ke liye fallback
  },

  hotTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardDuration: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  cardDurationNum: { fontSize: 28, fontWeight: '800' },
  cardPrice: { fontSize: 13, fontWeight: '600' },
  cardTotal: { fontSize: 11, marginTop: 4, opacity: 0.8 },

  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    width: 6,
    transitionDuration: '300ms',
  },

  // Features
  featuresSection: { paddingHorizontal: 20, paddingTop: 24 },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  featuresHeaderDot: { width: 6, height: 6, borderRadius: 3 },
  featuresHeaderTxt: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  featuresList: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  featureRowAll: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  featureCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 16,
  },

  legal: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 24,
    lineHeight: 16,
  },

  // CTA
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  ctaBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ctaSub: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
    fontWeight: '500',
  },
});
