import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated2, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'; // FIX #6

const { width: W, height: H } = Dimensions.get('window');
const CARD_WIDTH = W * 0.52;
const CARD_GAP = 12;
const LEFT_PAD = 20;

// ── Savings helper ────────────────────────────────────────────────────────
const getSavings = (pricing, item) => {
  const base = Number(
    pricing
      .find(x => x.duration === '1')
      ?.price.replace('₹', '')
      .replace(',', ''),
  );
  const current = Number(item.price.replace('₹', '').replace(',', ''));
  if (!base || item.duration === '1') return null;
  const saved = Math.round(((base - current) / base) * 100);
  return saved > 0 ? `Save ${saved}%` : null;
};

// ── Plan Config ───────────────────────────────────────────────────────────
const PLANS = {
  plus: {
    id: 'plus',
    name: 'FLAME PLUS',
    tagline: 'Unlock your dating potential',
    lottie: require('../assets/animations/PremiumGold.json'),
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

// ── Particle Component ────────────────────────────────────────────────────
// FIX #1: delay pre-computed in particles array — no Math.random() on re-render
const Particle = ({ x, y, size, opacity, color, delay }) => (
  <Animated2.View
    entering={FadeIn.delay(delay).duration(800)}
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

// ── Pricing Card ──────────────────────────────────────────────────────────
const PricingCard = ({ plan: p, item, selected, onSelect }) => {
  // flatListRef, index hata do props se
  const opacity = useSharedValue(selected ? 1 : 0.45);

  useEffect(() => {
    opacity.value = withTiming(selected ? 1 : 0.45, { duration: 160 });
  }, [selected]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const saving = getSavings(p.pricing, item);

  return (
    <Animated2.View
      style={[
        animStyle,
        { width: CARD_WIDTH, marginHorizontal: CARD_GAP / 2 },
        selected && {
          shadowColor: p.accentColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 16,
          elevation: 10,
        },
      ]}
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
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight', {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });
          onSelect(item.id); // bas itna — no scrollToIndex
        }}
        activeOpacity={0.85}
        accessibilityLabel={`${item.duration} ${item.unit} plan, ${
          item.perMonth
        }, total ${item.total}${item.hot ? ', most popular' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        {item.hot && (
          <View style={[ps.hotBadge, { backgroundColor: p.badgeColor }]}>
            <Text style={ps.hotTxt}>HOT</Text>
          </View>
        )}
        {saving && (
          <View
            style={[
              ps.savingsBadge,
              {
                backgroundColor: `${p.accentColor}22`,
                borderColor: `${p.accentColor}55`,
              },
            ]}
          >
            <Text style={[ps.savingsTxt, { color: p.accentLight }]}>
              {saving}
            </Text>
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

// ── Feature Row ───────────────────────────────────────────────────────────
const FeatureRow = ({ item, accentColor, accentLight, index }) => (
  <Animated2.View
    entering={FadeInDown.delay(index * 40).duration(280)}
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

// ── Main Screen ───────────────────────────────────────────────────────────
export default function PremiumScreen({ navigation, route }) {
  const planId = route.params?.plan || 'plus';
  const [activePlan, setActivePlan] = useState(planId);
  const p = PLANS[activePlan];

  const hotIndex = p.pricing.findIndex(x => x.hot);
  const safeHotIndex = Math.max(0, hotIndex); // FIX #2 crash guard

  const [selectedPlan, setSelectedPlan] = useState(p.pricing[safeHotIndex].id);
  const [purchasing, setPurchasing] = useState(false);

  // FIX #4 ref for dot-tap scrolling
  const flatListRef = useRef(null);

  const selectedPricing = p.pricing.find(x => x.id === selectedPlan);

  const isProgrammaticScroll = useRef(false);

  // FIX #1: delay pre-computed once, never changes
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      y: Math.random() * H * 0.45,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
      delay: Math.floor(Math.random() * 1000), // pre-computed here
    })),
  ).current;

  const handlePlanSwitch = id => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    const newHotIndex = Math.max(
      0,
      PLANS[id].pricing.findIndex(x => x.hot),
    );
    setActivePlan(id);
    setSelectedPlan(PLANS[id].pricing[newHotIndex].id);
    // scroll to hot card on plan switch
    setTimeout(() => {
      isProgrammaticScroll.current = true; // add karo
      flatListRef.current?.scrollToIndex({
        index: newHotIndex,
        animated: true,
      });
    }, 50);
  };

  // FIX #4 dot tap handler
  const handleDotPress = (item, index) => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    isProgrammaticScroll.current = true; // flag set karo
    setSelectedPlan(item.id);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

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
        {/* ── Hero ── */}
        <LinearGradient colors={p.headerColors} style={ps.hero}>
          {particles.map(pt => (
            <Particle
              key={pt.id}
              x={pt.x}
              y={pt.y}
              size={pt.size}
              opacity={pt.opacity}
              color={p.accentColor}
              delay={pt.delay} // FIX #1
            />
          ))}

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

          {/* Plan Switcher Tabs */}
          <View style={ps.tabRow}>
            {Object.values(PLANS).map(plan => {
              const isActive = activePlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    ps.tabBtn,
                    isActive
                      ? { backgroundColor: p.accentColor }
                      : {
                          borderColor: 'rgba(255,255,255,0.2)',
                          borderWidth: 1,
                        },
                  ]}
                  onPress={() => handlePlanSwitch(plan.id)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[
                      ps.tabTxt,
                      { color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' },
                    ]}
                  >
                    {plan.name.split(' ')[1]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Lottie */}
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
            ref={flatListRef} // FIX #4
            data={p.pricing}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="start"
            decelerationRate={0.92}
            contentContainerStyle={{
              paddingRight: LEFT_PAD,
              paddingVertical: 8,
            }}
            initialScrollIndex={safeHotIndex} // FIX #2
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH + CARD_GAP,
              offset: (CARD_WIDTH + CARD_GAP) * index, // LEFT_PAD yahan mat add karo
              index,
            })}
            // FIX #8 FlatList optimizations
            removeClippedSubviews={true}
            windowSize={3}
            maxToRenderPerBatch={3}
            onMomentumScrollEnd={e => {
              if (isProgrammaticScroll.current) {
                isProgrammaticScroll.current = false; // reset
                return; // ignore karo
              }
              const index = Math.round(
                e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP),
              );
              const clamped = Math.max(
                0,
                Math.min(index, p.pricing.length - 1),
              );
              const snapped = p.pricing[clamped];
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

          {/* FIX #4 Dots — now tappable */}
          <View style={ps.dots}>
            {p.pricing.map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleDotPress(item, i)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.duration} ${item.unit} plan`}
              >
                <View
                  style={[
                    ps.dot,
                    selectedPlan === item.id
                      ? { backgroundColor: p.accentColor, width: 18 }
                      : { backgroundColor: 'rgba(255,255,255,0.25)' },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Features ── */}
        <View
          style={[ps.featuresSection, { backgroundColor: p.headerColors[0] }]}
        >
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

          <View style={[ps.featuresList, { borderColor: p.cardBorder }]}>
            {p.features.map((feat, i) => (
              <FeatureRow
                key={`${activePlan}-${i}`} // key includes activePlan so list re-animates on switch
                item={feat}
                accentColor={p.accentColor}
                accentLight={p.accentLight}
                index={i}
              />
            ))}
          </View>
        </View>

        <Text style={ps.legal}>
          Auto-renewable subscription. Cancel anytime in Play Store settings.
          {'\n'}
          Renews 24 hours before end of period.
        </Text>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={[ps.ctaWrap, { backgroundColor: p.headerColors[0] }]}>
        <TouchableOpacity
          style={[ps.ctaBtn, purchasing && { opacity: 0.7 }]}
          activeOpacity={0.88}
          disabled={purchasing}
          onPress={async () => {
            setPurchasing(true);
            ReactNativeHapticFeedback.trigger('impactMedium', {
              enableVibrateFallback: true,
              ignoreAndroidSystemSettings: false,
            });
            console.log('[Premium] Purchase:', selectedPlan, selectedPricing);
            // TODO: await your IAP handler here
            setTimeout(() => setPurchasing(false), 2000);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Subscribe for ${selectedPricing?.total}, ${selectedPricing?.perMonth}`}
          accessibilityState={{ disabled: purchasing }}
        >
          <LinearGradient
            colors={p.btnColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ps.ctaBtnGradient}
          >
            {purchasing ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <ActivityIndicator size="small" color="#fff" />
                <Text style={ps.ctaBtnTxt}>Processing...</Text>
              </View>
            ) : (
              <Text style={ps.ctaBtnTxt}>
                {selectedPricing?.total} — Get {p.name.split(' ')[1]}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[ps.ctaSub, { color: `${p.accentColor}99` }]}>
          {selectedPricing?.perMonth} • Cancel anytime
        </Text>

        <TouchableOpacity
          onPress={() => console.log('[Premium] Restore purchases')}
          style={{ marginTop: 6, alignSelf: 'center' }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchases"
        >
          <Text style={ps.restoreTxt}>Restore purchases</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
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
    opacity: 0.25,
    transform: [{ scaleX: 1.4 }],
  },
  heroTagline: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    letterSpacing: 0.3,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
    marginHorizontal: 40,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabTxt: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Pricing
  section: { paddingTop: 20 },
  pricingCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  // FIX #3: HOT badge absolute — no layout shift
  hotBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 1,
  },
  hotTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  savingsTxt: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDuration: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  cardDurationNum: { fontSize: 28, fontWeight: '800' },
  cardPrice: { fontSize: 13, fontWeight: '600' },
  cardTotal: { fontSize: 11, marginTop: 4 },

  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    width: 6,
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
  featureRowAll: { backgroundColor: 'rgba(255,255,255,0.06)' },
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
  featureSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 16 },

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
  restoreTxt: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textDecorationLine: 'underline',
  },
});
