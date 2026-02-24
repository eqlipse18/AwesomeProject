import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import {
  responsiveFontSize,
  responsiveHeight,
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
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../utils/registrationUtils';

const GoalsScreen = () => {
  const [goals, setGoals] = useState('');
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      getRegistrationProgress('Goals').then(progressData => {
        if (progressData) {
          setGoals(progressData.goals || '');
        }
      });
    }, []),
  );

  const handleNextLifeStyle = () => {
    if (goals.trim() !== '') {
      console.log('Goals:', goals);
      saveRegistrationProgress('Goals', { goals });
    }
    navigation.navigate('LifeStyle');
  };
  const _damping = 15;
  const _stiffness = 300;
  const _damping1 = 15;
  const _entering = FadeInDown.springify()

    .damping(_damping1)
    .stiffness(_stiffness);
  const _entering1 = FadeInDown.springify()
    .delay(100)
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
        // entering={_entering}
        layout={_layout}
        style={{
          marginTop: responsiveHeight(6), //50
          marginLeft: responsiveWidth(8), //30
        }}
      >
        <Text
          style={{
            fontSize: responsiveFontSize(4), //32
            fontFamily: 'Geeza-Pro-Bold',
            fontWeight: 'bold',
          }}
        >
          RelationShip Goals
        </Text>
        <Text
          style={{
            marginLeft: 5,

            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          Be real — it helps us match you better
        </Text>
      </Animated.View>
      <Animated.View
        entering={_entering}
        layout={_layout}
        style={{
          alignItems: 'center',

          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: responsiveHeight(17), //140
        }}
      >
        <View>
          <Pressable
            onPress={() => setGoals('Long-term Parter')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              opacity: goals && goals !== 'Long-term Parter' ? 0.6 : 1,

              width: responsiveWidth(85), //377
              height: responsiveHeight(6), //60
              borderRadius: 10,
              backgroundColor:
                goals === 'Long-term Parter' ? '#EEF6FF' : '#F8F8FF',
              borderRadius: 35,
              borderWidth: 1,
              borderColor: goals === 'Long-term Parter' ? '#599FDD' : '#CFCFCF',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 10,
              }}
            >
              <Image
                source={require('../assets/Images/twoheart.png')}
                style={{
                  height: responsiveHeight(6), //60
                  width: responsiveWidth(13), //60
                }}
              />
              <Text
                style={{
                  fontSize: responsiveFontSize(2),
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Long-term Partner
              </Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
      <Animated.View
        entering={_entering1}
        layout={_layout}
        style={{
          alignItems: 'center',

          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <View>
          <Pressable
            onPress={() => setGoals('Short-term Fun')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              marginTop: 15,

              width: responsiveWidth(85), //377
              height: responsiveHeight(6), //60
              borderRadius: 10,
              opacity: goals && goals !== 'Short-term Fun' ? 0.6 : 1,
              backgroundColor:
                goals === 'Short-term Fun' ? '#EEF6FF' : '#F8F8FF',

              borderRadius: 35,
              borderWidth: 1,
              borderColor: goals === 'Short-term Fun' ? '#599FDD' : '#CFCFCF',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 15,
              }}
            >
              <Image
                source={require('../assets/Images/wine.png')}
                style={{
                  height: responsiveHeight(5), //60
                  width: responsiveWidth(11),
                }}
              />
              <Text
                style={{
                  fontSize: responsiveFontSize(2),
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Short-term Fun
              </Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
      <Animated.View
        entering={_entering2}
        layout={_layout}
        style={{
          alignItems: 'center',

          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <View>
          <Pressable
            onPress={() => setGoals('Making new Friends')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              opacity: goals && goals !== 'Making new Friends' ? 0.6 : 1,
              marginTop: 15,

              width: responsiveWidth(85), //377
              height: responsiveHeight(6), //60
              borderRadius: 10,

              backgroundColor:
                goals === 'Making new Friends' ? '#EEF6FF' : '#F8F8FF',
              borderRadius: 35,
              borderWidth: 1,
              borderColor:
                goals === 'Making new Friends' ? '#599FDD' : '#CFCFCF',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 15,
              }}
            >
              <Image
                source={require('../assets/Images/friend.png')}
                style={{
                  height: responsiveHeight(5), //60
                  width: responsiveWidth(11),
                }}
              />
              <Text
                style={{
                  fontSize: responsiveFontSize(2),
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Making new Friends
              </Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
      <Animated.View
        entering={_entering3}
        layout={_layout}
        style={{
          alignItems: 'center',

          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <Pressable
          onPress={() => setGoals('Still Figuring Out')}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.97 : 1 }],

            opacity: goals && goals !== 'Still Figuring Out' ? 0.6 : 1,
            marginTop: 15,

            width: responsiveWidth(85), //377
            height: responsiveHeight(6), //60
            backgroundColor:
              goals === 'Still Figuring Out' ? '#EEF6FF' : '#F8F8FF',

            borderRadius: 35,
            borderWidth: 1,
            borderColor: goals === 'Still Figuring Out' ? '#599FDD' : '#CFCFCF',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 15,
            }}
          >
            <Image
              source={require('../assets/Images/questionmark.png')}
              style={{
                height: responsiveHeight(5), //60
                width: responsiveWidth(9),
              }}
            />
            <Text
              style={{
                fontSize: responsiveFontSize(2),
                fontWeight: '500',
                color: 'black',
              }}
            >
              Still Figuring Out
            </Text>
          </View>
        </Pressable>
      </Animated.View>
      <Text
        style={{
          fontSize: responsiveFontSize(1.4), //16
          marginLeft: responsiveWidth(11), //45
          marginTop: responsiveHeight(25), //40
          justifyContent: 'flex-start',
          color: 'gray',
        }}
      >
        This will be shown on your profile. You can always change it later.
      </Text>
      <Animated.View
        layout={_layout}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <Pressable
          onPress={handleNextLifeStyle}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],

            backgroundColor: '#ff0090ff',

            width: responsiveWidth(85),
            paddingVertical: 10,
            marginTop: 5,
            borderRadius: 35,
            borderStyle: 'solid',
            borderColor: '#ff00aaff',
            borderWidth: 2,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 5,
            },
            shadowOpacity: 0.5,
            shadowRadius: 4.65,

            elevation: 6,
          })}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Continue
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
};

export default GoalsScreen;

const styles = StyleSheet.create({});
