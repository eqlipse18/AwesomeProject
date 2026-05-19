// screens/VerifyScreen.js
import React, { useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { AuthContext } from '../AuthContex';

const { width: W, height: H } = Dimensions.get('window');

// ── Floating bg icon ──────────────────────────────────────────────────────────
const FloatingIcon = ({ x, y, size, delay, emoji }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.18, { duration: 600 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          fontSize: size,
        },
        style,
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

// BG icons layout — scattered naturally
const BG_ICONS = [
  { x: 20, y: 80, size: 28, delay: 0, emoji: '✅' },
  { x: W - 60, y: 110, size: 22, delay: 200, emoji: '🛡️' },
  { x: 50, y: 200, size: 18, delay: 400, emoji: '✅' },
  { x: W - 80, y: 250, size: 30, delay: 100, emoji: '✅' },
  { x: 30, y: 360, size: 24, delay: 300, emoji: '🛡️' },
  { x: W - 50, y: 400, size: 20, delay: 500, emoji: '✅' },
  { x: 80, y: 480, size: 26, delay: 150, emoji: '✅' },
  { x: W - 100, y: 520, size: 18, delay: 350, emoji: '🛡️' },
  { x: 20, y: 580, size: 22, delay: 250, emoji: '✅' },
  { x: W - 60, y: 600, size: 28, delay: 450, emoji: '✅' },
  { x: 100, y: 680, size: 20, delay: 180, emoji: '🛡️' },
  { x: W - 120, y: 700, size: 24, delay: 320, emoji: '✅' },
];

// ── Main image with floating animation ───────────────────────────────────────
const HeroImage = ({ avatar }) => {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue('-4deg');
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Entry
    scale.value = withSpring(1, { damping: 16, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 500 });
    rotate.value = withSpring('0deg', { damping: 18, stiffness: 160 });

    // Idle float
    setTimeout(() => {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-10, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }, 800);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: rotate.value },
      { translateY: floatY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.heroWrap, style]}>
      {/* Image */}
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.heroImg} />
      ) : (
        <LinearGradient
          colors={['#FFC2CD', '#B90034']}
          style={styles.heroImg}
        />
      )}

      {/* Verified badge bottom center */}
      <View style={styles.verifiedBadge}>
        <LinearGradient
          colors={['#60A5FA', '#3B82F6']}
          style={styles.badgeGradient}
        >
          <Text style={styles.badgeEmoji}>✅</Text>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

// ── Screen 1 ──────────────────────────────────────────────────────────────────
export default function VerifyScreen({ navigation }) {
  const { userImage } = useContext(AuthContext);
  const avatar = userImage || null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Text style={styles.closeTxt}>✕</Text>
      </TouchableOpacity>

      {/* Floating bg icons */}
      {BG_ICONS.map((icon, i) => (
        <FloatingIcon key={i} {...icon} />
      ))}

      {/* Hero image */}
      <View style={styles.heroSection}>
        <HeroImage avatar={avatar} />
      </View>

      {/* Bottom content */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(500).springify().damping(18)}
        style={styles.bottomSection}
      >
        <Text style={styles.title}>Verify your Profile 🔐</Text>
        <Text style={styles.sub}>
          Take a quick selfie to verify it's really you. Verified profiles get{' '}
          <Text style={styles.subBold}>2x more matches</Text> and make everyone
          feel safer! 💪
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('VerifySelfie')}
        >
          <LinearGradient
            colors={['#FF0059', '#FF5289']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTxt}>Verify Me 🤳</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.privacy}>
          🔒 Your selfie is never stored or shared
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0EB',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeTxt: { fontSize: 14, color: '#0F172A', fontWeight: '700' },

  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  heroImg: {
    width: W * 0.62,
    height: W * 0.75,
    borderRadius: 28,
    backgroundColor: '#E8E0E8',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -22,
    alignSelf: 'center',
  },
  badgeGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeEmoji: { fontSize: 28 },

  bottomSection: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
  },
  subBold: { color: '#FF0059', fontWeight: '700' },

  cta: {
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaTxt: { fontSize: 17, color: '#fff', fontWeight: '800' },

  privacy: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
});
