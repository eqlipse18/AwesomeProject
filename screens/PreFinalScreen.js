import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
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

const PreFinalScreen = () => {
  const navigation = useNavigation();
  const _damping = 15;
  const _stiffness = 300;
  const _damping1 = 10;
  const _entering = FadeInDown.springify();

  // .damping(_damping1)
  // .stiffness(_stiffness);
  const _entering1 = FadeInDown.springify()
    // .delay(100)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _entering2 = FadeInDown.springify()
    .delay(150)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _entering3 = FadeInDown.springify()
    .delay(200)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _layout = LinearTransition.springify();

  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      <Animated.View
        layout={_layout}
        style={{
          marginTop: responsiveHeight(8), //80

          marginLeft: responsiveWidth(8),
        }}
      >
        <Text
          style={{
            fontSize: responsiveFontSize(3.8), //32
            fontWeight: 'bold',
            fontFamily: 'GeezaPro-Bold',
          }}
        >
          All set to register
        </Text>
        <Text
          style={{
            fontSize: responsiveFontSize(3.4), //32
            fontWeight: 'bold',
            fontFamily: 'GeezaPro-Bold',
          }}
        >
          Setting up Your Profile for you.
        </Text>
      </Animated.View>
      <Animated.View layout={_layout} entering={_entering1}>
        <LottieView
          style={{
            height: responsiveHeight(26), //260
            width: responsiveWidth(60), //300
            alignSelf: 'center',
            marginTop: responsiveHeight(4), //40
            justifyContent: 'center',
          }}
          source={require('../assets/animations/Love.json')}
          autoPlay
          loop
        />
      </Animated.View>
      <Animated.View
        layout={_layout}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 'auto',
        }}
      >
        <Pressable
          onPress={() => navigation.navigate('Home')}
          style={{
            backgroundColor: '#ff0090ff',
            padding: 15,
            margin: 20,
            width: responsiveWidth(85),
            paddingVertical: 10,

            borderRadius: 35,
            borderStyle: 'solid',
            borderColor: '#ff00aaff',
            borderWidth: 2,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Finish Registering
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
};

export default PreFinalScreen;

const styles = StyleSheet.create({});
