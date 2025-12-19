import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TextInput,
  Pressable,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInUp,
  FadeIn,
  SlideInRight,
  SlideInLeft,
  FadeInDown,
} from 'react-native-reanimated';
import changeNavigationBarColor from 'react-native-navigation-bar-color';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [activeInput, setActiveInput] = useState(null);

  const CARD_WIDTH = screenWidth * 1;
  const CARD_HEIGHT = screenHeight * 1;
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
  const handleNextSignIn = () => {
    navigation.navigate('SignIn');
  };
  const handleNextOtp = () => {
    navigation.navigate('Otp');
  };
  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      {/* <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Image
          source={require('../assets/Images/logosignup.png')}
          resizeMode="contain"
          style={{
            height: 83,
            width: 100,
            marginTop: 125,
          }}
        />
        <View
          style={{
            marginTop: 100,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            alignItems: 'center',
            backgroundColor: 'white',

            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            // Shadow iOS
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            // Shadow Android
            elevation: 8,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#ffffffff', '#FF6A6A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
          />
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                padding: 15,
                width: 390,
                height: 50,

                marginTop: 35,
                borderRadius: 35,
                alignItems: 'center',
                justifyContent: 'center',

                paddingHorizontal: 15,
                marginTop: 40,
                borderWidth: 1,
                borderColor: '#a1a1a180',
                fontWeight: '500',
              }}
            >
              <Image
                style={{
                  height: 30,
                  width: 30,
                  tintColor: 'black',
                }}
                source={require('../assets/Images/email.png')}
              />
              <TextInput
                value={email}
                onChangeText={text => setEmail(text)}
                placeholder="Enter  your email"
                placeholderTextColor={'#bebebe'}
                autoFocus={true}
                style={{
                  flex: 1,
                  fontSize: 18,
                }}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                padding: 15,
                width: 390,
                height: 50,

                marginTop: 65,
                borderRadius: 35,
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 10,
                paddingHorizontal: 15,
                marginTop: 40,
                borderWidth: 1,
                borderColor: '#a1a1a180',
                fontWeight: '500',
              }}
            >
              <Image
                style={{
                  height: 30,
                  width: 30,

                  tintColor: 'black',
                }}
                source={require('../assets/Images/padlock.png')}
              />
              <TextInput
                value={password}
                onChangeText={text => setPassword(text)}
                placeholder="Enter your password"
                placeholderTextColor={'#bebebe'}
                secureTextEntry={true}
                fontSize={18}
                style={{
                  flex: 1,
                  fontSize: 18,
                }}
              />
            </View>
          </View>

          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              style={{
                paddingHorizontal: 15,
                paddingVertical: 10,
                borderRadius: 25,
                width: 160,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'pink',
                backgroundColor: 'white',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: 'black',
                  fontWeight: 'bold',
                }}
              >
                Sign Up
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 17,
                color: '#585858ff',
                fontWeight: '400',
              }}
            >
              Dont't have Account?
            </Text>
          </View>
        </View>
      </View> */}

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
          style={{ height: 83, width: 100, marginTop: 85 }}
        />

        {/* ===== CARD ===== */}
        <Animated.View entering={FadeIn.duration(300).delay(100)}>
          {/* <Animated.View entering={FadeInDown.duration(600)}> */}
          <View
            style={{
              marginTop: 50,
              width: CARD_WIDTH,
              height: 640,
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
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 30 }}>
              {/* Email */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: 370,
                  height: 50,
                  borderRadius: 35,
                  transform: [{ scale: activeInput === 'email' ? 1.02 : 1 }],
                  backgroundColor:
                    activeInput === 'email' ? '#FFFFFF' : '#F7F6FF',
                  borderColor: activeInput === 'email' ? '#599FDD' : '#E0E0E0',
                  paddingHorizontal: 15,
                  marginBottom: 15,
                  borderWidth: 1,
                }}
              >
                <Image
                  source={require('../assets/Images/email.png')}
                  style={{ height: 25, width: 25, marginRight: 10 }}
                />
                <TextInput
                  value={email}
                  onChangeText={text => setEmail(text)}
                  placeholder="Enter your email"
                  placeholderTextColor="#bebebe"
                  onFocus={() => setActiveInput('email')}
                  onBlur={() => setActiveInput(null)}
                  autoFocus={true}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: '500',

                    color: '#4d4d4d',
                  }}
                />
              </View>

              {/* Password */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: 370,
                  height: 50,
                  borderRadius: 35,
                  transform: [{ scale: activeInput === 'password' ? 1.02 : 1 }],
                  backgroundColor:
                    activeInput === 'password' ? '#FFFFFF' : '#F7F6FF',
                  borderColor:
                    activeInput === 'password' ? '#599FDD' : '#E0E0E0',
                  paddingHorizontal: 15,
                  marginBottom: 15,
                  borderWidth: 1,
                }}
              >
                <Image
                  source={require('../assets/Images/padlock.png')}
                  style={{ height: 25, width: 25, marginRight: 10 }}
                />
                <TextInput
                  value={password}
                  onChangeText={text => setPassword(text)}
                  placeholder="Set a password"
                  placeholderTextColor="#bebebe"
                  onFocus={() => setActiveInput('password')}
                  onBlur={() => setActiveInput(null)}
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
              </View>

              {/* Sign Up */}
              <Pressable
                onPress={handleNextOtp}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                  marginTop: 100,
                  width: 260,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#FF0059',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text
                  style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}
                >
                  Sign Up
                </Text>
              </Pressable>
              <View style={{ width: 330, alignItems: 'center', marginTop: 10 }}>
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
                  width: 330,
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
                  marginBottom: 60,
                  marginTop: 130,
                }}
              >
                <Animated.View entering={SlideInLeft.duration(500).delay(50)}>
                  <Text
                    style={{
                      fontSize: 17,
                      color: '#2b2b2bff',
                      fontWeight: '400',
                      marginRight: 10,
                    }}
                  >
                    Already have an account?
                  </Text>
                </Animated.View>
                <Animated.View entering={SlideInRight.duration(500).delay(100)}>
                  <Pressable
                    onPress={handleNextSignIn}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                      borderRadius: 25,
                      width: 160,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#fc7192ff',
                      backgroundColor: 'white',
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 16,
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
        {/* </Animated.View> */}
      </View>
    </SafeAreaView>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({});
