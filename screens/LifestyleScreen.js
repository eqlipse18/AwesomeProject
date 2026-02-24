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

const LifestyleScreen = () => {
  const [drink, setDrink] = useState('');
  const [smoke, setSmoke] = useState('');
  const [isLifeStyleValid, setIsLifeStyleValid] = useState(false);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      getRegistrationProgress('LifeStyle').then(progressData => {
        if (progressData) {
          setDrink(progressData.drink || '');
          setSmoke(progressData.smoke || '');
        }
      });
    }, []),
  );

  const handleNextHomeJob = () => {
    if (drink.trim() !== '' && smoke.trim() !== '') {
      console.log('drink:', drink);
      console.log('smoke:', smoke);
      saveRegistrationProgress('LifeStyle', { drink, smoke });
    }
    navigation.navigate('HomeJob');
  };

  useEffect(() => {
    const drinkValid =
      drink === 'Never' ||
      drink === 'Rarely' ||
      drink === 'Occasionally' ||
      drink === 'Socially';

    const smokeValid =
      smoke === 'Never' ||
      smoke === 'Occasionally' ||
      smoke === 'Regularly' ||
      smoke === 'Trying to Quit';

    if (drinkValid && smokeValid) {
      setIsLifeStyleValid(true);
    } else {
      setIsLifeStyleValid(false);
    }
  }, [drink, smoke]);

  const _damping = 15;
  const _stiffness = 150;
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
          marginTop: responsiveHeight(1), //50
          marginLeft: responsiveWidth(8), //30
        }}
      >
        <Text
          style={{
            fontSize: responsiveFontSize(3.5), //35
            fontFamily: 'Geeza-Pro-Bold',
            fontWeight: 'bold',
          }}
        >
          Your Lifestyle Choices
        </Text>
        <Text
          style={{
            marginLeft: 5,
            fontSize: responsiveFontSize(1.4), //16
            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          Be real — it helps us match you better
        </Text>
      </Animated.View>

      <Animated.View
        // entering={_entering}
        // layout={_layout}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: responsiveHeight(3), //25
          marginLeft: responsiveWidth(8), //30
        }}
      >
        <Image
          source={require('../assets/Images/wine.png')}
          style={{
            height: responsiveHeight(5), //60
            width: responsiveWidth(10),
          }}
        />
        <Text
          style={{
            fontSize: responsiveFontSize(3), //25

            fontWeight: '500',
          }}
        >
          Do you drink ?
        </Text>
      </Animated.View>

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 20,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 10,
          }}
        >
          <Animated.View layout={_layout} entering={_entering}>
            <Pressable
              onPress={() => setDrink('Never')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: drink && drink !== 'Never' ? 0.6 : 1,
                marginTop: 15,

                width: responsiveWidth(85), //300
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: drink === 'Never' ? '#EEF6FF' : '#F8F8FF',
                borderRadius: 35,
                borderWidth: 1,
                borderColor: drink === 'Never' ? '#599FDD' : '#CFCFCF',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <View>
                <Text
                  style={{
                    fontSize: responsiveFontSize(2),
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Never
                </Text>
              </View>
            </Pressable>
          </Animated.View>
          <Animated.View layout={_layout} entering={_entering1}>
            <Pressable
              onPress={() => setDrink('Rarely')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: drink && drink !== 'Rarely' ? 0.6 : 1,
                width: responsiveWidth(85), //300
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: drink === 'Rarely' ? '#EEF6FF' : '#F8F8FF',
                borderRadius: 35,
                borderWidth: 1,
                borderColor: drink === 'Rarely' ? '#599FDD' : '#CFCFCF',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <View>
                <Text
                  style={{
                    fontSize: responsiveFontSize(2),
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Rarely
                </Text>
              </View>
            </Pressable>
          </Animated.View>
          <Animated.View layout={_layout} entering={_entering2}>
            <Pressable
              onPress={() => setDrink('Occasionally')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: drink && drink !== 'Occasionally' ? 0.6 : 1,

                width: responsiveWidth(85), //300
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor:
                  drink === 'Occasionally' ? '#EEF6FF' : '#F8F8FF',
                borderRadius: 35,
                borderWidth: 1,
                borderColor: drink === 'Occasionally' ? '#599FDD' : '#CFCFCF',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <View>
                <Text
                  style={{
                    fontSize: responsiveFontSize(2),
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Occasionally
                </Text>
              </View>
            </Pressable>
          </Animated.View>
          <Animated.View layout={_layout} entering={_entering3}>
            <Pressable
              onPress={() => setDrink('Socially')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: drink && drink !== 'Socially' ? 0.6 : 1,

                width: responsiveWidth(85), //300
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: drink === 'Socially' ? '#EEF6FF' : '#F8F8FF',
                borderRadius: 35,
                borderWidth: 1,
                borderColor: drink === 'Socially' ? '#599FDD' : '#CFCFCF',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <View>
                <Text
                  style={{
                    fontSize: responsiveFontSize(2),
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Socially
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
      <View
        style={{
          marginTop: responsiveHeight(3), //50
          marginLeft: responsiveWidth(8),
        }}
      >
        <Animated.View
          // entering={_entering}
          // layout={_layout}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            // marginTop: responsiveHeight(3), //25
          }}
        >
          <Image
            source={require('../assets/Images/cigarette.png')}
            style={{
              height: responsiveHeight(3.9), //60
              width: responsiveWidth(8.9),
            }}
          />
          <Text
            style={{
              fontSize: responsiveFontSize(3), //25

              fontWeight: '500',
            }}
          >
            Do you Smoke ?
          </Text>
        </Animated.View>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: 20,
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 10,
            }}
          >
            <Animated.View layout={_layout} entering={_entering}>
              <Pressable
                onPress={() => setSmoke('Never')}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],

                  opacity: smoke && smoke !== 'Never' ? 0.6 : 1,
                  marginTop: 15,

                  width: responsiveWidth(85), //300
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: smoke === 'Never' ? '#EEF6FF' : '#F8F8FF',
                  borderRadius: 35,
                  borderWidth: 1,
                  borderColor: smoke === 'Never' ? '#599FDD' : '#CFCFCF',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <View>
                  <Text
                    style={{
                      fontSize: responsiveFontSize(2),
                      fontWeight: '500',
                      color: 'black',
                    }}
                  >
                    Never
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
            <Animated.View layout={_layout} entering={_entering1}>
              <Pressable
                onPress={() => setSmoke('Occasionally')}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],

                  opacity: smoke && smoke !== 'Occasionally' ? 0.6 : 1,

                  width: responsiveWidth(85), //300
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor:
                    smoke === 'Occasionally' ? '#EEF6FF' : '#F8F8FF',
                  borderRadius: 35,
                  borderWidth: 1,
                  borderColor: smoke === 'Occasionally' ? '#599FDD' : '#CFCFCF',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <View>
                  <Text
                    style={{
                      fontSize: responsiveFontSize(2),
                      fontWeight: '500',
                      color: 'black',
                    }}
                  >
                    Occasionally
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
            <Animated.View layout={_layout} entering={_entering2}>
              <Pressable
                onPress={() => setSmoke('Regularly')}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],

                  opacity: smoke && smoke !== 'Regularly' ? 0.6 : 1,

                  width: responsiveWidth(85), //300
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor:
                    smoke === 'Regularly' ? '#EEF6FF' : '#F8F8FF',
                  borderRadius: 35,
                  borderWidth: 1,
                  borderColor: smoke === 'Regularly' ? '#599FDD' : '#CFCFCF',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <View>
                  <Text
                    style={{
                      fontSize: responsiveFontSize(2),
                      fontWeight: '500',
                      color: 'black',
                    }}
                  >
                    Regularly
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
            <Animated.View layout={_layout} entering={_entering3}>
              <Pressable
                onPress={() => setSmoke('Trying to Quit')}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],

                  opacity: smoke && smoke !== 'Trying to Quit' ? 0.6 : 1,

                  width: responsiveWidth(85), //300
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor:
                    smoke === 'Trying to Quit' ? '#EEF6FF' : '#F8F8FF',
                  borderRadius: 35,
                  borderWidth: 1,
                  borderColor:
                    smoke === 'Trying to Quit' ? '#599FDD' : '#CFCFCF',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <View>
                  <Text
                    style={{
                      fontSize: responsiveFontSize(2),
                      fontWeight: '500',
                      color: 'black',
                    }}
                  >
                    Trying to Quit
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
      <Text
        style={{
          fontSize: responsiveFontSize(1.4), //16
          marginLeft: responsiveWidth(11), //45

          marginTop: responsiveHeight(6),
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
          onPress={handleNextHomeJob}
          disabled={!isLifeStyleValid}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: isLifeStyleValid ? 1 : 0.6,

            backgroundColor: '#ff0090ff',

            width: responsiveWidth(85),
            paddingVertical: 10,
            borderRadius: 35,
            borderStyle: 'solid',
            borderColor: '#ff00aaff',
            borderWidth: 2,
            marginTop: 5,
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

export default LifestyleScreen;

const styles = StyleSheet.create({});
