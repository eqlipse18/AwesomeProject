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
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        source={require('../assets/Images/bg.jpg')}
      />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={require('../assets/Images/logo.png')}
          resizeMode="contain"
          style={{
            height: 150,
            width: 150,
            marginTop: 145,
          }}
        />
      </View>
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 18,
            color: '#3e3d3dff',
            fontWeight: 'bold',
            marginRight: 10,
            alignItems: 'center',

            marginleft: 100,
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
                style={{
                  backgroundColor: '#FF0059',
                  padding: 10,
                  width: 380,
                  height: 50,
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#fc86abff',
                }}
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
                      height: 30,
                      width: 30,
                      tintColor: 'white',
                    }}
                    source={require('../assets/Images/email.png')}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      color: 'white',
                      fontWeight: 'bold',
                      padding: 3,
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
                style={{
                  backgroundColor: 'white',
                  padding: 10,
                  width: 380,
                  height: 50,
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 10,
                  borderWidth: 1,
                  borderColor: 'pink',
                  backgroundColor: 'white',
                }}
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
                    style={{ height: 30, width: 30 }}
                    source={require('../assets/Images/google.png')}
                  />
                  <Text
                    style={{
                      fontSize: 18,
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
          marginBottom: 60,
          marginTop: 10,
        }}
      >
        <Animated.View entering={SlideInLeft.duration(500).delay(50)}>
          <Text
            style={{
              fontSize: 17,
              color: '#585858ff',
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
