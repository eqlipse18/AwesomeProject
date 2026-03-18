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
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  InteractionManager,
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
  Easing,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import axios from 'axios';
import Config from 'react-native-config';
import { AuthContext } from '../AuthContex';
import { formatLastActive } from '../src/hooks/useOnlineStatus';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.52;
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
// IMAGE PREVIEW MODAL
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
      <View style={previewStyles.container}>
        <SafeAreaView style={previewStyles.closeWrapper}>
          <TouchableOpacity onPress={onClose} style={previewStyles.closeBtn}>
            <Text style={previewStyles.closeIcon}>✕</Text>
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
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={previewStyles.imageWrapper}>
              <Image
                source={{ uri: item }}
                style={previewStyles.image}
                resizeMode="contain"
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
};

const previewStyles = StyleSheet.create({
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 },
});

// ════════════════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const InfoRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
};

const HobbyChip = ({ label }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const SectionHeader = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function UserProfileScreen({ navigation, route }) {
  const {
    targetUserId,
    imageUrl: transitionImageUrl,
    originX = 0,
    originY = 0,
    originWidth = SCREEN_WIDTH,
    originHeight = IMAGE_HEIGHT,
  } = route.params;

  const { token } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [heroReady, setHeroReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const scrollY = useSharedValue(0);
  const apiClient = useRef(createApiClient(token));

  // ── Hero animation shared values ──
  const heroX = useSharedValue(originX);
  const heroY = useSharedValue(originY);
  const heroW = useSharedValue(originWidth);
  const heroH = useSharedValue(originHeight);
  const heroBorderRadius = useSharedValue(20);
  const contentOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  // ── Run hero expand animation ──
  useEffect(() => {
    // ✅ Navigation transition complete hone ke baad animate karo
    const interaction = InteractionManager.runAfterInteractions(() => {
      const springConfig = { damping: 28, stiffness: 200, mass: 0.8 };

      bgOpacity.value = withTiming(1, { duration: 180 });
      heroX.value = withSpring(0, springConfig);
      heroY.value = withSpring(0, springConfig);
      heroW.value = withSpring(SCREEN_WIDTH, springConfig);
      heroH.value = withSpring(IMAGE_HEIGHT, springConfig);
      heroBorderRadius.value = withSpring(0, springConfig);
      contentOpacity.value = withTiming(1, { duration: 350 });
    });

    return () => interaction.cancel();
  }, []);

  // ── Fetch profile ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const resp = await apiClient.current.post('/get-user-by-id', {
          userId: targetUserId,
        });
        if (resp.data.success) {
          setProfile(resp.data.user);
          setDataReady(true); // ✅
        } else {
          setError('Profile not found');
        }
      } catch (e) {
        setError(e.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetUserId]);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });

  // ── Hero animated style (expansion) ──
  const heroStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroX.value,
    top: heroY.value,
    width: heroW.value,
    height: heroH.value,
    borderRadius: heroBorderRadius.value,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 5,
  }));

  // ── Parallax + fade on scroll (after expansion) ──
  const heroScrollStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, IMAGE_HEIGHT],
      [0, -IMAGE_HEIGHT * 0.35],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [0, IMAGE_HEIGHT * 0.55],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }], opacity };
  });

  // ── Back button fade ──
  const backBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, IMAGE_HEIGHT * 0.35],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // ── Background + content opacity ──
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
      console.error('[UserProfile] Like error:', e.message);
    } finally {
      setActionLoading(false);
    }
  }, [profile, actionDone]);

  const handleMessageRequest = useCallback(() => {
    setActionDone('requested');
  }, []);

  const openPreview = useCallback(index => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  // ── Error state ──
  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorTitle}>Profile not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const allImages = profile?.imageUrls || [];
  const primaryImage = allImages[0] || transitionImageUrl;
  const age = profile?.ageForSort || profile?.age;
  const hobbies = profile?.hobbies || [];

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.rootBg, bgStyle]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Hero Image — expands from card position ── */}
      <Animated.View style={[heroStyle, heroScrollStyle]}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={StyleSheet.absoluteFillObject}
          onPress={() => openPreview(0)}
        >
          {transitionImageUrl || primaryImage ? (
            <Image
              source={{ uri: primaryImage || transitionImageUrl }}
              style={styles.heroImage}
            />
          ) : (
            <View style={[styles.heroImage, styles.imageFallback]}>
              <Text style={{ fontSize: 64 }}>📷</Text>
            </View>
          )}
        </TouchableOpacity>

        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.15)']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </Animated.View>

      {/* ── Back Button ── */}
      <Animated.View style={[styles.backBtnWrapper, backBtnStyle]}>
        <SafeAreaView>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
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
        contentContainerStyle={{ paddingTop: IMAGE_HEIGHT - 28 }}
      >
        <Animated.View
          style={[
            styles.sheet,
            contentStyle,
            !dataReady && {
              backgroundColor: 'transparent',
              shadowOpacity: 0,
              elevation: 0,
            },
          ]}
        >
          {loading ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator size="large" color="#FF0059" />
            </View>
          ) : (
            <>
              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.likeBtn,
                    actionDone === 'liked' && styles.actionBtnDone,
                  ]}
                  onPress={handleLike}
                  disabled={!!actionDone || actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.actionBtnIcon}>
                        {actionDone === 'liked' ? '✓' : '🔥'}
                      </Text>
                      <Text style={styles.actionBtnText}>
                        {actionDone === 'liked' ? 'Liked!' : 'Like Profile'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.msgBtn,
                    actionDone === 'requested' && styles.actionBtnDone,
                  ]}
                  onPress={handleMessageRequest}
                  disabled={!!actionDone}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionBtnIcon}>
                    {actionDone === 'requested' ? '✓' : '💬'}
                  </Text>
                  <Text style={styles.actionBtnText}>
                    {actionDone === 'requested' ? 'Requested!' : 'Message'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Name */}
              <View style={styles.nameSection}>
                {/* Left side — name + job */}
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>
                      {profile?.firstName || profile?.fullName}
                    </Text>
                    {age ? <Text style={styles.age}>{age}</Text> : null}
                    {profile?.isVerified && (
                      <Text style={styles.verifiedBadge}>✓</Text>
                    )}
                  </View>
                  {profile?.jobTitle ? (
                    <Text style={styles.jobTitle}>💼 {profile.jobTitle}</Text>
                  ) : null}
                </View>

                {/* ✅ Right side — online status */}
                <View style={styles.onlineRow}>
                  <View
                    style={[
                      styles.onlineDot,
                      {
                        backgroundColor: profile?.isOnline
                          ? '#22C55E'
                          : '#94A3B8',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.onlineText,
                      { color: profile?.isOnline ? '#22C55E' : '#94A3B8' },
                    ]}
                  >
                    {profile?.isOnline
                      ? 'Online'
                      : formatLastActive(profile?.lastActiveAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Goals */}
              {profile?.goals ? (
                <>
                  <SectionHeader title="Looking for" />
                  <View style={styles.goalChip}>
                    <Text style={styles.goalChipText}>
                      {profile.goals === 'Short-term Fun'
                        ? '⚡ Short-term Fun'
                        : profile.goals === 'Long-term'
                        ? '💍 Long-term'
                        : profile.goals === 'Friends'
                        ? '🤝 Friends'
                        : `✨ ${profile.goals}`}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                </>
              ) : null}

              {/* Details */}
              <SectionHeader title="Details" />
              <View style={styles.infoGrid}>
                <InfoRow icon="📍" label="Hometown" value={profile?.hometown} />
                <InfoRow icon="📏" label="Height" value={profile?.height} />
                <InfoRow
                  icon="🎂"
                  label="Age"
                  value={age ? `${age} years` : null}
                />
                <InfoRow icon="🧬" label="Gender" value={profile?.gender} />
                <InfoRow
                  icon="🍷"
                  label="Drinks"
                  value={
                    profile?.drink !== 'Never' ? profile?.drink : 'Non-drinker'
                  }
                />
                <InfoRow
                  icon="🚬"
                  label="Smokes"
                  value={
                    profile?.smoke !== 'Never' ? profile?.smoke : 'Non-smoker'
                  }
                />
              </View>

              <View style={styles.divider} />

              {/* Hobbies */}
              {hobbies.length > 0 ? (
                <>
                  <SectionHeader title="Hobbies & Interests" />
                  <View style={styles.chipRow}>
                    {hobbies.map((h, i) => (
                      <HobbyChip key={i} label={h} />
                    ))}
                  </View>
                  <View style={styles.divider} />
                </>
              ) : null}

              {/* More Photos */}
              {allImages.length > 1 ? (
                <>
                  <SectionHeader title="More Photos" />
                  <View style={styles.photoGrid}>
                    {allImages.slice(1).map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.88}
                        onPress={() => openPreview(i + 1)}
                      >
                        <Image source={{ uri: url }} style={styles.gridPhoto} />
                        <View style={styles.expandHint}>
                          <Text style={styles.expandIcon}>⤢</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={{ height: 48 }} />
            </>
          )}
        </Animated.View>
      </Animated.ScrollView>

      {/* Preview Modal */}
      <ImagePreviewModal
        visible={previewVisible}
        images={allImages.length > 0 ? allImages : [transitionImageUrl]}
        startIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rootBg: { backgroundColor: '#F8FAFC' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  sheetLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageFallback: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    minHeight: SCREEN_HEIGHT * 0.65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  likeBtn: { backgroundColor: '#FF0059' },
  msgBtn: { backgroundColor: '#1E293B' },
  actionBtnDone: { backgroundColor: '#10B981' },
  actionBtnIcon: { fontSize: 16 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  nameSection: {
    marginBottom: 16,
    flexDirection: 'row', // ✅ row layout
    alignItems: 'flex-start',
    justifyContent: 'space-between', // ✅ name left, status right
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
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#3B82F6',
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  jobTitle: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  goalChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  goalChipText: { color: '#FF0059', fontWeight: '700', fontSize: 14 },
  infoGrid: { gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    marginTop: 1,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridPhoto: {
    width: (SCREEN_WIDTH - 48 - 8) / 2,
    height: ((SCREEN_WIDTH - 48 - 8) / 2) * 1.3,
    borderRadius: 16,
    resizeMode: 'cover',
    backgroundColor: '#F1F5F9',
  },
  expandHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIcon: { color: '#fff', fontSize: 13 },
  errorEmoji: { fontSize: 56, marginBottom: 16 },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },

  onlineRow: {
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
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#FF0059',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
