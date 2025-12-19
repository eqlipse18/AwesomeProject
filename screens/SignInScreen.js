import {
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  TextInput,
  Pressable,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeIn,
  SlideInRight,
  SlideInLeft,
  FadeInDown,
} from 'react-native-reanimated';

import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const SignInScreen = () => {
  const navigation = useNavigation();
  const handleNextSignUp = () => {
    navigation.navigate('SignUp');
  };
  const handleNextForget = () => {
    navigation.navigate('ForgetPass');
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
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
          SIGN IN
        </Text>
        <Image
          source={require('../assets/Images/logosignup.png')}
          resizeMode="contain"
          style={{ height: 83, width: 100, marginTop: 80 }}
        />
      </View>
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
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 30 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 370,
              height: 50,
              borderRadius: 35,
              backgroundColor: 'white',
              paddingHorizontal: 15,
              marginBottom: 15,
              borderWidth: 1,
              borderColor: '#a1a1a180',
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
              autoFocus={true}
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '500',
                color: '#4d4d4d',
              }}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 370,
              height: 50,
              borderRadius: 35,
              backgroundColor: 'white',
              paddingHorizontal: 15,
              marginBottom: 15,
              borderWidth: 1,
              borderColor: '#a1a1a180',
            }}
          >
            <Image
              source={require('../assets/Images/padlock.png')}
              style={{ height: 25, width: 25, marginRight: 10 }}
            />
            <TextInput
              value={password}
              onChangeText={text => setPassword(text)}
              placeholder="Enter your password"
              placeholderTextColor="#bebebe"
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
          <View style={{ width: 330, alignItems: 'flex-end' }}>
            <Pressable
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.99 : 1 }],
                opacity: pressed ? 0.85 : 1,
              })}
              onPress={handleNextForget}
            >
              <Text style={{ color: '#292828ff', fontWeight: '500' }}>
                Forgot Password ?
              </Text>
            </Pressable>
          </View>
          <Pressable
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
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
              Sign In
            </Text>
          </Pressable>
          <View style={{ width: 330, alignItems: 'center', marginTop: 10 }}>
            <Text style={{ color: '#292828ff', fontWeight: '500' }}>OR</Text>
          </View>
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
                Continue with Google
              </Text>
            </View>
          </Pressable>
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
                New to Flame Dating ?
              </Text>
            </Animated.View>
            <Animated.View entering={SlideInRight.duration(500).delay(100)}>
              <Pressable
                onPress={handleNextSignUp}
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
                  Create Account
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({});
