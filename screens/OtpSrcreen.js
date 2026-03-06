import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Easing,
  Pressable,
  Keyboard,
} from 'react-native';
import React, { useRef, useEffect, useState, useContext } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import axios from 'axios';
import { BASE_URL } from '../urls/url';
import { AuthContext } from '../AuthContex';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OtpScreen = () => {
  const [otp, setOtp] = useState('');
  const [count, setCount] = React.useState(60);
  const [verifying, setVerifying] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;
  const shakeAnim = React.useRef(new Animated.Value(0)).current;
  const cursorAnim = React.useRef(new Animated.Value(1)).current;

  const resendDisabled = count > 0;
  const inputRef = useRef(null);
  const route = useRoute();
  const email = route.params?.email;
  const { setToken, setProfileComplete } = useContext(AuthContext);
  const navigation = useNavigation();

  // Blinking cursor animation
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    if (isFocused) {
      blink.start();
    } else {
      blink.stop();
      cursorAnim.setValue(1);
    }
    return () => blink.stop();
  }, [isFocused]);

  const handleOtpChange = text => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
  };

  const focusInput = () => {
    inputRef.current?.blur();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsFocused(false);
    });
    return () => hideListener.remove();
  }, []);

  const handleConfirmSignUp = async () => {
    const otpCode = otp;
    if (!email || !otpCode) return;

    try {
      setVerifying(true);

      const response = await axios.post(`${BASE_URL}/confirmSignUp`, {
        email,
        otpCode,
        password: route.params?.password,
      });

      if (response.status === 200) {
        const { token, isProfileComplete } = response.data;

        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem(
          'profileComplete',
          JSON.stringify(isProfileComplete),
        );

        setToken(token);
        setProfileComplete(isProfileComplete);
      }
    } catch (error) {
      console.log('error confirming signup', error);

      setIsError(true);
      triggerShake();

      setTimeout(() => {
        setIsError(false);
        setOtp('');
        // Re-focus the single hidden input
        inputRef.current?.focus();
      }, 800);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      changeNavigationBarColor('#ffffffff', false);
    }
    return () => {
      if (Platform.OS === 'android') {
        changeNavigationBarColor('#FF6A6A', false);
      }
    };
  }, []);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !verifying) {
      const t = setTimeout(() => {
        handleConfirmSignUp();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [otp]);

  // Verifying animation
  useEffect(() => {
    if (verifying) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [verifying]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleResendOtp = async () => {
    if (resendDisabled) return;
    setOtp('');
    setCount(60);

    try {
      await axios.post(`${BASE_URL}/resendOtp`, { email });
      console.log('OTP resent successfully');
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (count <= 0) return;
    const interval = setInterval(() => {
      setCount(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [count]);

  // Active box = next empty index (where cursor should show)
  const activeCursorIndex = otp.length < 6 ? otp.length : -1;

  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      <View
        style={{
          height: responsiveHeight(10),
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: responsiveHeight(6),
        }}
      >
        <Text style={{ fontSize: responsiveFontSize(2.8), fontWeight: '500' }}>
          Verification code
        </Text>
        <Text
          style={{
            fontSize: responsiveFontSize(1.8),
            color: '#7d7d7dff',
            marginTop: 5,
          }}
        >
          Enter the 6 digit code sent to your email address
        </Text>
      </View>

      {/* HIDDEN INPUT — single source of truth */}
      <TextInput
        ref={inputRef}
        value={otp}
        onChangeText={handleOtpChange}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={true} // ✅ opens keyboard on mount
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          // pointerEvents: 'none', // doesn't steal touch events
        }}
      />

      {/* ✅ Pressable wraps boxes so tap always re-focuses */}
      <Pressable onPress={focusInput} hitSlop={10}>
        <Animated.View
          style={{
            flexDirection: 'row',
            marginLeft: responsiveWidth(10),
            gap: 5,
            marginTop: 10,
            transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
            opacity: opacityAnim,
          }}
        >
          {[...Array(6)].map((_, index) => {
            const isActiveBox = index === activeCursorIndex && isFocused;
            return (
              <View
                key={index}
                style={{
                  width: responsiveWidth(10),
                  height: responsiveHeight(6),
                  marginHorizontal: 5,
                  borderRadius: 54,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: isError
                    ? '#ff4d4f'
                    : isActiveBox
                    ? '#4A6CF7' // blue border on active box
                    : otp[index]
                    ? '#22c55e'
                    : '#949494a4',
                  backgroundColor: '#fff',
                  shadowColor: '#000',
                  shadowOpacity: 0.09,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 13,
                }}
              >
                {otp[index] ? (
                  <Text style={{ fontSize: 22, fontWeight: 'bold' }}>
                    {otp[index]}
                  </Text>
                ) : isActiveBox ? (
                  // ✅ Blinking cursor shown in active empty box
                  <Animated.View
                    style={{
                      width: 2,
                      height: 22,
                      backgroundColor: '#4A6CF7',
                      opacity: cursorAnim,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </Animated.View>
      </Pressable>

      {verifying && (
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4A6CF7" />
        </View>
      )}

      <View
        style={{
          alignItems: 'center',
          marginTop: responsiveHeight(2.5),
          flexDirection: 'row',
          gap: 5,
          justifyContent: 'center',
        }}
      >
        <Text
          onPress={handleResendOtp}
          style={{
            fontSize: responsiveFontSize(1.8),
            fontWeight: '500',
            color: resendDisabled ? '#7d7d7dff' : 'rgb(0, 68, 255)',
          }}
        >
          Resend code
        </Text>

        {resendDisabled && (
          <Text
            style={{
              color: '#ff6a6a',
              fontSize: responsiveFontSize(1.8),
              fontWeight: '500',
            }}
          >
            {count > 0 ? `  ${count} seconds` : '00:00'}
          </Text>
        )}
      </View>

      <View
        style={{
          marginBottom: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: responsiveHeight(8),
        }}
      >
        <LottieView
          style={{
            height: responsiveHeight(26),
            width: responsiveWidth(60),
            alignSelf: 'center',
            opacity: 0.9,
          }}
          source={require('../assets/animations/otp.json')}
          autoPlay
          loop
        />
      </View>
    </SafeAreaView>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({});
