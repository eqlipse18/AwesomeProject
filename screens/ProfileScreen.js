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
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Config from 'react-native-config';
import { AuthContext } from '../AuthContex';

const { width: W } = Dimensions.get('window');
const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

// ── Plans data ───────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'plus',
    badge: 'PLUS',
    name: 'Flame Plus',
    price: '₹399',
    period: '/ mo',
    features: [
      'Unlimited swipes',
      'See who liked you',
      '5 Super Likes / day',
      'Rewind last swipe',
    ],
    gradColors: ['#1e1b4b', '#3730a3'],
    accentColor: '#818cf8',
    badgeBg: 'rgba(129,140,248,0.25)',
    ctaBg: '#6366f1',
    ctaLabel: 'Get Plus',
  },
  {
    id: 'ultra',
    badge: 'ULTRA',
    name: 'Flame Ultra',
    price: '₹799',
    period: '/ mo',
    features: [
      'Everything in Plus',
      'Priority in feed',
      'Read receipts',
      'Daily profile boost',
    ],
    gradColors: ['#431407', '#9a3412'],
    accentColor: '#fb923c',
    badgeBg: 'rgba(251,146,60,0.22)',
    ctaBg: '#f97316',
    ctaLabel: 'Get Ultra',
  },
];

// ── Discover buttons data ────────────────────────────────────────────────────
const makeDiscoverItems = stats => [
  {
    id: 'likes',
    icon: '❤️',
    label: 'Who Liked Me',
    sub: stats.likes > 0 ? `${stats.likes} new` : 'See all',
    bg: '#fff0f4',
    iconBg: '#FF0059',
    route: 'Likes',
  },
  {
    id: 'views',
    icon: '👁',
    label: 'Profile Views',
    sub: stats.views > 0 ? `${stats.views} views` : 'View all',
    bg: '#f0eeff',
    iconBg: '#7C3AED',
    route: 'Visitors',
  },
  {
    id: 'premium',
    icon: '★',
    label: 'Go Premium',
    sub: 'Unlock all',
    bg: '#fffbeb',
    iconBg: '#F59E0B',
    route: 'Premium',
  },
  {
    id: 'rewind',
    icon: '↩',
    label: 'Rewind Swipe',
    sub: 'Last card',
    bg: '#f0fdf4',
    iconBg: '#10B981',
    route: null, // handle inline
  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const {
    token,
    userId,
    userInfo,
    setUserInfo,
    userImage,
    setUserImage,
    subscription,
  } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ likes: 0, views: 0 });
  const autoTimer = useRef(null);
  const planRef = useRef(null);
  const [planIdx, setPlanIdx] = useState(0);

  // ── Fetch profile + stats ─────────────────────────────────────────────
  useEffect(() => {
    if (!token || !userId) return;
    (async () => {
      try {
        setLoading(true);
        const [pRes, sRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`${API_BASE_URL}/profile/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(r => r.json())
            .catch(() => null),
        ]);
        if (pRes) {
          setProfile(pRes);
          if (setUserInfo) setUserInfo(pRes);
          const img =
            pRes.imageUrls?.[0] || pRes.image || pRes.profileImage || null;
          if (img && setUserImage) setUserImage(img);
        }
        if (sRes) {
          setStats({
            likes: sRes.likeCount ?? sRes.likes ?? 0,
            views: sRes.viewCount ?? sRes.views ?? 0,
          });
        }
      } catch (e) {
        console.log('[ProfileScreen] fetch error:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, userId]);

  // ── Plan carousel auto-scroll ─────────────────────────────────────────
  const startAutoScroll = useCallback(() => {
    clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => {
      setPlanIdx(prev => {
        const next = (prev + 1) % PLANS.length;
        planRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3200);
  }, []);

  useEffect(() => {
    startAutoScroll();
    return () => clearInterval(autoTimer.current);
  }, [startAutoScroll]);

  const onPlanScroll = useCallback(
    e => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / W);
      setPlanIdx(idx);
      startAutoScroll(); // reset timer on manual swipe
    },
    [startAutoScroll],
  );

  // ── Derived ───────────────────────────────────────────────────────────
  const images = profile?.imageUrls || userInfo?.imageUrls || [];
  // Hero = second image if exists, else first image, else null
  const heroImage = images[1] || images[0] || userImage || null;
  // Avatar = first image always
  const avatarImg = images[0] || userImage || userInfo?.image || null;

  const displayName = profile?.name || userInfo?.name || '';
  const displayAge = profile?.age || userInfo?.age || '';
  const displayCity =
    profile?.city ||
    userInfo?.city ||
    profile?.location?.city ||
    userInfo?.location?.city ||
    '';

  const isPremium = !!subscription?.isActive;
  const discoverItems = makeDiscoverItems(stats);

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color="#FF0059" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Hero image ── */}
        <View style={s.hero}>
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={s.heroBg}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient colors={['#FF0059', '#FF5289']} style={s.heroBg} />
          )}
          {/* dark overlay for readability */}
          <View style={s.heroOverlay} />

          {/* Top action buttons */}
          <View style={s.topBtns}>
            <TouchableOpacity
              style={s.topBtn}
              onPress={() => navigation.navigate('Boost')}
              activeOpacity={0.8}
            >
              <Text style={s.topBtnIco}>⚡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.topBtn}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <Text style={s.topBtnIco}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar centred at bottom edge */}
          <View style={s.avatarAnchor}>
            <View style={s.avatarRing}>
              {avatarImg ? (
                <Image source={{ uri: avatarImg }} style={s.avatarImg} />
              ) : (
                <View style={[s.avatarImg, s.avatarFb]}>
                  <Text style={s.avatarFbTxt}>
                    {displayName.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            {isPremium && (
              <View style={s.premDot}>
                <Text style={s.premDotTxt}>★</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Name block ── */}
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={s.nameBlock}
        >
          <View style={s.nameRow}>
            <Text style={s.nameText}>{displayName}</Text>
            {!!displayAge && (
              <View style={s.ageChip}>
                <Text style={s.ageChipTxt}>{displayAge}</Text>
              </View>
            )}
          </View>
          {!!displayCity && <Text style={s.locText}>📍 {displayCity}</Text>}
        </Animated.View>

        {/* ── Two action buttons ── */}
        <Animated.View
          entering={FadeInDown.delay(140).springify()}
          style={s.twoBtns}
        >
          <TouchableOpacity
            style={s.btnEdit}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}
          >
            <Text style={s.btnEditTxt}>✏️ Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btnVerify}
            onPress={() => navigation.navigate('Verify')}
            activeOpacity={0.85}
          >
            <Text style={s.btnVerifyTxt}>🛡 Verify Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Discover – horizontal scroll ── */}
        <Text style={s.secTitle}>DISCOVER</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.discRow}
        >
          {discoverItems.map((item, i) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(160 + i * 50).springify()}
            >
              <TouchableOpacity
                style={[s.discCard, { backgroundColor: item.bg }]}
                onPress={() => item.route && navigation.navigate(item.route)}
                activeOpacity={0.8}
              >
                <View style={[s.discIcon, { backgroundColor: item.iconBg }]}>
                  <Text style={s.discIconTxt}>{item.icon}</Text>
                </View>
                <Text style={s.discLabel}>{item.label}</Text>
                <Text style={s.discSub}>{item.sub}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>

        {/* ── Premium Plans ── */}
        <Text style={[s.secTitle, { marginTop: 8 }]}>UPGRADE YOUR FLAME</Text>

        <FlatList
          ref={planRef}
          data={PLANS}
          keyExtractor={p => p.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.planList}
          onScroll={onPlanScroll}
          scrollEventThrottle={16}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => (
            <View style={[s.planCard, { width: W - 32 }]}>
              <LinearGradient colors={item.gradColors} style={s.planGrad}>
                {/* Top row */}
                <View style={s.planTopRow}>
                  <View
                    style={[s.planBadge, { backgroundColor: item.badgeBg }]}
                  >
                    <Text style={[s.planBadgeTxt, { color: item.accentColor }]}>
                      {item.badge}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.planPrice}>
                      {item.price} <Text style={s.planPer}>{item.period}</Text>
                    </Text>
                  </View>
                </View>

                <Text style={s.planName}>{item.name}</Text>

                <View style={s.planFeats}>
                  {item.features.map(f => (
                    <View key={f} style={s.featRow}>
                      <View
                        style={[
                          s.featDot,
                          { backgroundColor: item.accentColor },
                        ]}
                      />
                      <Text style={s.featTxt}>{f}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[s.planCta, { backgroundColor: item.ctaBg }]}
                  onPress={() =>
                    navigation.navigate('Premium', { planId: item.id })
                  }
                  activeOpacity={0.85}
                >
                  <Text style={s.planCtaTxt}>{item.ctaLabel}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        />

        {/* Plan dots */}
        <View style={s.dots}>
          {PLANS.map((_, i) => (
            <View key={i} style={[s.dot, planIdx === i && s.dotActive]} />
          ))}
        </View>

        {/* ── Boost Placeholder ── */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={s.boostCard}
        >
          <LinearGradient
            colors={['#FF0059', '#FF5289']}
            style={s.boostIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.boostIco}>⚡</Text>
          </LinearGradient>

          <View style={s.boostInfo}>
            <Text style={s.boostTitle}>Boost Your Profile</Text>
            <Text style={s.boostSub}>Get 10× more views for 30 minutes</Text>
          </View>

          <TouchableOpacity
            style={s.boostBtn}
            onPress={() => navigation.navigate('Boost')}
            activeOpacity={0.85}
          >
            <Text style={s.boostBtnTxt}>Boost</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero
  hero: {
    height: 260,
    position: 'relative',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  topBtns: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBtnIco: { fontSize: 18 },
  avatarAnchor: {
    position: 'absolute',
    bottom: -46,
    alignSelf: 'center',
  },
  avatarRing: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffd6e4',
  },
  avatarFbTxt: { fontSize: 34, color: '#FF0059', fontWeight: '800' },
  premDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    borderWidth: 2.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premDotTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // Name
  nameBlock: { marginTop: 58, alignItems: 'center', paddingHorizontal: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameText: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  ageChip: {
    backgroundColor: '#FF0059',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  ageChipTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  locText: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  // Two buttons
  twoBtns: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 22,
  },
  btnEdit: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#FF0059',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnEditTxt: { fontSize: 13, fontWeight: '700', color: '#FF0059' },
  btnVerify: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnVerifyTxt: { fontSize: 13, fontWeight: '600', color: '#0F172A' },

  // Section title
  secTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Discover row
  discRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  discCard: {
    width: 90,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  discIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discIconTxt: { fontSize: 18, color: '#fff' },
  discLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 14,
  },
  discSub: { fontSize: 9, color: '#94A3B8', textAlign: 'center' },

  // Plans
  planList: { paddingHorizontal: 16, gap: 0 },
  planCard: { paddingHorizontal: 0 },
  planGrad: {
    borderRadius: 22,
    padding: 20,
    marginHorizontal: 0,
  },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#fff' },
  planPer: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.5)' },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 14,
  },
  planFeats: { gap: 6, marginBottom: 16 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featDot: { width: 5, height: 5, borderRadius: 3 },
  featTxt: { fontSize: 12, color: 'rgba(255,255,255,0.82)' },
  planCta: {
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCtaTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 20,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' },
  dotActive: { width: 18, backgroundColor: '#FF0059', borderRadius: 3 },

  // Boost
  boostCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  boostIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  boostIco: { fontSize: 24 },
  boostInfo: { flex: 1 },
  boostTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  boostSub: { fontSize: 12, color: '#94A3B8', lineHeight: 17 },
  boostBtn: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  boostBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
