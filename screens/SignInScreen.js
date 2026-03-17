import {
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeIn,
  SlideInRight,
  SlideInLeft,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../AuthContex';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../urls/url';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';

const SignInScreen = () => {
  const { setToken, setProfileComplete, setUserId } = useContext(AuthContext);
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      changeNavigationBarColor('#FF6A6A', false);
    }
    return () => {
      if (Platform.OS === 'android') {
        changeNavigationBarColor('#fcd2e0', false);
      }
    };
  }, []);

  const handleNextSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleNextForget = () => {
    navigation.navigate('ForgetPass');
  };

  // Validation schema
  const LoginSchema = Yup.object().shape({
    email: Yup.string()
      .email('Invalid email')
      .required('Please enter your email'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Please enter your password'),
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
          colors={['#FF0000', '#FF3D85']}
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

        <View style={{ alignItems: 'center', flex: 1 }}>
          {/* Logo */}
          <Text
            style={{
              fontSize: 24,
              color: 'white',
              fontWeight: 'bold',
              marginTop: responsiveHeight(5),
            }}
          >
            SIGN IN
          </Text>
          <Image
            source={require('../assets/Images/logosignup.png')}
            resizeMode="contain"
            style={{
              height: responsiveHeight(9),
              width: responsiveWidth(20),
              marginTop: responsiveHeight(8),
            }}
          />
        </View>

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          validateOnMount={true}
          onSubmit={async (values, { setFieldError }) => {
            setLoading(true);

            try {
              console.log('[SignIn] Attempting login for:', values.email);

              const response = await axios.post(`${BASE_URL}/login`, {
                email: values.email,
                password: values.password,
              });

              console.log('[SignIn] Login response:', response.data);

              if (response.data.success) {
                // ✅ Login successful
                console.log('[SignIn] Login successful!');

                // Store token and userId
                await AsyncStorage.setItem('token', response.data.token);
                await AsyncStorage.setItem(
                  'profileComplete',
                  JSON.stringify(response.data.isProfileComplete),
                );
                await AsyncStorage.setItem('userId', response.data.userId);

                setToken(response.data.token);
                setUserId(response.data.userId);
                setProfileComplete(response.data.isProfileComplete);

                // Navigate to home or profile setup
                // if (!response.data.isProfileComplete) {
                //   navigation.navigate('ProfileSetup');
                // } else {
                //   navigation.navigate('HomeScreen');
                // }
              } else {
                // ❌ Backend returned error
                const errorMsg = response.data.error || 'Login failed';
                console.error('[SignIn] Backend error:', errorMsg);
                setFieldError('email', errorMsg);
                Alert.alert('Login Failed', errorMsg, [{ text: 'OK' }]);
              }
            } catch (error) {
              console.error('[SignIn] Error:', error.message);

              const backendError = error.response?.data?.error;
              const errorMessage = backendError || error.message;

              console.log('[SignIn] Error details:', {
                backendError,
                status: error.response?.status,
              });

              // ✅ Handle specific errors
              if (
                backendError?.includes('Incorrect') ||
                backendError?.includes('NotAuthorizedException')
              ) {
                // Wrong password
                setFieldError(
                  'password',
                  'The password you entered is incorrect',
                );
                Alert.alert(
                  'Login Failed',
                  'The password you entered is incorrect.\n\nForgot your password?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset Password',
                      onPress: () => {
                        navigation.navigate('ForgetPass', {
                          email: values.email,
                        });
                      },
                    },
                  ],
                );
              } else if (
                backendError?.includes('not found') ||
                backendError?.includes('NOT in DynamoDB')
              ) {
                // User not in database
                setFieldError('email', 'User not found. Please sign up.');
                Alert.alert(
                  'User Not Found',
                  'This email is not registered.\n\nWould you like to sign up?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign Up',
                      onPress: () => {
                        navigation.navigate('SignUp');
                      },
                    },
                  ],
                );
              } else if (backendError?.includes('not confirmed')) {
                // Email not verified
                setFieldError('email', 'Please verify your email first');
                Alert.alert(
                  'Email Not Verified',
                  'Your account needs email verification.\n\nCheck your email for the verification code.',
                  [{ text: 'OK' }],
                );
              } else {
                setFieldError('email', errorMessage);
                Alert.alert('Error', errorMessage || 'Please try again', [
                  { text: 'OK' },
                ]);
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
            <Animated.View entering={FadeIn.duration(300).delay(100)}>
              <View
                style={{
                  marginTop: responsiveHeight(6),
                  width: responsiveWidth(100),
                  height: responsiveHeight(75),
                  borderTopLeftRadius: 40,
                  borderTopRightRadius: 40,
                  overflow: 'hidden',
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <LinearGradient
                  colors={['#ff6a6a', '#ffffff']}
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

                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingTop: responsiveHeight(4),
                  }}
                >
                  {/* Email Input */}
                  <Animated.View
                    entering={_entering}
                    layout={_layout}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: responsiveWidth(90),
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
                  <Animated.View
                    entering={_entering}
                    layout={_layout}
                    style={{
                      marginTop: 4,
                      marginLeft: 18,
                      alignSelf: 'flex-start',
                      marginRight: 10,
                      marginBottom: 10,
                    }}
                  >
                    {touched.email && errors.email && (
                      <Text style={{ color: 'red', fontSize: 14 }}>
                        {errors.email}
                      </Text>
                    )}
                  </Animated.View>

                  {/* Password Input */}
                  <Animated.View
                    entering={_entering1}
                    layout={_layout}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: responsiveWidth(90),
                      paddingVertical: 3,
                      borderRadius: 35,
                      transform: [
                        { scale: activeInput === 'password' ? 1.02 : 1 },
                      ],
                      backgroundColor:
                        activeInput === 'password' ? '#FFFFFF' : '#F7F6FF',
                      borderColor:
                        activeInput === 'password' ? '#599FDD' : '#E0E0E0',
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
                      value={values.password}
                      onChangeText={handleChange('password')}
                      placeholder="Enter your password"
                      placeholderTextColor="#bebebe"
                      onFocus={() => setActiveInput('password')}
                      onBlur={() => setFieldTouched('password')}
                      secureTextEntry={!showPassword}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: '500',
                        color: '#4d4d4d',
                      }}
                    />
                    <Pressable
                      style={({ pressed }) => ({
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                        opacity: pressed ? 0.85 : 1,
                      })}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text
                        style={{
                          color: '#8c8c8cff',
                          fontWeight: '600',
                          fontSize: 14,
                        }}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                  </Animated.View>
                  <Animated.View
                    style={{
                      marginTop: 4,
                      marginLeft: 18,
                      alignSelf: 'flex-start',
                      marginRight: 10,
                      marginBottom: 15,
                    }}
                  >
                    {touched.password && errors.password && (
                      <Text style={{ color: 'red', fontSize: 14 }}>
                        {errors.password}
                      </Text>
                    )}
                  </Animated.View>

                  {/* Forgot Password Link */}
                  <View
                    style={{
                      width: responsiveWidth(90),
                      alignItems: 'flex-end',
                      marginBottom: 20,
                    }}
                  >
                    <Pressable
                      onPress={handleNextForget}
                      style={({ pressed }) => ({
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: '#FF0059',
                          fontWeight: '600',
                          fontSize: 14,
                          textDecorationLine: 'underline',
                        }}
                      >
                        Forgot Password?
                      </Text>
                    </Pressable>
                  </View>

                  {/* Sign In Button */}
                  <Pressable
                    onPress={() => {
                      if (!isValid || loading) return;
                      handleSubmit();
                    }}
                    disabled={!isValid || loading}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                      marginTop: responsiveHeight(3),
                      width: responsiveWidth(60),
                      paddingVertical: 11,
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
                          fontSize: responsiveFontSize(2.3),
                          fontWeight: 'bold',
                        }}
                      >
                        SIGN IN
                      </Text>
                    )}
                  </Pressable>

                  <View
                    style={{
                      width: responsiveWidth(85),
                      alignItems: 'center',
                      marginTop: 15,
                    }}
                  >
                    <Text style={{ color: '#292828ff', fontWeight: '500' }}>
                      OR
                    </Text>
                  </View>

                  {/* Google Sign In */}
                  <Pressable
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                      marginTop: 10,
                      backgroundColor: 'white',
                      paddingVertical: 10,
                      width: responsiveWidth(85),
                      borderRadius: 35,
                      borderWidth: 1,
                      borderColor: '#fd97afff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Image
                        source={require('../assets/Images/google.png')}
                        style={{ height: 25, width: 25 }}
                      />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: 'bold',
                          color: 'black',
                        }}
                      >
                        Continue with Google
                      </Text>
                    </View>
                  </Pressable>

                  {/* Sign Up Link */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: responsiveHeight(8),
                    }}
                  >
                    <Animated.View
                      entering={SlideInLeft.duration(500).delay(50)}
                    >
                      <Text
                        style={{
                          fontSize: responsiveFontSize(1.7),
                          color: '#2b2b2bff',
                          fontWeight: '400',
                          marginRight: 10,
                        }}
                      >
                        New to Flame Dating?
                      </Text>
                    </Animated.View>
                    <Animated.View
                      entering={SlideInRight.duration(500).delay(100)}
                    >
                      <Pressable
                        onPress={handleNextSignUp}
                        style={({ pressed }) => ({
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                          opacity: pressed ? 0.85 : 1,
                          paddingHorizontal: 15,
                          paddingVertical: 10,
                          borderRadius: 25,
                          width: responsiveWidth(35),
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#fc7192ff',
                          backgroundColor: 'white',
                        })}
                      >
                        <Text
                          style={{
                            fontSize: responsiveFontSize(1.8),
                            color: 'black',
                            fontWeight: 'bold',
                          }}
                        >
                          Create Account
                        </Text>
                      </Pressable>
                    </Animated.View>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </Formik>
      </SafeAreaView>
    </ScrollView>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({});
