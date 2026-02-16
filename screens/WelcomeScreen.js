import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInUp,
  FadeIn,
  SlideInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import AppStatusBar from '../components/AppStatusBar';
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const handleNext = () => {
    navigation.navigate('SignUp');
  };
  const handleNextSignIn = () => {
    navigation.navigate('SignIn');
  };
  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      <AppStatusBar style="dark-content" />
      {/* <LinearGradient
        colors={['#fe73ad', '#ffffff']}
        start={{ x: 1, y: 1 }}
        end={{ x: 2, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      /> */}
      <Image
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        source={require('../assets/Images/bg.jpg')}
      />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={require('../assets/Images/logo.png')}
          resizeMode="contain"
          style={{
            height: responsiveHeight(16),
            width: responsiveHeight(16),
            marginTop: responsiveHeight(15),
          }}
        />
      </View>
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: responsiveFontSize(1.6),
            color: '#3e3d3dff',
            fontWeight: 'bold',
            marginBottom: 10,
          }}
        >
          New to Flame Dating ?
        </Text>
      </View>
      <>
        <View style={{ marginTop: 'auto', alignItems: 'center' }}>
          <Animated.View entering={FadeIn.duration(300).delay(100)}>
            <Animated.View entering={FadeInUp.duration(600)}>
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                  backgroundColor: '#FF0059',
                  width: responsiveWidth(90),
                  paddingVertical: 10,
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#fc86abff',
                })}
              >
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 17,
                  }}
                >
                  <Image
                    style={{
                      height: 23,
                      width: 23,
                      tintColor: 'white',
                    }}
                    source={require('../assets/Images/email.png')}
                  />
                  <Text
                    style={{
                      fontSize: responsiveFontSize(2.1),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    Sign up using Email
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          </Animated.View>
          <Animated.View entering={FadeIn.duration(300).delay(100)}>
            <Animated.View entering={FadeInUp.duration(700).delay(200)}>
              <Pressable
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.85 : 1,

                  width: responsiveWidth(90),
                  paddingVertical: 10,
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                  borderWidth: 1,
                  borderColor: 'pink',
                  backgroundColor: 'white',
                })}
              >
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 15,
                  }}
                >
                  <Image
                    style={{ height: 23, width: 23, resizeMode: 'contain' }}
                    source={require('../assets/Images/google.png')}
                  />
                  <Text
                    style={{
                      fontSize: responsiveFontSize(2.1),
                      color: 'Black',
                      fontWeight: 'bold',
                    }}
                  >
                    Sign up using Google
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      </>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',

          marginBottom: responsiveHeight(6),
          gap: 10,
        }}
      >
        <Animated.View entering={SlideInLeft.duration(500).delay(50)}>
          <Text
            style={{
              fontSize: responsiveFontSize(1.7), //17
              color: '#585858ff',
              fontWeight: '400',
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
              // paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 25,
              width: responsiveWidth(24),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'pink',
              backgroundColor: 'white',
            })}
          >
            <Text
              style={{
                fontSize: responsiveFontSize(1.8), //16
                color: 'black',
                fontWeight: 'bold',
              }}
            >
              SIGN IN
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({});
