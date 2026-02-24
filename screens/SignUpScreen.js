import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInUp,
  FadeIn,
  SlideInRight,
  SlideInLeft,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../utils/registrationUtils';
import axios from 'axios';
import { BASE_URL } from '../urls/url';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showconfirmPassword, setConfirmShowPassword] = useState(false);
  // const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [activeInput, setActiveInput] = useState(null);

  // const CARD_WIDTH = screenWidth * 1;
  // const CARD_HEIGHT = screenHeight * 1;
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
  const navigation = useNavigation();

  //--> Navigate to SignIn Screen
  const handleNextSignIn = () => {
    navigation.navigate('SignIn');
  };

  const [initialValues, setInitialValues] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    getRegistrationProgress('Email').then(progressData => {
      if (progressData) {
        setInitialValues({
          email: progressData.email || '',
          password: progressData.password || '',
          confirmPassword: progressData.confirmPassword || '',

          //empty for security
          // password: '', // always empty
          // confirmPassword: '', // always empty
        });
      }
    });
  }, []);

  //  const handleSendOtp = async () => {
  //     if (!email) {
  //       console.log('Missing email !');
  //       return;
  //     }
  //     console.log('Sending OTP to:', email); // <-- Add this
  //     console.log({email, password});

  //     try {
  //       const response = await axios.post(`${BASE_URL}/sendOtp`, {
  //         email,
  //         password,
  //       });
  //       console.log('OTP Response:', response.data.message);
  //       navigation.navigate('Otp', {email});
  //     } catch (error) {
  //       console.log('Error sending OTP:', error);
  //       // alert(error.response?.data?.error || error.message);
  //       console.log('Axios error:', error.message); // <- add this
  //       console.log('Error message:', error.message);
  //       console.log('Error config:', error.config);
  //       console.log('Error sending OTP:', error.response?.data || error.message);
  //     }
  //   };
  const handleSendOtp = async (email, password) => {
    if (!email) {
      console.log('Missing email!');
      return;
    }
    console.log('Sending OTP to:', email); // <-- Add this
    console.log({ email, password });

    try {
      const response = await axios.post(`${BASE_URL}/sendOtp`, {
        email,
        password,
      });

      console.log('OTP Response:', response.data.message);

      // ✅ navigate ONLY after success
      navigation.navigate('Otp', { email, password });
    } catch (error) {
      console.log('Error sending OTP:', error.response?.data || error.message);
    }
  };

  // const handleNextOtpFormik = values => {
  //   // Only store email & password (not confirmPassword)
  //   const dataToSave = {
  //     email: values.email,
  //     password: values.password,
  //   };

  //   console.log('--- Saving Email & Password ---');
  //   console.log(dataToSave);

  //   saveRegistrationProgress('Email', dataToSave).then(() => {
  //     console.log('Data saved successfully, navigating to OTP screen');
  //   });

  //   // ✅ Navigate and pass only email & password
  //   navigation.navigate('Otp', {
  //     email: values.email,
  //     password: values.password,
  //   });
  // };
  const handleNextOtpFormik = async values => {
    const dataToSave = {
      email: values.email,
      password: values.password,
    };
    console.log('--- Saving Email & Password ---');
    console.log(dataToSave);
    await saveRegistrationProgress('Email', dataToSave);

    console.log('Data saved successfully');

    // ✅ call OTP sender
    handleSendOtp(values.email, values.password);
  };

  const SignupSchema = Yup.object().shape({
    // firstName: Yup.string()
    //   .min(2, 'Too Short!')
    //   .max(50, 'Too Long!')
    //   .required('Please enter your full name'),
    // lastName: Yup.string()
    //   .min(2, 'Too Short!')
    //   .max(50, 'Too Long!')
    //   .required('Required'),
    email: Yup.string()
      .email('Invalid email')
      .required('Please enter your email address '),
    password: Yup.string()
      .min(8)
      .required('please enter 8-digit password ')
      // .matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,'Must contain 8 AlphaNumeric Character')
      .matches(
        /^(?=.*?[a-z])(?=.*?[0-9]).{8,}$/,
        'Must contain 8 AlphaNumeric Character',
      ),
    confirmPassword: Yup.string()
      .min(8)
      .required('please enter 8-digit to confirm password ')
      .oneOf([Yup.ref('password')], 'Your password do not match ')
      .required('Please confirm Your password'),
    // mobile: Yup.string()
    //   .min(10, 'Must be exactly 10 digits')
    //   .max(10, 'Must be exactly 10 digits')
    //   .matches(/^[0-9]+$/, 'Must be only digits')
    //   .required('Please enter your 10-digit Mobile Number'),
  });

  //animation MIRON -->
  const _damping = 14;
  const _entering = FadeInDown.springify();
  // .damping(_damping);
  const _entering1 = FadeInDown.springify().delay(150);
  const _entering2 = FadeInDown.springify().delay(300);
  // const _existing = FadeOut.springify().damping(_damping);
  const _layout = LinearTransition.springify();
  // .damping(_damping);
  //for the pressabl we to create animated component
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  return (
    <ScrollView>
      <SafeAreaView
        style={{
          paddingTop: Platform.OS === 'android' ? 35 : 0,
          flex: 1,
          backgroundColor: 'white',
        }}
      >
        {/* ===== SCREEN BACKGROUND GRADIENT ===== */}
        <LinearGradient
          colors={['#FF0000', '#FF3D85']}
          start={{ x: 0, y: 1 }} // bottom
          end={{ x: 0, y: 0 }} // top
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
            }}
          >
            Create an Account
          </Text>
          <Image
            source={require('../assets/Images/logosignup.png')}
            resizeMode="contain"
            style={{
              height: responsiveHeight(9), //82
              width: responsiveWidth(20), //100
              marginTop: responsiveHeight(9),
            }}
          />

          {/* ===== CARD ===== */}
          <Formik
            enableReinitialize={true} // ✅ Important for getting updated initialValues from AsyncStorage
            initialValues={initialValues}
            validationSchema={SignupSchema}
            validateOnMount={true}
            onSubmit={values => {
              Alert.alert(JSON.stringify(values));
              handleNextOtpFormik(values);
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
                {/* <Animated.View entering={FadeInDown.duration(600)}> */}
                <View
                  style={{
                    marginTop: responsiveHeight(6), //50
                    width: responsiveWidth(100), //full
                    height: responsiveHeight(70), //640
                    // flex: 1,
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
                  {/* ===== CARD GRADIENT ===== */}
                  <LinearGradient
                    colors={['#FF6A6A', '#ffffffff']} // bottom → top
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

                  {/* ===== CARD CONTENT ===== */}
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingTop: responsiveHeight(6), //30
                    }}
                  >
                    {/* Email */}
                    <Animated.View
                      entering={_entering}
                      layout={_layout}
                      // exiting={_existing}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: responsiveWidth(90), //370
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
                        // value={email}
                        // onChangeText={text => setEmail(text)}
                        value={values.email}
                        onChangeText={handleChange('email')}
                        placeholder="Enter your email"
                        placeholderTextColor="#bebebe"
                        onFocus={() => setActiveInput('email')}
                        // onBlur={() => setActiveInput(null)}
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
                        marginBottom: 5,
                      }}
                    >
                      {touched.email && errors.email && (
                        <Text
                          style={{
                            color: 'red',
                            fontSize: 14,
                          }}
                        >
                          {errors.email}
                        </Text>
                      )}
                    </Animated.View>
                    {/* Password */}
                    <Animated.View
                      entering={_entering1}
                      layout={_layout}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: responsiveWidth(90), //370
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
                        // value={password}
                        // onChangeText={text => setPassword(text)}
                        value={values.password}
                        onChangeText={handleChange('password')}
                        placeholder="Set a password"
                        placeholderTextColor="#bebebe"
                        onFocus={() => setActiveInput('password')}
                        // onBlur={() => setActiveInput(null)}
                        onBlur={() => setFieldTouched('password')}
                        secureTextEntry={!showPassword}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontWeight: '500',
                          color: '#4d4d4d',
                        }}
                      />
                      {/* SHOW / HIDE */}
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
                        marginBottom: 5,
                      }}
                    >
                      {touched.password && errors.password && (
                        <Text style={{ color: 'red', fontSize: 14 }}>
                          {errors.password}
                        </Text>
                      )}
                    </Animated.View>
                    {/* confirmPassword */}
                    <Animated.View
                      entering={_entering2}
                      layout={_layout}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: responsiveWidth(90), //370
                        paddingVertical: 3,
                        borderRadius: 35,
                        transform: [
                          {
                            scale: activeInput === 'confirmPassword' ? 1.02 : 1,
                          },
                        ],
                        backgroundColor:
                          activeInput === 'confirmPassword'
                            ? '#FFFFFF'
                            : '#F7F6FF',
                        borderColor:
                          activeInput === 'confirmPassword'
                            ? '#599FDD'
                            : '#E0E0E0',
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
                        // value={password}
                        // onChangeText={text => setPassword(text)}
                        value={values.confirmPassword}
                        onChangeText={handleChange('confirmPassword')}
                        placeholder="Confirm your password"
                        placeholderTextColor="#bebebe"
                        onFocus={() => setActiveInput('confirmPassword')}
                        // onBlur={() => setActiveInput(null)}
                        // onBlur={() => setFieldTouched('confirmPassword')}
                        secureTextEntry={!showconfirmPassword}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontWeight: '500',
                          color: '#4d4d4d',
                        }}
                      />
                      {/* SHOW / HIDE */}
                      <Pressable
                        style={({ pressed }) => ({
                          transform: [{ scale: pressed ? 0.99 : 1 }],
                          opacity: pressed ? 0.85 : 1,
                        })}
                        onPress={() =>
                          setConfirmShowPassword(!showconfirmPassword)
                        }
                      >
                        <Text
                          style={{
                            color: '#8c8c8cff',
                            fontWeight: '600',
                            fontSize: 14,
                          }}
                        >
                          {showconfirmPassword ? 'Hide' : 'Show'}
                        </Text>
                      </Pressable>
                    </Animated.View>
                    <View
                      style={{
                        marginTop: 4,
                        marginLeft: 18,
                        alignSelf: 'flex-start',
                        marginRight: 10,
                        marginBottom: 5,
                      }}
                    >
                      {/* {touched.confirmPassword && errors.confirmPassword && (
                      <Text style={{ color: 'red', fontSize: 14 }}>
                        {errors.confirmPassword}
                      </Text>
                    )} */}
                      {values.confirmPassword.length > 0 &&
                        errors.confirmPassword && (
                          <Text style={{ color: 'red' }}>
                            {errors.confirmPassword}
                          </Text>
                        )}
                    </View>
                    {/* Sign Up */}
                    <Pressable
                      onPress={handleSubmit}
                      disabled={!isValid}
                      style={({ pressed }) => ({
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                        opacity: pressed ? 0.85 : 1,
                        marginTop: responsiveHeight(12), //100
                        width: responsiveWidth(60),
                        // height: 50,
                        paddingVertical: 11,
                        borderRadius: 25,
                        backgroundColor: isValid ? '#FF0059' : '#b35777',
                        alignItems: 'center',
                        justifyContent: 'center',
                      })}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: responsiveFontSize(2.3),
                          fontWeight: 'bold',
                        }}
                      >
                        Sign Up
                      </Text>
                    </Pressable>
                    <View
                      style={{
                        width: 330,
                        alignItems: 'center',
                        marginTop: 10,
                      }}
                    >
                      <Text style={{ color: '#292828ff', fontWeight: '500' }}>
                        OR
                      </Text>
                    </View>
                    {/* Sign Up with Google */}
                    <Pressable
                      style={({ pressed }) => ({
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                        opacity: pressed ? 0.85 : 1,
                        marginTop: 10,
                        backgroundColor: 'white',
                        paddingVertical: 10,
                        width: responsiveWidth(85), //330
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
                            fontSize: responsiveFontSize(2),
                            fontWeight: 'bold',
                            color: 'black',
                          }}
                        >
                          Sign up using Google
                        </Text>
                      </View>
                    </Pressable>
                    {/* Already have account + Login */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: responsiveHeight(7), //130
                      }}
                    >
                      <Animated.View
                        entering={SlideInLeft.duration(500).delay(50)}
                      >
                        <Text
                          style={{
                            fontSize: responsiveFontSize(1.7), //17
                            color: '#2b2b2bff',
                            fontWeight: '400',
                            marginRight: 10,
                          }}
                        >
                          Already have an account?
                        </Text>
                      </Animated.View>
                      <Animated.View
                        entering={SlideInRight.duration(500).delay(100)}
                      >
                        <Pressable
                          onPress={handleNextSignIn}
                          style={({ pressed }) => ({
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                            opacity: pressed ? 0.85 : 1,
                            paddingHorizontal: 15,
                            paddingVertical: 8,
                            borderRadius: 25,
                            width: responsiveWidth(26),
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
                            LOG IN
                          </Text>
                        </Pressable>
                      </Animated.View>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}
          </Formik>
          {/* </Animated.View> */}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({});
