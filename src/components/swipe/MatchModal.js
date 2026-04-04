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
import ChatIcon from '../../../assets/SVG/chat';
import { BlurView } from '@react-native-community/blur';

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
      modalScale.value = 0;
      modalOpacity.value = 0;
      heartsOpacity.value = 0;

      // 👇 YAHI CHANGE HAI
      modalScale.value = withTiming(
        1.05,
        {
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
        },
        () => {
          modalScale.value = withTiming(1, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
        },
      );

      modalOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.linear,
      });

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

      <View style={{ flex: 1 }}>
        {/* 👇 REAL BLUR BACKGROUND */}
        <BlurView
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
          blurType="dark"
          blurAmount={20}
        />

        {/* 👇 DARK OVERLAY (depth ke liye) */}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        />

        {/* 👇 TERA MAIN CONTENT */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}
        >
          {/* Hearts Particles Overlay - Behind Modal */}

          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                pointerEvents: 'none',
                zIndex: 1,
              },
              heartsAnimatedStyle,
            ]}
          >
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
              colors={['rgba(255,255,255,0.95)', 'rgba(245,245,245,0.9)']}
              style={styles.gradientContainer}
            >
              {/* Title */}
              <View style={styles.titleSection}>
                <Text style={styles.titleText}>It's a Match!</Text>
                <Text style={styles.subtitleText}>
                  You two liked each other!
                </Text>
              </View>

              {/* Center Section - Match Animation + Photos */}
              <View style={styles.centerSection}>
                {/* Left Photo */}
                <View style={[styles.photoWrapper, styles.leftPhoto]}>
                  <Image source={{ uri: user1.image }} style={styles.photo} />
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    }}
                  />
                  <View style={styles.nameBadge}>
                    <Text style={styles.nameText}>
                      {user1.name} {user1.age}
                    </Text>
                  </View>
                </View>

                {/* Center Match Animation */}
                <View style={styles.matchAnimationWrapper}>
                  <LottieView
                    source={require('../../../assets/animations/Love.json')}
                    autoPlay
                    loop
                    speed={1.2}
                    style={styles.matchLottie}
                  />
                </View>

                {/* Right Photo */}
                <View style={[styles.photoWrapper, styles.rightPhoto]}>
                  <Image source={{ uri: user2.image }} style={styles.photo} />
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    }}
                  />

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
                  <Text style={styles.outlineButtonText}>Maybe Later</Text>
                </TouchableOpacity>

                {/* Let's Chat */}
                <TouchableOpacity
                  style={styles.solidButton}
                  onPress={onLetsChat}
                  activeOpacity={0.7}
                >
                  {/* <LinearGradient
                    colors={['#ff0059', '#ff2d75', '#ff6565']}
                    style={styles.solidButtonGradient}
                  > */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ChatIcon width={22} height={22} fill="#fff" />

                    <Text style={styles.solidButtonText}>Send Message</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      opacity: 0.9,
                      color: '#FFF',
                      marginTop: 4,
                    }}
                  >
                    Start your conversation now
                  </Text>
                  {/* </LinearGradient> */}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Overlay

  // Hearts Overlay - Behind Modal
  modalContainer: {
    width: '100%',
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgb(255, 255, 255)',
    // backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.35,
    shadowRadius: 50,
    elevation: 25,
    zIndex: 10,
  },

  heartsLottie: {
    width: '100%',
    height: '100%',
  },

  // Gradient
  gradientContainer: {
    paddingHorizontal: 30,
    paddingVertical: 32,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 10,
  },

  titleText: {
    fontSize: 44,
    fontFamily: 'LobsterTwo-Bold',
    color: '#FF0059',
    marginBottom: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 0, 89, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    transform: [{ scale: 1.05 }],
  },

  subtitleText: {
    fontSize: 13,
    color: '#55555590',
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
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: '#EEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 13,
    marginVertical: 60,
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
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  nameText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Match Animation
  matchAnimationWrapper: {
    position: 'absolute',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  matchLottie: {
    marginTop: 220,
    width: 240,
    height: 240,
    transform: [{ scale: 1.1 }],
  },

  // Button Section
  buttonSection: {
    marginTop: 24,
    gap: 12,
  },

  // Outline Button
  outlineButton: {
    paddingVertical: 14,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'pink',
    backgroundColor: 'white',
    flexDirection: 'row',
    gap: 8,
  },

  outlineButtonText: {
    color: '#FF0059',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Solid Button
  solidButton: {
    overflow: 'hidden',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    backgroundColor: '#FF0059',

    paddingVertical: 9,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fc86abff',
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
  },
});
