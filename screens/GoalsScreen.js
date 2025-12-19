import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const GoalsScreen = () => {
  const [goals, setGoals] = useState('');
  const usenavigation = useNavigation();
  const handleNextLifeStyle = () => {
    usenavigation.navigate('LifeStyle');
  };
  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      <View style={{ marginTop: 50, marginHorizontal: 20, marginLeft: 30 }}>
        <Text
          style={{
            fontSize: 35,
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
      </View>
      <View
        style={{
          alignItems: 'center',

          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 140,
        }}
      >
        <View>
          <Pressable
            onPress={() => setGoals('Long-term Parter')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              opacity: goals && goals !== 'Long-term Parter' ? 0.6 : 1,
              marginTop: 10,
              width: 377,
              height: 60,
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
                style={{ height: 60, width: 60 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Long-term Partner
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
      <View
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
              width: 377,
              height: 60,
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
                gap: 20,
              }}
            >
              <Image
                source={require('../assets/Images/wine.png')}
                style={{ height: 55, width: 55 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Short-term Fun
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
      <View
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
              width: 377,
              height: 60,
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
                style={{ height: 55, width: 55 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Making new Friends
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
      <View
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
            width: 377,
            height: 60,

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
              style={{ height: 50, width: 50 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '500',
                color: 'black',
              }}
            >
              Still Figuring Out
            </Text>
          </View>
        </Pressable>
      </View>
      <Text
        style={{
          marginLeft: 45,
          marginTop: 'auto',
          justifyContent: 'flex-start',
          color: 'gray',
        }}
      >
        This will be shown on your profile. You can always change it later.
      </Text>
      <Pressable
        onPress={handleNextLifeStyle}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.96 : 1 }],

          backgroundColor: '#ff0090ff',

          padding: 15,
          margin: 20,

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
    </SafeAreaView>
  );
};

export default GoalsScreen;

const styles = StyleSheet.create({});
