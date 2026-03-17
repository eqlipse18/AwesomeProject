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

const SetNewPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, otp } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const PasswordSchema = Yup.object().shape({
    newPassword: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*?[a-z])(?=.*?[0-9]).{8,}$/,
        'Must contain letters and numbers',
      )
      .required('Please enter a new password'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword')], 'Passwords must match')
      .required('Please confirm your password'),
  });

  const _entering = FadeInDown.springify();
  const _entering1 = FadeInDown.springify().delay(150);
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

          <Formik
            initialValues={{
              newPassword: '',
              confirmPassword: '',
            }}
            validationSchema={PasswordSchema}
            validateOnMount={true}
            onSubmit={async (values, { setFieldError }) => {
              if (!email || !otp) {
                Alert.alert('Error', 'Missing email or verification code');
                return;
              }

              setLoading(true);

              try {
                console.log('[SetNewPassword] Resetting password for:', email);

                const response = await axios.post(
                  `${BASE_URL}/reset-password`,
                  {
                    email,
                    otp,
                    newPassword: values.newPassword,
                  },
                );

                console.log('[SetNewPassword] Response:', response.data);

                if (response.data.success) {
                  Alert.alert(
                    'Success!',
                    'Your password has been reset successfully.\n\nYou can now login with your new password.',
                    [
                      {
                        text: 'Login',
                        onPress: () => {
                          // Go back to login screen
                          navigation.navigate('SignIn', { email });
                        },
                      },
                    ],
                  );
                } else {
                  const error =
                    response.data.error || 'Failed to reset password';
                  Alert.alert('Error', error, [{ text: 'OK' }]);
                }
              } catch (error) {
                console.error('[SetNewPassword] Error:', error.message);
                const backendError = error.response?.data?.error;
                const errorMessage = backendError || error.message;

                if (
                  errorMessage.includes('Invalid') ||
                  errorMessage.includes('expired')
                ) {
                  setFieldError(
                    'newPassword',
                    'Invalid or expired code. Please try again.',
                  );
                  Alert.alert(
                    'Invalid Code',
                    'Your verification code is invalid or expired.\n\nPlease request a new code.',
                    [
                      {
                        text: 'Go Back',
                        onPress: () => navigation.goBack(),
                      },
                    ],
                  );
                } else {
                  Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
                }
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
                  Set New Password
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
                  Create a strong password to secure your account.
                </Text>

                {/* New Password Input */}
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
                      { scale: activeInput === 'newPassword' ? 1.02 : 1 },
                    ],
                    backgroundColor:
                      activeInput === 'newPassword' ? '#FFFFFF' : '#F7F6FF',
                    borderColor:
                      activeInput === 'newPassword' ? '#599FDD' : '#E0E0E0',
                    paddingHorizontal: 15,
                    marginBottom: 5,
                    borderWidth: 1,
                  }}
                >
                  <Image
                    source={require('../assets/Images/padlock.png')}
                    style={{ height: 25, width: 25, marginRight: 10 }}
                  />
                  <TextInput
                    value={values.newPassword}
                    onChangeText={handleChange('newPassword')}
                    placeholder="New password"
                    placeholderTextColor="#bebebe"
                    onFocus={() => setActiveInput('newPassword')}
                    onBlur={() => setFieldTouched('newPassword')}
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '500',
                      color: '#4d4d4d',
                    }}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: '#8c8c8c',
                        fontWeight: '600',
                        fontSize: 12,
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </Animated.View>

                {touched.newPassword && errors.newPassword && (
                  <Text
                    style={{
                      color: 'red',
                      fontSize: 12,
                      marginLeft: 15,
                      marginBottom: 10,
                    }}
                  >
                    {errors.newPassword}
                  </Text>
                )}

                {/* Confirm Password Input */}
                <Animated.View
                  entering={_entering1}
                  layout={_layout}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    width: '100%',
                    paddingVertical: 3,
                    borderRadius: 35,
                    transform: [
                      {
                        scale: activeInput === 'confirmPassword' ? 1.02 : 1,
                      },
                    ],
                    backgroundColor:
                      activeInput === 'confirmPassword' ? '#FFFFFF' : '#F7F6FF',
                    borderColor:
                      activeInput === 'confirmPassword' ? '#599FDD' : '#E0E0E0',
                    paddingHorizontal: 15,
                    marginBottom: 5,
                    borderWidth: 1,
                  }}
                >
                  <Image
                    source={require('../assets/Images/padlock.png')}
                    style={{ height: 25, width: 25, marginRight: 10 }}
                  />
                  <TextInput
                    value={values.confirmPassword}
                    onChangeText={handleChange('confirmPassword')}
                    placeholder="Confirm password"
                    placeholderTextColor="#bebebe"
                    onFocus={() => setActiveInput('confirmPassword')}
                    onBlur={() => setFieldTouched('confirmPassword')}
                    secureTextEntry={!showConfirmPassword}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '500',
                      color: '#4d4d4d',
                    }}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: '#8c8c8c',
                        fontWeight: '600',
                        fontSize: 12,
                      }}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </Animated.View>

                {touched.confirmPassword && errors.confirmPassword && (
                  <Text
                    style={{
                      color: 'red',
                      fontSize: 12,
                      marginLeft: 15,
                      marginBottom: 10,
                    }}
                  >
                    {errors.confirmPassword}
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
                      Reset Password
                    </Text>
                  )}
                </Pressable>

                {/* Info Message */}
                <View
                  style={{
                    marginTop: responsiveHeight(6),
                    paddingHorizontal: responsiveWidth(3),
                    paddingVertical: responsiveHeight(2),
                    backgroundColor: '#f0f0f0',
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#666',
                      lineHeight: 18,
                    }}
                  >
                    🔒 Password requirements:
                    {'\n'}• At least 8 characters
                    {'\n'}• Contains letters and numbers
                  </Text>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default SetNewPasswordScreen;

const styles = StyleSheet.create({});
