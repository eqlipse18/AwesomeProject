// screens/VerifySelfieScreen.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCameraFormat,
} from 'react-native-vision-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { AuthContext } from '../AuthContex';
import axios from 'axios';
import ImageCropPicker from 'react-native-image-crop-picker';
import Config from 'react-native-config';

const { width: W } = Dimensions.get('window');
const API = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const CIRCLE_SIZE = W * 0.78;
const RADIUS = CIRCLE_SIZE / 2;
const STROKE = 5;
const INNER_R = RADIUS - STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * INNER_R;

// ── Animated SVG ring ─────────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProgressRing = ({ progress, color }) => {
  const offset = useSharedValue(CIRCUMFERENCE);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2400, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  useEffect(() => {
    offset.value = withTiming(
      CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE,
      { duration: 80 },
    );
  }, [progress]);

  const rotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          zIndex: 10,
        },
        rotStyle,
      ]}
    >
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <Circle
          cx={RADIUS}
          cy={RADIUS}
          r={INNER_R}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RADIUS}
          cy={RADIUS}
          r={INNER_R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
};

// ── States ────────────────────────────────────────────────────────────────────
const STATE = {
  IDLE: 'idle',
  CHECKING: 'checking',
  SUCCESS: 'success',
};

export default function VerifySelfieScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef(null);
  const lottieRef = useRef(null);
  const fakeProgressRef = useRef(null);

  const [verifyState, setVerifyState] = useState(STATE.IDLE);
  const [progress, setProgress] = useState(0);
  const [failMsg, setFailMsg] = useState('');

  const successOpacity = useSharedValue(0);
  const successScale = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  // ── Idle pulse ────────────────────────────────────────────────────────────
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.025, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(fakeProgressRef.current);
  }, []);

  // ── Capture button handler ────────────────────────────────────────────────
  // handleCapture — ImageCropPicker se photo lo, Vision Camera sirf display ke liye
  const handleCapture = async () => {
    setFailMsg('');
    setVerifyState(STATE.CHECKING);
    setProgress(0);

    fakeProgressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 85) {
          clearInterval(fakeProgressRef.current);
          return 85;
        }
        return p + 3;
      });
    }, 60);

    try {
      // ImageCropPicker — already installed, no ref issues
      const image = await ImageCropPicker.openCamera({
        useFrontCamera: true,
        cropping: false,
        mediaType: 'photo',
        forceJpg: true,
        compressImageQuality: 0.85,
        includeBase64: false,
      });

      console.log('[Verify] photo path:', image.path);

      const faces = await FaceDetection.detect(image.path, {
        performanceMode: 'accurate',
        classificationMode: 'none',
        contourMode: 'none',
        landmarkMode: 'none',
        minFaceSize: 0.08,
      });

      console.log('[Verify] faces:', faces?.length ?? 0);
      clearInterval(fakeProgressRef.current);

      if (!faces || faces.length === 0) {
        setProgress(0);
        setVerifyState(STATE.IDLE);
        setFailMsg('No face detected — try better lighting 💡');
        return;
      }

      setProgress(100);
      onVerifySuccess();
    } catch (e) {
      clearInterval(fakeProgressRef.current);
      if (e?.code === 'E_PICKER_CANCELLED') {
        setProgress(0);
        setVerifyState(STATE.IDLE);
        return;
      }
      console.log('[Verify] error:', e?.message);
      setProgress(0);
      setVerifyState(STATE.IDLE);
      setFailMsg('Something went wrong, try again');
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────
  const onVerifySuccess = async () => {
    setVerifyState(STATE.SUCCESS);

    successOpacity.value = withTiming(1, { duration: 350 });
    successScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    setTimeout(() => lottieRef.current?.play(), 200);

    // Backend save
    try {
      await axios.post(
        `${API}/users/verify`,
        { verified: true },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (e) {
      console.log('[Verify] backend:', e.message);
    }

    // Navigate after lottie plays
    setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    }, 2500);
  };

  // ── Animated styles ───────────────────────────────────────────────────────
  const successStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [{ scale: successScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // ── Ring color ────────────────────────────────────────────────────────────
  const ringColor =
    verifyState === STATE.SUCCESS
      ? '#22C55E'
      : verifyState === STATE.CHECKING
      ? '#FF0059'
      : 'rgba(255,255,255,0.3)';

  const statusText =
    verifyState === STATE.SUCCESS
      ? 'Verified! 🎉'
      : verifyState === STATE.CHECKING
      ? 'Checking...'
      : failMsg
      ? failMsg
      : 'Position your face in the circle';

  const statusColor =
    verifyState === STATE.SUCCESS
      ? '#22C55E'
      : verifyState === STATE.CHECKING
      ? '#FF0059'
      : failMsg
      ? '#EF4444'
      : 'rgba(255,255,255,0.7)';

  if (!hasPermission) {
    return (
      <View style={s.permWrap}>
        <Text style={s.permTxt}>Camera permission needed</Text>
        <TouchableOpacity onPress={requestPermission} style={s.permBtn}>
          <Text style={s.permBtnTxt}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={s.permWrap}>
        <Text style={s.permTxt}>Front camera not available</Text>
      </View>
    );
  }

  const isChecking = verifyState === STATE.CHECKING;
  const isSuccess = verifyState === STATE.SUCCESS;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Dark bg */}
      <View style={s.darkBg} />

      {/* Header */}
      <SafeAreaView style={s.headerSafe}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.cancelBtn}
            activeOpacity={0.7}
          >
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Verify Profile</Text>
          <View style={{ width: 64 }} />
        </View>
      </SafeAreaView>

      {/* Center */}
      <View style={s.centerArea}>
        {/* Circle with camera */}
        <Animated.View style={[s.circleOuter, pulseStyle]}>
          {/* Live camera feed — clipped to circle by overflow:hidden on parent */}
          <Camera
            ref={cameraRef}
            style={s.cameraCircle}
            device={device}
            isActive={!isSuccess}
            photo={true}
            outputOrientation="device"
          />

          {/* Subtle overlay */}
          <View style={s.cameraOverlay} pointerEvents="none" />

          {/* Progress ring */}
          <ProgressRing progress={progress} color={ringColor} />

          {/* Success overlay */}
          {isSuccess && (
            <Animated.View style={[s.successOverlay, successStyle]}>
              <LottieView
                ref={lottieRef}
                source={require('../assets/animations/tick.json')}
                style={{ width: 140, height: 140 }}
                loop={false}
                autoPlay={false}
              />
            </Animated.View>
          )}
        </Animated.View>

        {/* Status text */}
        <Text style={[s.statusTxt, { color: statusColor }]}>{statusText}</Text>

        {/* Progress bar — visible while checking */}
        {isChecking && (
          <View style={s.progressTrack}>
            <Animated.View
              style={[s.progressFill, { width: `${progress}%` }]}
            />
          </View>
        )}

        {/* Hint */}
        {!isChecking && !isSuccess && !failMsg && (
          <Text style={s.hintTxt}>
            Good lighting • Face forward • No glasses
          </Text>
        )}

        {isSuccess && (
          <Text style={s.successSubTxt}>Taking you to your profile...</Text>
        )}
      </View>

      {/* Bottom */}
      <View style={s.bottomArea}>
        {!isSuccess && (
          <TouchableOpacity
            style={[s.captureBtn, isChecking && s.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={isChecking}
            activeOpacity={0.88}
          >
            <Text style={s.captureBtnTxt}>
              {isChecking
                ? 'Checking... 🔍'
                : failMsg
                ? 'Try Again 🔄'
                : 'Capture 📸'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={s.privacyTxt}>🔒 Processed on-device, never stored</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  darkBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0F0F1A' },

  permWrap: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  permTxt: { color: '#fff', fontSize: 16, textAlign: 'center' },
  permBtn: {
    backgroundColor: '#FF0059',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 28,
  },
  permBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  headerSafe: { zIndex: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelBtn: { padding: 4 },
  cancelTxt: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  headerTitle: { fontSize: 17, color: '#fff', fontWeight: '700' },

  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
  },

  // ── Circle — overflow:hidden clips camera ──
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  cameraCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  cameraOverlay: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  successOverlay: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },

  statusTxt: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 24,
  },
  hintTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: -10,
  },
  successSubTxt: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '500',
    marginTop: -10,
  },

  progressTrack: {
    width: CIRCLE_SIZE * 0.85,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: -10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0059',
    borderRadius: 2,
  },

  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    alignItems: 'center',
    gap: 14,
  },
  captureBtn: {
    backgroundColor: '#FF0059',
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 32,
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  captureBtnDisabled: {
    backgroundColor: '#6B2040',
    opacity: 0.7,
  },
  captureBtnTxt: { fontSize: 17, color: '#fff', fontWeight: '800' },
  privacyTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.22)',
    fontWeight: '500',
  },
});
