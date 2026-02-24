import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import React, { useRef, useEffect, useState } from 'react';
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

const OtpSrcreen = () => {
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [count, setCount] = React.useState(60);
  const [activeIndex, setActiveIndex] = React.useState(null);
  const [verifying, setVerifying] = React.useState(false);
  //animated value for verify
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;
  const shakeAnim = React.useRef(new Animated.Value(0)).current;
  const [isError, setIsError] = React.useState(false);

  const resendDisabled = count > 0;
  const inputs = useRef([]);
  const route = useRoute();
  const email = route.params?.email;
  const navigation = useNavigation();

  const handleConfirmSignUp = async () => {
    console.log(' otp working and entered ');
    const otpCode = otp.join('');
    if (!email || !otpCode) {
      return;
    }
    try {
      setVerifying(true); //  start loader
      const response = await axios.post(`${BASE_URL}/confirmSignUp`, {
        email,
        otpCode,
      });
      if (response.status == 200) {
        console.log('response', response);

        navigation.navigate('Name');
      }
    } catch (error) {
      console.log('error confirming signup', error);
      setIsError(true);
      triggerShake(); //  SHAKE

      //  wrong OTP case
      // optional reset after shake
      setTimeout(() => {
        setIsError(false);
        setOtp(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }, 300);
    } finally {
      setVerifying(false); // ✅ stop loader
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

  //300ms delay do (avoid double API hit)
  useEffect(() => {
    if (otp.join('').length === 6 && !verifying) {
      const t = setTimeout(() => {
        handleConfirmSignUp();
      }, 300);

      return () => clearTimeout(t);
    }
  }, [otp]);
  const handleChange = (text, index) => {
    //  FULL OTP PASTE DETECT
    if (text.length > 1) {
      const pastedOtp = text.slice(0, 6).split('');
      setOtp(pastedOtp);

      // focus last input
      inputs.current[5]?.focus();
      return;
    }

    // normal single digit flow
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackSpace = index => {
    if (index > 0) {
      inputs.current[index - 1].focus();
    }
    const newOtp = [...otp];
    newOtp[index] = '';
    setOtp(newOtp);
    if (index > 0) {
      setTimeout(() => {
        inputs.current[index - 1].focus();
      }, 0);
    }
  };

  //-->resend button timer
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (count == 0) {
  //       clearInterval(interval);
  //     } else {
  //       setCount(count - 1);
  //     }
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, [count]);
  //verifying animation trigger
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
  //Shake animation
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

  // z;
  // const handleResendOtp = async () => {
  //   if (resendDisabled) return;

  //   setResendDisabled(true);
  //   setOtp(['', '', '', '', '', '']);
  //   setCount(60); // start countdown timer

  //   try {
  //     await axios.post(`${BASE_URL}/resendOtp`, { email });
  //     console.log('OTP resent successfully');
  //   } catch (e) {
  //     console.log(e.response?.data || e.message);
  //   }

  //   // auto enable button after 60 seconds
  //   setTimeout(() => setResendDisabled(false), 60000);
  // };

  const handleResendOtp = async () => {
    if (resendDisabled) return; // prevent double click
    setOtp(['', '', '', '', '', '']);
    setCount(60); // restart countdown

    try {
      await axios.post(`${BASE_URL}/resendOtp`, { email });
      console.log('OTP resent successfully');
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
  };

  // single useEffect for countdown
  useEffect(() => {
    if (count <= 0) return;

    const interval = setInterval(() => {
      setCount(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [count]);

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
          height: responsiveHeight(10), //80
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: responsiveHeight(6), //50
        }}
      >
        <Text style={{ fontSize: responsiveFontSize(2.8), fontWeight: '500' }}>
          Verification code
        </Text>
        <Text
          style={{
            fontSize: responsiveFontSize(1.8), //16
            color: '#7d7d7dff',
            marginTop: 5,
          }}
        >
          Enter the 6 digit code sent to your email address
        </Text>
      </View>
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
        {otp?.map((_, index) => (
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
                : activeIndex === index
                ? '#4A6CF7'
                : otp[index] !== ''
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
            {verifying ? (
              <ActivityIndicator size="small" />
            ) : (
              <TextInput
                ref={el => (inputs.current[index] = el)}
                keyboardType="numeric"
                maxLength={1}
                value={otp[index]}
                editable={!verifying}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onChangeText={text => handleChange(text, index)}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                contextMenuHidden={false}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') {
                    handleBackSpace(index);
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  textAlign: 'center',
                  fontSize: 20,
                }}
              />
            )}
          </View>
        ))}
      </Animated.View>
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
          // marginLeft: 20,//20
          marginBottom: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: responsiveHeight(8), //70
        }}
      >
        <View>
          <LottieView
            style={{
              height: responsiveHeight(26), //260
              width: responsiveWidth(60), //300
              alignSelf: 'center',
              opacity: 0.9,
              justifyContent: 'center',
            }}
            source={require('../assets/animations/otp.json')}
            autoPlay
            loop
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OtpSrcreen;

const styles = StyleSheet.create({});
