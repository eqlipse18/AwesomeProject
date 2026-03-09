/**
 * Match Modal Component - PREMIUM VERSION
 *
 * Features:
 * - Smooth scale + fade entrance animation
 * - Hearts_feedback.lottie overlay floating on modal
 * - Beautiful, polished UI
 * - match.json in center
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Match Modal Component
 */
export const MatchModal = ({
  visible,
  user1,
  user2,
  onKeepSwiping,
  onLetsChat,
}) => {
  // Animation shared values
  const modalScale = useSharedValue(0);
  const modalOpacity = useSharedValue(0);
  const heartsOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset animations
      modalScale.value = 0;
      modalOpacity.value = 0;
      heartsOpacity.value = 0;

      // Entrance animation: scale + fade
      modalScale.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.back(1.3)), // Bounce effect
      });

      modalOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.linear,
      });

      // Hearts fade in after modal
      heartsOpacity.value = withDelay(
        300,
        withTiming(1, {
          duration: 400,
          easing: Easing.linear,
        }),
      );
    }
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const heartsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heartsOpacity.value,
  }));

  if (!visible || !user1 || !user2) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onKeepSwiping}
    >
      {/* Dark Background */}
      <View style={styles.overlay}>
        {/* Hearts Particles Overlay - Behind Modal */}
        <Animated.View style={[styles.heartsOverlay, heartsAnimatedStyle]}>
          <LottieView
            source={require('../../../assets/animations/Hearts_feedback.json')}
            autoPlay
            loop
            speed={0.8}
            style={styles.heartsLottie}
          />
        </Animated.View>

        {/* Modal Card with Entrance Animation */}
        <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
          <LinearGradient
            colors={['#FFFFFF', '#F5F5F5']}
            style={styles.gradientContainer}
          >
            {/* Title */}
            <View style={styles.titleSection}>
              <Text style={styles.titleText}>It's a Match! 🔥</Text>
              <Text style={styles.subtitleText}>You two liked each other!</Text>
            </View>

            {/* Center Section - Match Animation + Photos */}
            <View style={styles.centerSection}>
              {/* Left Photo */}
              <View style={[styles.photoWrapper, styles.leftPhoto]}>
                <Image source={{ uri: user1.image }} style={styles.photo} />
                <View style={styles.nameBadge}>
                  <Text style={styles.nameText}>
                    {user1.name}, {user1.age}
                  </Text>
                </View>
              </View>

              {/* Center Match Animation */}
              <View style={styles.matchAnimationWrapper}>
                <LottieView
                  source={require('../../../assets/animations/match.json')}
                  autoPlay
                  loop
                  speed={1.2}
                  style={styles.matchLottie}
                />
              </View>

              {/* Right Photo */}
              <View style={[styles.photoWrapper, styles.rightPhoto]}>
                <Image source={{ uri: user2.image }} style={styles.photo} />
                <View style={styles.nameBadge}>
                  <Text style={styles.nameText}>
                    {user2.name}, {user2.age}
                  </Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonSection}>
              {/* Keep Swiping */}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={onKeepSwiping}
                activeOpacity={0.7}
              >
                <Text style={styles.outlineButtonText}>Keep Swiping</Text>
              </TouchableOpacity>

              {/* Let's Chat */}
              <TouchableOpacity
                style={styles.solidButton}
                onPress={onLetsChat}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FF0059', '#FF6B6B']}
                  style={styles.solidButtonGradient}
                >
                  <Text style={styles.solidButtonText}>Let's Chat 💬</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Hearts Overlay - Behind Modal
  heartsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    pointerEvents: 'none',
    zIndex: 1,
  },

  heartsLottie: {
    width: '100%',
    height: '100%',
  },

  // Modal Container
  modalContainer: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 25,
    zIndex: 10,
  },

  // Gradient
  gradientContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  titleText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FF0059',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 0, 89, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  subtitleText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },

  // Center Section
  centerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
    marginVertical: 20,
    position: 'relative',
  },

  // Photo Wrapper
  photoWrapper: {
    position: 'absolute',
    width: 130,
    height: 170,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffafcb',
    backgroundColor: '#EEE',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 12,
  },

  leftPhoto: {
    left: 0,
    transform: [{ rotate: '-18deg' }],
  },

  rightPhoto: {
    right: 0,
    transform: [{ rotate: '18deg' }],
  },

  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  nameBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  nameText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Match Animation
  matchAnimationWrapper: {
    position: 'absolute',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  matchLottie: {
    width: 220,
    height: 220,
  },

  // Button Section
  buttonSection: {
    marginTop: 24,
    gap: 12,
  },

  // Outline Button
  outlineButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#FF0059',
    backgroundColor: 'rgba(255, 0, 89, 0.06)',
  },

  outlineButtonText: {
    color: '#FF0059',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Solid Button
  solidButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  solidButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  solidButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
