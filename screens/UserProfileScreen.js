/**
 * UserProfileScreen — Pink theme redesign
 * - Photos moved above details
 * - Touchable detail cards with pink accent
 * - Clean section headers
 * - Subtle pink background
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
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  InteractionManager,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated';
import axios from 'axios';
import Config from 'react-native-config';
import { AuthContext } from '../AuthContex';
import { useMyLocation } from '../LocationContext';
import { formatLastActive } from '../src/hooks/useOnlineStatus';
import { getLocationDisplay } from '../utils/locationUtils';
import { useRequests } from '../src/hooks/useRequests';
import { useFocusEffect } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('screen');
const IMAGE_HEIGHT = H * 0.52;
const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const createApiClient = token =>
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

// ════════════════════════════════════════════════════════════════════════════
// IMAGE PREVIEW MODAL — unchanged
// ════════════════════════════════════════════════════════════════════════════
const ImagePreviewModal = ({ visible, images, startIndex, onClose }) => {
  const flatRef = useRef(null);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={ps.container}>
        <SafeAreaView style={ps.closeWrapper}>
          <TouchableOpacity onPress={onClose} style={ps.closeBtn}>
            <Text style={ps.closeIcon}>✕</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <FlatList
          ref={flatRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({
            length: W,
            offset: W * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={ps.imageWrapper}>
              <Image
                source={{ uri: item }}
                style={ps.image}
                resizeMode="contain"
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
};
const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  closeWrapper: { position: 'absolute', top: 0, right: 0, zIndex: 10 },
  closeBtn: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  imageWrapper: {
    width: W,
    height: H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: W, height: H * 0.85 },
});

// ════════════════════════════════════════════════════════════════════════════
// SUB COMPONENTS — redesigned
// ════════════════════════════════════════════════════════════════════════════

// Touchable info card with pink left accent
const InfoCard = ({ icon, label, value, onPress }) => {
  if (!value) return null;
  const Inner = (
    <View style={s.infoCard}>
      <View style={s.infoCardAccent} />
      <View style={s.infoCardIcon}>
        <Text style={s.infoIconTxt}>{icon}</Text>
      </View>
      <View style={s.infoCardBody}>
        <Text style={s.infoCardLabel}>{label}</Text>
        <Text style={s.infoCardValue}>{value}</Text>
      </View>
      {onPress && <Text style={s.infoCardArrow}>›</Text>}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
};

// Section header — pill style
const SectionHeader = ({ title, emoji }) => (
  <View style={s.sectionRow}>
    {emoji && <Text style={s.sectionEmoji}>{emoji}</Text>}
    <Text style={s.sectionTitle}>{title}</Text>
    <View style={s.sectionLine} />
  </View>
);

const HobbyChip = ({ label }) => (
  <View style={s.chip}>
    <Text style={s.chipText}>{label}</Text>
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════
export default function UserProfileScreen({ navigation, route }) {
  const {
    userId,
    targetUserId,
    isOwnProfile = false,
    imageUrl: transitionImageUrl,
    name: routeName = '', // ← ADD
    image: routeImage = null,
    targetLat = null,
    targetLng = null,
    targetHometown = null,
    originX = 0,
    originY = 0,
    originWidth = W,
    originHeight = IMAGE_HEIGHT,
  } = route.params;

  const profileUserId = userId || targetUserId;
  const { token } = useContext(AuthContext);
  const myLocation = useMyLocation();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const [reqState, setReqState] = useState('idle');

  const displayName = profile?.firstName || routeName || 'User';
  const displayImage =
    profile?.imageUrls?.[0] || routeImage || transitionImageUrl || null;

  const scrollY = useSharedValue(0);
  const apiClient = useRef(createApiClient(token));
  const heroX = useSharedValue(originX);
  const heroY = useSharedValue(originY);
  const heroW = useSharedValue(originWidth);
  const heroH = useSharedValue(originHeight);
  const heroBR = useSharedValue(20);
  const contentOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  const [profileStatus, setProfileStatus] = useState({
    iLiked: false,
    iSuperliked: false,
    hasLikedMe: false,
    hasSuperlikedMe: false,
    isMatched: false,
    matchId: null,
  });
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    const inter = InteractionManager.runAfterInteractions(() => {
      const cfg = { damping: 28, stiffness: 200, mass: 0.8 };
      bgOpacity.value = withTiming(1, { duration: 180 });
      heroX.value = withSpring(0, cfg);
      heroY.value = withSpring(0, cfg);
      heroW.value = withSpring(W, cfg);
      heroH.value = withSpring(IMAGE_HEIGHT, cfg);
      heroBR.value = withSpring(0, cfg);
      contentOpacity.value = withTiming(1, { duration: 350 });
    });
    return () => inter.cancel();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const resp = await apiClient.current.post('/get-user-by-id', {
          userId: targetUserId,
        });
        if (resp.data.success) {
          setProfile(resp.data.user);
          setDataReady(true);
        } else setError('Profile not found');
      } catch (e) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [targetUserId]);

  // ── Fetch status — after existing fetchProfile useEffect ──────────────────
  useEffect(() => {
    if (!profileUserId || isOwnProfile) {
      setStatusLoaded(true);
      return;
    }
    apiClient.current
      .get(`/check-status/${profileUserId}`)
      .then(r => {
        if (r.data.success) setProfileStatus(r.data);
      })
      .catch(e => console.warn('[UserProfile] checkStatus:', e.message))
      .finally(() => setStatusLoaded(true));
  }, [profileUserId, isOwnProfile]);

  const locationDisplay = useMemo(() => {
    return getLocationDisplay(myLocation, {
      hometown: profile?.hometown || targetHometown,
      lat: targetLat,
      lng: targetLng,
    });
  }, [myLocation, profile?.hometown, targetHometown, targetLat, targetLng]);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });

  const heroStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroX.value,
    top: heroY.value,
    width: heroW.value,
    height: heroH.value,
    borderRadius: heroBR.value,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    zIndex: 5,
  }));

  const heroScrollStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, IMAGE_HEIGHT],
          [0, -IMAGE_HEIGHT * 0.35],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      scrollY.value,
      [0, IMAGE_HEIGHT * 0.55],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const backBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, IMAGE_HEIGHT * 0.35],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleLike = useCallback(async () => {
    if (!profile || actionDone) return;
    try {
      setActionLoading(true);
      await apiClient.current.post('/swipe', {
        likedId: profile.userId,
        type: 'like',
      });
      setActionDone('liked');
    } catch (e) {
      console.error('[UserProfile] Like:', e.message);
    } finally {
      setActionLoading(false);
    }
  }, [profile, actionDone]);

  const openPreview = useCallback(index => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  const { sendRequest } = useRequests();
  const handleSendRequest = useCallback(async () => {
    if (reqState !== 'idle') return;
    setReqState('sending');
    const result = await sendRequest(profileUserId, false);
    if (result.success || result.alreadySent) setReqState('sent');
    else {
      setReqState('error');
      setTimeout(() => setReqState('idle'), 2000);
    }
  }, [reqState, profileUserId, sendRequest]);

  if (!profileUserId || error) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>
          {error ? '⚠️' : '😕'}
        </Text>
        <Text style={s.errorTitle}>
          {error ? 'Something went wrong' : 'Profile not found'}
        </Text>
        <TouchableOpacity
          style={s.retryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={s.retryTxt}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const fetchStatus = useCallback(() => {
    if (!profileUserId || isOwnProfile) {
      setStatusLoaded(true);
      return;
    }
    apiClient.current
      .get(`/check-status/${profileUserId}`)
      .then(r => {
        if (r.data.success) setProfileStatus(r.data);
      })
      .catch(e => console.warn('[UserProfile] checkStatus:', e.message))
      .finally(() => setStatusLoaded(true));
  }, [profileUserId, isOwnProfile]);

  // Focus pe refetch
  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [fetchStatus]),
  );

  // HomeScreen se like aaya → refetch
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'user_liked',
      ({ likedUserId }) => {
        if (likedUserId === profileUserId) fetchStatus();
      },
    );
    return () => sub.remove();
  }, [profileUserId, fetchStatus]);

  const allImages = profile?.imageUrls || [];
  const primaryImage = allImages[0] || transitionImageUrl;
  const age = profile?.ageForSort || profile?.age;
  const hobbies = profile?.hobbies || [];
  const extraPhotos = allImages.slice(1);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, s.rootBg, bgStyle]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Hero Image ── */}
      <Animated.View style={[heroStyle, heroScrollStyle]}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={StyleSheet.absoluteFillObject}
          onPress={() => openPreview(0)}
        >
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={s.heroImage} />
          ) : (
            <View style={[s.heroImage, s.imageFallback]}>
              <Text style={{ fontSize: 64 }}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <LinearGradient
          colors={['rgba(0,0,0,0.28)', 'transparent', 'rgba(0,0,0,0.18)']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        {/* Photo count pill */}
        {allImages.length > 1 && (
          <View style={s.photoCountPill}>
            <Text style={s.photoCountTxt}>📷 {allImages.length} photos</Text>
          </View>
        )}
      </Animated.View>

      {/* ── Back Button ── */}
      <Animated.View style={[s.backBtnWrapper, backBtnStyle]}>
        <SafeAreaView>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* ── Scrollable Sheet ── */}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={{ zIndex: 10 }}
        contentContainerStyle={{ paddingTop: IMAGE_HEIGHT - 32 }}
      >
        <Animated.View
          style={[
            s.sheet,
            contentStyle,
            !dataReady && {
              backgroundColor: 'transparent',
              shadowOpacity: 0,
              elevation: 0,
            },
          ]}
        >
          {loading ? (
            <View style={s.sheetLoading}>
              <ActivityIndicator size="large" color="#FF0059" />
            </View>
          ) : (
            <>
              {/* ── Action Buttons ── */}
              {!isOwnProfile && statusLoaded && (
                <View style={s.actionRow}>
                  {profileStatus.isMatched ? (
                    // Matched → Chat
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        { backgroundColor: '#22C55E', flex: 1 },
                      ]}
                      onPress={() =>
                        navigation.navigate('Conversation', {
                          matchId: profileStatus.matchId,
                          targetUserId: profileUserId,
                          name: displayName,
                          image: displayImage,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={s.actionBtnIcon}>💬</Text>
                      <Text style={s.actionBtnText}>Start Chat</Text>
                    </TouchableOpacity>
                  ) : (
                    // Normal Like OR Like Back — dono same button, label alag
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        s.likeBtn,
                        { flex: 1 },
                        actionDone === 'liked' && s.actionBtnDone,
                      ]}
                      onPress={handleLike}
                      disabled={!!actionDone || actionLoading}
                      activeOpacity={0.85}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={s.actionBtnIcon}>
                            {actionDone === 'liked'
                              ? '✓'
                              : profileStatus.hasLikedMe
                              ? '❤️'
                              : '🔥'}{' '}
                          </Text>
                          <Text style={s.actionBtnText}>
                            {actionDone === 'liked'
                              ? 'Liked!'
                              : profileStatus.hasLikedMe
                              ? 'Like Back' // ← only when they liked
                              : 'Like Profile'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Message Request — sirf tab jab matched nahi ──────────────────── */}
                  {!profileStatus.isMatched && (
                    <TouchableOpacity
                      style={[
                        s.requestBtn,
                        reqState === 'sent' && s.requestBtnSent,
                        reqState === 'sending' && s.requestBtnLoading,
                        reqState === 'error' && s.requestBtnError,
                      ]}
                      onPress={handleSendRequest}
                      disabled={reqState !== 'idle'}
                      activeOpacity={0.85}
                    >
                      <Text style={s.requestBtnTxt}>
                        {reqState === 'idle' && '💌 Request'}
                        {reqState === 'sending' && '⏳'}
                        {reqState === 'sent' && '✓ Sent'}
                        {reqState === 'error' && '✕'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!isOwnProfile && profileStatus.hasSuperlikedMe && (
                <View style={s.superlikedBanner}>
                  <Text style={s.superlikedBannerTxt}>
                    ⭐ This person superliked you!
                  </Text>
                </View>
              )}

              {isOwnProfile && (
                <TouchableOpacity
                  style={s.editOwnBtn}
                  onPress={() => navigation.navigate('EditProfile')}
                  activeOpacity={0.85}
                >
                  <Text style={s.editOwnIco}>✏️</Text>
                  <Text style={s.editOwnTxt}>Edit Profile</Text>
                </TouchableOpacity>
              )}

              {/* ── Name + Online ── */}
              <View style={s.nameSection}>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name}>
                      {profile?.firstName || profile?.fullName}
                    </Text>
                    {age ? <Text style={s.age}>{age}</Text> : null}
                    {profile?.isVerified && (
                      <View style={s.verifiedBadge}>
                        <Text style={s.verifiedTxt}>✓</Text>
                      </View>
                    )}
                  </View>
                  {profile?.jobTitle ? (
                    <Text style={s.jobTitle}>💼 {profile.jobTitle}</Text>
                  ) : null}
                </View>
                <View style={s.onlinePill}>
                  <View
                    style={[
                      s.onlineDot,
                      {
                        backgroundColor: profile?.isOnline
                          ? '#22C55E'
                          : '#94A3B8',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      s.onlineTxt,
                      { color: profile?.isOnline ? '#22C55E' : '#94A3B8' },
                    ]}
                  >
                    {profile?.isOnline
                      ? 'Online'
                      : formatLastActive(profile?.lastActiveAt)}
                  </Text>
                </View>
              </View>

              {/* ── Goals chip ── */}
              {profile?.goals && (
                <View style={s.goalChip}>
                  <Text style={s.goalChipText}>
                    {profile.goals === 'Short-term Fun'
                      ? '⚡ Short-term Fun'
                      : profile.goals === 'Long-term'
                      ? '💍 Long-term'
                      : profile.goals === 'Friends'
                      ? '🤝 Friends'
                      : `✨ ${profile.goals}`}
                  </Text>
                </View>
              )}

              <View style={s.divider} />

              {/* ── MORE PHOTOS — moved above details ── */}
              {extraPhotos.length > 0 && (
                <>
                  <SectionHeader title="Photos" emoji="📸" />
                  <View style={s.photoGrid}>
                    {extraPhotos.map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.88}
                        onPress={() => openPreview(i + 1)}
                        style={s.gridPhotoWrap}
                      >
                        <Image source={{ uri: url }} style={s.gridPhoto} />
                        <LinearGradient
                          colors={['transparent', 'rgba(255,0,89,0.18)']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <View style={s.expandHint}>
                          <Text style={s.expandIcon}>⤢</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.divider} />
                </>
              )}

              {/* ── Details — touchable cards ── */}
              <SectionHeader title="Details" emoji="✦" />
              <View style={s.infoGrid}>
                <InfoCard
                  icon="📍"
                  label="Hometown"
                  value={locationDisplay || profile?.hometown}
                />
                <InfoCard icon="📏" label="Height" value={profile?.height} />
                <InfoCard
                  icon="🎂"
                  label="Age"
                  value={age ? `${age} years` : null}
                />
                <InfoCard icon="🧬" label="Gender" value={profile?.gender} />
                <InfoCard
                  icon="🍷"
                  label="Drinks"
                  value={
                    profile?.drink !== 'Never' ? profile?.drink : 'Non-drinker'
                  }
                />
                <InfoCard
                  icon="🚬"
                  label="Smokes"
                  value={
                    profile?.smoke !== 'Never' ? profile?.smoke : 'Non-smoker'
                  }
                />
              </View>

              <View style={s.divider} />

              {/* ── Hobbies ── */}
              {hobbies.length > 0 && (
                <>
                  <SectionHeader title="Interests" emoji="🎯" />
                  <View style={s.chipRow}>
                    {hobbies.map((h, i) => (
                      <HobbyChip key={i} label={h} />
                    ))}
                  </View>
                  <View style={s.divider} />
                </>
              )}

              <View style={{ height: 48 }} />
            </>
          )}
        </Animated.View>
      </Animated.ScrollView>

      <ImagePreviewModal
        visible={previewVisible}
        images={allImages.length > 0 ? allImages : [transitionImageUrl]}
        startIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  rootBg: { backgroundColor: '#FFF5F7' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
  },
  sheetLoading: { height: 200, justifyContent: 'center', alignItems: 'center' },

  // Hero
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageFallback: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountPill: {
    position: 'absolute',
    bottom: 46,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Back button
  backBtnWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  backBtn: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: '#fff', marginTop: -1 },

  // Sheet
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 26,
    minHeight: H * 0.65,
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 10,
  },

  // Action buttons
  // ═══════════ Action buttons ═══════════

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  actionBtn: {
    minHeight: 58,
    borderRadius: 20,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  // Main pink/red CTA
  likeBtn: {
    flex: 1,
    backgroundColor: '#FF2E63',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',

    overflow: 'hidden',
  },

  // Already liked state
  actionBtnDone: {
    backgroundColor: '#2A2A2A',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',

    opacity: 0.82,
  },

  actionBtnIcon: {
    fontSize: 17,
    marginTop: -1,
  },

  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ═══════════ Request button ═══════════

  requestBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#FFD6E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  requestBtnTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF2E63',
    letterSpacing: 0.2,
  },

  requestBtnSent: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
  },

  requestBtnLoading: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },

  requestBtnError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  // ═══════════ Superliked banner ═══════════

  superlikedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'rgba(255,215,0,0.10)',

    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.28)',

    borderRadius: 16,

    paddingHorizontal: 16,
    paddingVertical: 12,

    marginBottom: 18,
  },

  superlikedBannerTxt: {
    color: '#E6B800',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  editOwnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFF1F5',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    marginBottom: 22,
  },
  editOwnIco: { fontSize: 16 },
  editOwnTxt: { fontSize: 15, fontWeight: '700', color: '#FF0059' },

  // Name section
  nameSection: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  age: { fontSize: 24, fontWeight: '500', color: '#64748B' },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  jobTitle: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineTxt: { fontSize: 12, fontWeight: '600' },

  // Goals
  goalChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 4,
  },
  goalChipText: { color: '#FF0059', fontWeight: '700', fontSize: 14 },

  divider: { height: 1, backgroundColor: '#FFF0F3', marginVertical: 18 },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionEmoji: { fontSize: 15 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF0059',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#FFE4EC' },

  // Info cards — touchable with pink left accent
  infoGrid: { gap: 10 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8FA',
    borderRadius: 14,
    paddingVertical: 12,
    paddingRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE4EC',
  },
  infoCardAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: '#FF0059',
    borderRadius: 2,
    marginRight: 12,
  },
  infoCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF1F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIconTxt: { fontSize: 17 },
  infoCardBody: { flex: 1 },
  infoCardLabel: {
    fontSize: 10,
    color: '#FF8FAB',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  infoCardArrow: { fontSize: 20, color: '#FECDD3', fontWeight: '300' },

  // Hobby chips — pink tint
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#FFF1F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  chipText: { fontSize: 13, color: '#FF0059', fontWeight: '600' },

  // Photo grid — above details
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridPhotoWrap: {
    width: (W - 44 - 8) / 2,
    height: ((W - 44 - 8) / 2) * 1.3,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  gridPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  expandHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,0,89,0.35)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIcon: { color: '#fff', fontSize: 13 },

  // Error
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#FF0059',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
