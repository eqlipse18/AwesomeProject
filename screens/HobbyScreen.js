import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';

import { useNavigation } from '@react-navigation/native';

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
const HobbyScreen = () => {
  const usenavigation = useNavigation();
  const handleNextFinal = () => {
    usenavigation.navigate('Final');
  };
  const [selectedHobbies, setSelectedHobbies] = useState([]);
  const hobbies = [
    '🚴‍♂️ Cycling',
    '🥾 Hiking',
    '🚵‍♂️ Biking',
    '🏕️ Camping',
    '🚤 Sailing / Rafting',
    '🐎 Horseback Riding',
    '🎵 Music',
    '💃 Dancing',
    '☕ Coffee',
    '🎬 Netflix & Movies',
    '🎧 Indie Music',
    '🎨 Urban Sketching',
    '🎭 Theater / Acting',
    '🍳 Cooking',
    '✈️ Traveling',
    '🏙️ Exploring Cities',
    '📸 Photography',
    '🌌 Stargazing',
    '🌱 Gardening',
    '🧘‍♂️ Yoga & Meditation',
    '🎮 Gaming',
    '✏️ Drawing',
    '🏋️‍♂️ Fitness',
    '📖 Reading',
    '📝 Writing',
    '🏎️ F1 Racing',
    '🏁 Car Racing',
    '🎲 Board Games',
    '🎤 Karaoke',
    '🛹 Skateboarding',
    '🧗‍♂️ Rock Climbing',
    '🍷 Wine Tasting',
    '🍺 Craft Beer Tasting',
    '📚 Travel Blogging',
    '🪁 Kite Flying',
    '🏊 Swimming',
    '🤿 Diving',
    '⛷️ Skiing / Snowboarding',
    '🛶 Kayaking / Canoeing',
    '🚣 Rowing',
    '🧩 Puzzles / Brain Games',
    '🎮 Esports / Competitive Gaming',
    '🛋️ DIY Crafts',
    '🍰 Baking',
    '🌿 Vegan Cooking',
    '🖥️ Coding / Programming',
    '📹 Vlogging / Video Editing',
  ];
  const toggleHobby = hobby => {
    if (selectedHobbies.includes(hobby)) {
      setSelectedHobbies(selectedHobbies.filter(h => h !== hobby));
    } else {
      setSelectedHobbies([...selectedHobbies, hobby]);
    }
  };
  const isValid = selectedHobbies.length > 0;
  const _damping = 15;
  const _stiffness = 300;
  const _damping1 = 15;
  const _entering = FadeInDown.springify();

  // .damping(_damping1)
  // .stiffness(_stiffness);
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
        layout={_layout}
        style={{
          marginTop: responsiveHeight(5), //50

          marginLeft: responsiveWidth(8), //30
        }}
      >
        <Text
          style={{
            fontSize: responsiveFontSize(4), //35
            fontFamily: 'Geeza-Pro-Bold',
            fontWeight: 'bold',
          }}
        >
          Pick your Interest and Hobbies
        </Text>
        <Text
          style={{
            marginLeft: 5,

            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          Pick the hobbies you really love — we’ll find your perfect match!
        </Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View
          layout={_layout}
          entering={_entering}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginHorizontal: responsiveWidth(8), //30

            paddingTop: responsiveHeight(3), //30
          }}
        >
          {hobbies.map(hobby => (
            <Pressable
              key={hobby}
              onPress={() => toggleHobby(hobby)}
              style={({ pressed }) => ({
                transform: [
                  {
                    scale: pressed
                      ? 0.95
                      : selectedHobbies.includes(hobby)
                      ? 1.05
                      : 1,
                  },
                ],
                paddingVertical: 8,
                paddingHorizontal: responsiveWidth(3), //15
                borderRadius: 30,

                borderWidth: 1.5,
                marginBottom: 10,
                backgroundColor: selectedHobbies.includes(hobby)
                  ? '#fd2772' // pink
                  : '#f7f6ff',

                borderColor: selectedHobbies.includes(hobby)
                  ? '#ff85b5' // pink-ish, soft border
                  : '#CFCFCF',
                // width: 82,
                // height: 104,
                // borderRadius: 30,
                // borderColor: gender === 'Male' ? '#E79FE9' : '#F7F6FF',
                // borderWidth: 2.05,
                // backgroundColor: '#fff',
                // elevation: 8,
                // shadowColor: '#000',
                // shadowOpacity: 0.15,
                // shadowRadius: 10,
                // shadowOffset: { width: 0, height: 4 },
                // justifyContent: 'center',
                // alignItems: 'center',
                // gap: 10,
              })}
            >
              <Text
                style={{
                  color: selectedHobbies.includes(hobby) ? 'white' : 'black',
                  fontWeight: '500',
                }}
              >
                {hobby}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
      <Animated.View
        layout={_layout}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <Pressable
          onPress={handleNextFinal}
          // disabled={!isLifeStyleValid}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            // opacity: isLifeStyleValid ? 1 : 0.6,

            backgroundColor: '#ff0090ff',

            padding: 15,
            width: responsiveWidth(85),
            paddingVertical: 10,
            margin: 10,

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
            Add Hobbies To Profile
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
};

export default HobbyScreen;

const styles = StyleSheet.create({});
