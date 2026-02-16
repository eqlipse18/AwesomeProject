import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { useNavigation } from '@react-navigation/native';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveScreenWidth,
  responsiveWidth,
} from 'react-native-responsive-dimensions';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';

const NameScreen = () => {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [activeInput, setActiveInput] = useState(null);

  const navigation = useNavigation();
  const handleNextSetup = () => {
    navigation.navigate('Setup');
  };

  const _damping = 15;
  const _stiffness = 300;
  const _damping1 = 15;
  const _layout = LinearTransition.springify();
  const _entering = FadeInDown.springify()
    // .damping(_damping1)
    .stiffness(_stiffness);
  const _entering1 = FadeInDown.springify()
    .delay(150)
    // .damping(_damping1)
    .stiffness(_stiffness);
  // const _entering2 = FadeInDown.springify()
  //   .delay(350)
  //   .damping(_damping1)
  //   .stiffness(_stiffness);
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
          marginTop: responsiveHeight(6),
          // marginHorizontal: 20,
          marginLeft: responsiveScreenWidth(8), //30
        }}
      >
        <Text
          style={{
            fontSize: responsiveFontSize(3.5), //32
            fontFamily: 'Geeza-Pro-Bold',
            fontWeight: 'bold',
          }}
        >
          My First Name is
        </Text>
      </Animated.View>
      <Animated.View layout={_layout} entering={_entering}>
        <TextInput
          value={firstName}
          autoFocus={true}
          autoCorrect={false}
          onChangeText={text => setFirstName(text)}
          placeholder="eg Noah R "
          placeholderTextColor={'#959494ff'}
          onFocus={() => setActiveInput('firstName')}
          onBlur={() => setActiveInput(null)}
          paddingleft={15}
          fontSize={18}
          style={{
            width: responsiveWidth(85),
            height: responsiveHeight(6),
            marginLeft: responsiveScreenWidth(8), //35
            marginTop: responsiveHeight(2.5), //25
            paddingLeft: 15,
            backgroundColor:
              activeInput === 'firstName' ? '#FFFFFF' : '#F7F6FF',
            borderWidth: 1.2,
            borderColor: activeInput === 'firstName' ? '#599FDD' : '#E0E0E0',
            transform: [{ scale: activeInput === 'firstName' ? 1.02 : 1 }],
            borderRadius: 10,
            color: '#4d4d4d',
            fontWeight: '500',
          }}
        />

        <Text
          style={{
            marginLeft: responsiveScreenWidth(10), //45
            marginTop: 3,
            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          This is how it will appear in Flame
        </Text>
      </Animated.View>
      <Animated.View layout={_layout} entering={_entering1}>
        <TextInput
          value={lastName}
          onChangeText={text => setLastName(text)}
          placeholder="Last Name   (Optional)"
          placeholderTextColor={'#959494ff'}
          onFocus={() => setActiveInput('lastName')}
          onBlur={() => setActiveInput(null)}
          paddingLeft={15}
          fontSize={18}
          style={{
            width: responsiveWidth(85),
            height: responsiveHeight(6),
            marginLeft: responsiveScreenWidth(8), //35
            marginTop: 10, //25
            paddingLeft: 15,
            backgroundColor: activeInput === 'lastName' ? '#FFFFFF' : '#F7F6FF',
            borderWidth: 1.2,
            borderColor: activeInput === 'lastName' ? '#599FDD' : '#E0E0E0',
            borderRadius: 10,
            color: '#4d4d4d',
            fontWeight: '500',
            transform: [{ scale: activeInput === 'lastName' ? 1.02 : 1 }],
          }}
        />

        <Text
          style={{
            marginLeft: responsiveScreenWidth(10), //45
            marginTop: 3,
            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          You can always change it later after profile setup
        </Text>
      </Animated.View>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          onPress={handleNextSetup}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
            marginTop: responsiveHeight(12), //100
            width: responsiveWidth(60),
            paddingVertical: 10,
            borderRadius: 25,
            backgroundColor: '#FF0059',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default NameScreen;

const styles = StyleSheet.create({});
