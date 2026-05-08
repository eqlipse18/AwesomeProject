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
  Image,
  FlatList,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../AuthContex';
import Config from 'react-native-config';

const { width: W } = Dimensions.get('window');
const API = Config.API_BASE_URL || 'http://192.168.100.154:9000';
const CARD_W = W * 0.72;

// ── Superlike Pricing Modal ────────────────────────────────────────────────
const SUPERLIKE_PLANS = [
  { id: 'sl5', count: 5, price: '₹99', tag: null },
  { id: 'sl10', count: 10, price: '₹179', tag: 'Popular' },
  { id: 'sl25', count: 25, price: '₹399', tag: 'Best Value' },
];

const SuperlikeModal = ({ visible, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={m.overlay}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <Text style={m.sheetTitle}>⭐ Buy Superlikes</Text>
        <Text style={m.sheetSub}>Stand out and get noticed instantly</Text>
        {SUPERLIKE_PLANS.map(plan => (
          <TouchableOpacity key={plan.id} style={m.planRow} activeOpacity={0.8}>
            <View style={m.planLeft}>
              <Text style={m.planIco}>⭐</Text>
              <View>
                <Text style={m.planTitle}>{plan.count} Superlikes</Text>
                {plan.tag && <Text style={m.planTag}>{plan.tag}</Text>}
              </View>
            </View>
            <View style={m.planPriceBtn}>
              <Text style={m.planPrice}>{plan.price}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={m.closeBtn} onPress={onClose}>
          <Text style={m.closeTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ── Boost Pricing Modal ────────────────────────────────────────────────────
const BOOST_PLANS = [
  { id: 'b1', days: 1, label: '1 Day Boost', price: '₹99', tag: null },
  { id: 'b3', days: 3, label: '3 Day Boost', price: '₹249', tag: 'Popular' },
  { id: 'b7', days: 7, label: '7 Day Boost', price: '₹499', tag: 'Best Value' },
];

const BoostModal = ({ visible, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={m.overlay}>
      <View style={m.sheet}>
        <View style={m.handle} />
        <Text style={m.sheetTitle}>🚀 Boost Your Profile</Text>
        <Text style={m.sheetSub}>Be seen by 10x more people in your area</Text>
        {BOOST_PLANS.map(plan => (
          <TouchableOpacity key={plan.id} style={m.planRow} activeOpacity={0.8}>
            <View style={m.planLeft}>
              <Text style={m.planIco}>🚀</Text>
              <View>
                <Text style={m.planTitle}>{plan.label}</Text>
                {plan.tag && <Text style={m.planTag}>{plan.tag}</Text>}
              </View>
            </View>
            <View style={m.planPriceBtn}>
              <Text style={m.planPrice}>{plan.price}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={m.closeBtn} onPress={onClose}>
          <Text style={m.closeTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ── Premium Cards ──────────────────────────────────────────────────────────
const CARDS = [
  {
    id: 'superlike',
    type: 'modal',
    colors: ['#1a1a2e', '#16213e', '#0f3460'],
    emoji: '⭐',
    badge: 'Superlikes',
    title: 'Get More Superlikes',
    sub: 'Superlike to stand out',
    btnTxt: 'Buy Now',
  },
  {
    id: 'boost',
    type: 'modal',
    colors: ['#2d1b69', '#11998e', '#38ef7d'],
    emoji: '🚀',
    badge: 'Boost',
    title: 'Boost Your Profile',
    sub: 'Be seen by 10x more people',
    btnTxt: 'Boost Now',
  },
  {
    id: 'plus',
    type: 'navigate',
    colors: ['#B90034', '#FF4E7E', '#FF8FA3'],
    emoji: '🔥',
    badge: 'FLAME PLUS',
    title: 'Flame Plus',
    sub: 'Unlimited likes & more',
    btnTxt: '₹299/month',
    price: '₹299',
  },
  {
    id: 'ultra',
    type: 'navigate',
    colors: ['#0f0c29', '#302b63', '#24243e'],
    emoji: '💎',
    badge: 'FLAME ULTRA',
    title: 'Flame Ultra',
    sub: 'The ultimate experience',
    btnTxt: '₹399/month',
    price: '₹399',
  },
];

const PremiumCard = ({ card, onPress }) => (
  <TouchableOpacity style={s.cardWrap} onPress={onPress} activeOpacity={0.9}>
    <LinearGradient
      colors={card.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <View style={s.cardBadge}>
        <Text style={s.cardBadgeTxt}>{card.badge}</Text>
      </View>
      <Text style={s.cardEmoji}>{card.emoji}</Text>
      <Text style={s.cardTitle}>{card.title}</Text>
      <Text style={s.cardSub}>{card.sub}</Text>
      <View style={s.cardBtn}>
        <Text style={s.cardBtnTxt}>{card.btnTxt}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// ── Stat Row ───────────────────────────────────────────────────────────────
const StatRow = ({ emoji, title, sub, count, onPress, entering }) => (
  <Animated.View entering={entering}>
    <TouchableOpacity style={s.statRow} onPress={onPress} activeOpacity={0.75}>
      <View style={s.statLeft}>
        <Text style={s.statEmoji}>{emoji}</Text>
        <View>
          <Text style={s.statTitle}>{title}</Text>
          <Text style={s.statSub}>{sub}</Text>
        </View>
      </View>
      <View style={s.statRight}>
        {count > 0 && (
          <View style={s.statBadge}>
            <Text style={s.statBadgeTxt}>{count > 99 ? '99+' : count}</Text>
          </View>
        )}
        <Text style={s.statChevron}>›</Text>
      </View>
    </TouchableOpacity>
  </Animated.View>
);

// ── Main Screen ────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { token, userId, userImage } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [showSuperlike, setShowSuperlike] = useState(false);
  const [showBoost, setShowBoost] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const resp = await axios.get(`${API}/user-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.data.success) setProfile(resp.data.user);
    } catch (e) {
      console.error('[ProfileScreen] fetchProfile:', e.message);
    }
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      const [likesResp, viewsResp] = await Promise.all([
        axios.get(`${API}/likes/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/users/visitors/count`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (likesResp.data.success) {
        setLikeCount(likesResp.data.stats?.totalReceived || 0);
      }
      if (viewsResp.data.success) {
        setViewCount(viewsResp.data.count || 0);
      }
    } catch (e) {
      console.error('[ProfileScreen] fetchStats:', e.message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchStats();
    }, [fetchProfile, fetchStats]),
  );

  const handleCardPress = card => {
    if (card.id === 'superlike') setShowSuperlike(true);
    else if (card.id === 'boost') setShowBoost(true);
    else navigation.navigate('Premium', { plan: card.id });
  };

  const avatar = profile?.imageUrls?.[0] || userImage || null;
  const name = profile?.firstName || 'User';
  const age = profile?.ageForSort || '';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0EB" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Top section ─────────────────────────────────────────── */}
        <View style={s.topSection}>
          {/* Header row */}
          <View style={s.headerRow}>
            <Text style={s.screenTitle}>Me</Text>
            <View style={s.headerRight}>
              {/* Verify button */}
              <TouchableOpacity
                style={s.verifyBtn}
                onPress={() => navigation.navigate('Verify')}
                activeOpacity={0.8}
              >
                <Text style={s.verifyIco}>✓</Text>
                <Text style={s.verifyTxt}>Verify Profile</Text>
              </TouchableOpacity>
              {/* Settings */}
              <TouchableOpacity
                style={s.settingsBtn}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <Text style={s.settingsIco}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar + info */}
          <View style={s.avatarSection}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('UserProfile', {
                  targetUserId: userId, // apna userId
                  userId: userId,
                  imageUrl: avatar,
                  isOwnProfile: true,
                  // coords not needed for own profile
                })
              }
              activeOpacity={0.9}
              style={s.avatarWrap}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={s.avatar} />
              ) : (
                <LinearGradient
                  colors={['#FFC2CD', '#B90034']}
                  style={s.avatar}
                >
                  <Text style={s.avatarInitial}>{name[0]?.toUpperCase()}</Text>
                </LinearGradient>
              )}
              {/* Edit pencil badge */}
              <View style={s.editBadge}>
                <Text style={s.editBadgeIco}>✏️</Text>
              </View>
            </TouchableOpacity>

            {/* Name + age + edit */}
            <View style={s.profileInfo}>
              <Text style={s.profileName}>
                {name}
                {age ? `, ${age}` : ''}
              </Text>
              <TouchableOpacity
                style={s.editProfileBtn}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.8}
              >
                <Text style={s.editProfileTxt}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Premium Cards (horizontal scroll) ────────────────────── */}
        <View style={s.cardsSection}>
          <FlatList
            data={CARDS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={s.cardsContent}
            snapToInterval={CARD_W + 12}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <PremiumCard card={item} onPress={() => handleCardPress(item)} />
            )}
          />
        </View>

        {/* ── More Services ─────────────────────────────────────────── */}
        <View style={s.servicesSection}>
          <Text style={s.servicesLabel}>More services</Text>

          <View style={s.servicesCard}>
            <StatRow
              emoji="❤️"
              title="See Who Likes Me"
              sub={`${likeCount} people like you`}
              count={likeCount}
              onPress={() => navigation.navigate('likedme')}
              entering={FadeInDown.delay(100).duration(300)}
            />
            <View style={s.rowDiv} />
            <StatRow
              emoji="👀"
              title="Who Viewed Me"
              sub="See who viewed your profile"
              count={viewCount}
              onPress={() => navigation.navigate('Visitors')}
              entering={FadeInDown.delay(150).duration(300)}
            />
            <View style={s.rowDiv} />
            <StatRow
              emoji="📍"
              title="Nearby"
              sub="People near you right now"
              count={0}
              onPress={() => navigation.navigate('Nearby')}
              entering={FadeInDown.delay(200).duration(300)}
            />
            <View style={s.rowDiv} />
            <StatRow
              emoji="✨"
              title="Daily New"
              sub="Fresh profiles every day"
              count={0}
              onPress={() => navigation.navigate('Daily')}
              entering={FadeInDown.delay(250).duration(300)}
            />
          </View>
        </View>
      </ScrollView>

      <SuperlikeModal
        visible={showSuperlike}
        onClose={() => setShowSuperlike(false)}
      />
      <BoostModal visible={showBoost} onClose={() => setShowBoost(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0EB' },
  scroll: { paddingBottom: 40 },

  // ── Header ──
  topSection: {
    backgroundColor: '#F5F0EB',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'Nunito-Bold',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  verifyIco: { fontSize: 12, color: '#0EA5E9' },
  verifyTxt: { fontSize: 12, fontWeight: '700', color: '#0EA5E9' },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIco: { fontSize: 18 },

  // ── Avatar section ──
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E0E8',
  },
  avatarInitial: { fontSize: 32, color: '#fff', fontWeight: '800' },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  editBadgeIco: { fontSize: 12 },

  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'Nunito-Bold',
  },
  editProfileBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2D8E8',
  },
  editProfileTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B90034',
  },

  // ── Cards ──
  cardsSection: { marginTop: 4, marginBottom: 16 },
  cardsContent: { paddingHorizontal: 16, gap: 12 },
  cardWrap: {
    width: CARD_W,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardBadgeTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardEmoji: { fontSize: 32, marginTop: 8 },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 4 },
  cardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  cardBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  cardBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Services ──
  servicesSection: { paddingHorizontal: 16 },
  servicesLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servicesCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statEmoji: { fontSize: 24 },
  statTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  statSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBadge: {
    backgroundColor: '#B90034',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  statBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  statChevron: { fontSize: 22, color: '#CBD5E1' },
  rowDiv: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 18,
  },
});

// Modal styles
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIco: { fontSize: 24 },
  planTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  planTag: {
    fontSize: 10,
    color: '#B90034',
    fontWeight: '700',
    backgroundColor: '#FFE4EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  planPriceBtn: {
    backgroundColor: '#B90034',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  planPrice: { color: '#fff', fontWeight: '800', fontSize: 14 },
  closeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  closeTxt: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
});
