import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import Animated, {
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { BASE_URL } from '../urls/url';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const initialEmail = route.params?.email || '';

  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: OTP

  const EmailSchema = Yup.object().shape({
    email: Yup.string()
      .email('Invalid email')
      .required('Please enter your email'),
  });

  const OTPSchema = Yup.object().shape({
    otp: Yup.string()
      .length(6, 'OTP must be 6 digits')
      .matches(/^[0-9]+$/, 'OTP must contain only numbers')
      .required('Please enter the OTP'),
  });

  const _entering = FadeInDown.springify();
  const _layout = LinearTransition.springify();

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          paddingTop: Platform.OS === 'android' ? 35 : 0,
          flex: 1,
          backgroundColor: 'white',
        }}
      >
        <LinearGradient
          colors={['#FF6A6A', '#ffffffff']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        <View style={{ flex: 1 }}>
          {/* Header */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.9 : 1 }],
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: responsiveWidth(5),
              paddingVertical: 12,
            })}
          >
            <Text
              style={{
                fontSize: 28,
                color: '#FF0059',
                fontWeight: 'bold',
              }}
            >
              ← Back
            </Text>
          </Pressable>

          {step === 1 ? (
            // STEP 1: REQUEST PASSWORD RESET
            <Formik
              initialValues={{ email: initialEmail }}
              validationSchema={EmailSchema}
              validateOnMount={true}
              onSubmit={async (values, { setFieldError }) => {
                setLoading(true);

                try {
                  console.log(
                    '[ForgotPassword] Requesting reset for:',
                    values.email,
                  );

                  const response = await axios.post(
                    `${BASE_URL}/forgot-password`,
                    {
                      email: values.email,
                    },
                  );

                  console.log('[ForgotPassword] Response:', response.data);

                  if (response.data.success) {
                    Alert.alert(
                      'Check Your Email',
                      'We sent a password reset code to your email.\n\nPlease check your inbox and spam folder.',
                      [{ text: 'OK' }],
                    );
                    setStep(2);
                  } else {
                    const error =
                      response.data.error || 'Failed to send reset code';
                    setFieldError('email', error);
                    Alert.alert('Error', error, [{ text: 'OK' }]);
                  }
                } catch (error) {
                  console.error('[ForgotPassword] Error:', error.message);
                  const backendError = error.response?.data?.error;
                  const errorMessage = backendError || error.message;

                  setFieldError('email', errorMessage);
                  Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {({
                values,
                errors,
                touched,
                isValid,
                handleChange,
                setFieldTouched,
                handleSubmit,
              }) => (
                <View style={{ paddingHorizontal: responsiveWidth(5) }}>
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: 'bold',
                      marginTop: responsiveHeight(4),
                      color: '#1a1a1a',
                    }}
                  >
                    Forgot Your Password?
                  </Text>

                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '500',
                      marginTop: responsiveHeight(3),
                      marginBottom: responsiveHeight(4),
                      color: '#666',
                    }}
                  >
                    Enter your email address and we'll send you a code to reset
                    your password.
                  </Text>

                  {/* Email Input */}
                  <Animated.View
                    entering={_entering}
                    layout={_layout}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: '100%',
                      paddingVertical: 3,
                      borderRadius: 35,
                      transform: [
                        { scale: activeInput === 'email' ? 1.02 : 1 },
                      ],
                      backgroundColor:
                        activeInput === 'email' ? '#FFFFFF' : '#F7F6FF',
                      borderColor:
                        activeInput === 'email' ? '#599FDD' : '#E0E0E0',
                      paddingHorizontal: 15,
                      marginBottom: 5,
                      borderWidth: 1,
                    }}
                  >
                    <Image
                      source={require('../assets/Images/email.png')}
                      style={{ height: 25, width: 25, marginRight: 10 }}
                    />
                    <TextInput
                      value={values.email}
                      onChangeText={handleChange('email')}
                      placeholder="Enter your email"
                      placeholderTextColor="#bebebe"
                      onFocus={() => setActiveInput('email')}
                      onBlur={() => setFieldTouched('email')}
                      autoFocus={true}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: '500',
                        color: '#4d4d4d',
                      }}
                    />
                  </Animated.View>

                  {touched.email && errors.email && (
                    <Text
                      style={{
                        color: 'red',
                        fontSize: 14,
                        marginLeft: 15,
                        marginBottom: 10,
                      }}
                    >
                      {errors.email}
                    </Text>
                  )}

                  {/* Submit Button */}
                  <Pressable
                    onPress={() => {
                      if (!isValid || loading) return;
                      handleSubmit();
                    }}
                    disabled={!isValid || loading}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                      marginTop: responsiveHeight(5),
                      width: '100%',
                      paddingVertical: 14,
                      borderRadius: 25,
                      backgroundColor: isValid ? '#FF0059' : '#b35777',
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text
                        style={{
                          color: 'white',
                          fontSize: responsiveFontSize(2.2),
                          fontWeight: 'bold',
                        }}
                      >
                        Send Reset Code
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </Formik>
          ) : (
            // STEP 2: VERIFY OTP
            <Formik
              initialValues={{ otp: '' }}
              validationSchema={OTPSchema}
              validateOnMount={true}
              onSubmit={async (values, { setFieldError }) => {
                setLoading(true);

                try {
                  console.log('[ForgotPassword] Verifying OTP');

                  // Move to SetNewPassword screen with OTP
                  navigation.navigate('SetNewPassword', {
                    email: initialEmail,
                    otp: values.otp,
                  });
                } catch (error) {
                  setFieldError('otp', 'Invalid OTP');
                } finally {
                  setLoading(false);
                }
              }}
            >
              {({
                values,
                errors,
                touched,
                isValid,
                handleChange,
                setFieldTouched,
                handleSubmit,
              }) => (
                <View style={{ paddingHorizontal: responsiveWidth(5) }}>
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: 'bold',
                      marginTop: responsiveHeight(4),
                      color: '#1a1a1a',
                    }}
                  >
                    Enter Reset Code
                  </Text>

                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '500',
                      marginTop: responsiveHeight(3),
                      marginBottom: responsiveHeight(4),
                      color: '#666',
                    }}
                  >
                    We sent a 6-digit code to {initialEmail}
                  </Text>

                  {/* OTP Input */}
                  <Animated.View
                    entering={_entering}
                    layout={_layout}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: '100%',
                      paddingVertical: 3,
                      borderRadius: 35,
                      transform: [{ scale: activeInput === 'otp' ? 1.02 : 1 }],
                      backgroundColor:
                        activeInput === 'otp' ? '#FFFFFF' : '#F7F6FF',
                      borderColor:
                        activeInput === 'otp' ? '#599FDD' : '#E0E0E0',
                      paddingHorizontal: 15,
                      marginBottom: 5,
                      borderWidth: 1,
                    }}
                  >
                    <Image
                      source={require('../assets/Images/email.png')}
                      style={{ height: 25, width: 25, marginRight: 10 }}
                    />
                    <TextInput
                      value={values.otp}
                      onChangeText={handleChange('otp')}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#bebebe"
                      onFocus={() => setActiveInput('otp')}
                      onBlur={() => setFieldTouched('otp')}
                      keyboardType="numeric"
                      maxLength={6}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: '500',
                        color: '#4d4d4d',
                        letterSpacing: 5,
                      }}
                    />
                  </Animated.View>

                  {touched.otp && errors.otp && (
                    <Text
                      style={{
                        color: 'red',
                        fontSize: 14,
                        marginLeft: 15,
                        marginBottom: 10,
                      }}
                    >
                      {errors.otp}
                    </Text>
                  )}

                  {/* Submit Button */}
                  <Pressable
                    onPress={() => {
                      if (!isValid || loading) return;
                      handleSubmit();
                    }}
                    disabled={!isValid || loading}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                      marginTop: responsiveHeight(5),
                      width: '100%',
                      paddingVertical: 14,
                      borderRadius: 25,
                      backgroundColor: isValid ? '#FF0059' : '#b35777',
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text
                        style={{
                          color: 'white',
                          fontSize: responsiveFontSize(2.2),
                          fontWeight: 'bold',
                        }}
                      >
                        Verify & Continue
                      </Text>
                    )}
                  </Pressable>

                  {/* Resend Code */}
                  <Pressable
                    onPress={() => setStep(1)}
                    style={pressed => ({
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                      marginTop: responsiveHeight(3),
                    })}
                  >
                    <Text
                      style={{
                        color: '#FF0059',
                        fontSize: 14,
                        fontWeight: '600',
                        textAlign: 'center',
                        textDecorationLine: 'underline',
                      }}
                    >
                      Didn't receive code? Resend
                    </Text>
                  </Pressable>
                </View>
              )}
            </Formik>
          )}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({});
