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

const LifestyleScreen = () => {
  const [drink, setDrink] = useState('');
  const [smoke, setSmoke] = useState('');
  const [isLifeStyleValid, setIsLifeStyleValid] = useState(false);
  const usenavigation = useNavigation();
  const handleNextHomeJob = () => {
    usenavigation.navigate('HomeJob');
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
          Your Lifestyle Choices
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 25,
          }}
        >
          <Image
            source={require('../assets/Images/wine.png')}
            style={{ height: 45, width: 45 }}
          />
          <Text
            style={{
              fontSize: 25,

              fontWeight: '500',
            }}
          >
            Do you drink ?
          </Text>
        </View>
      </View>
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
          <Pressable
            onPress={() => setDrink('Never')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              opacity: drink && drink !== 'Never' ? 0.6 : 1,
              marginTop: 15,

              width: 300,
              height: 40,
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
                  fontSize: 18,
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Never
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setDrink('Rarely')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              opacity: drink && drink !== 'Rarely' ? 0.6 : 1,

              width: 300,
              height: 40,
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
                  fontSize: 18,
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Rarely
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setDrink('Occasionally')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              opacity: drink && drink !== 'Occasionally' ? 0.6 : 1,

              width: 300,
              height: 40,
              borderRadius: 10,
              backgroundColor: drink === 'Occasionally' ? '#EEF6FF' : '#F8F8FF',
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
                  fontSize: 18,
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Occasionally
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setDrink('Socially')}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],

              opacity: drink && drink !== 'Socially' ? 0.6 : 1,

              width: 300,
              height: 40,
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
                  fontSize: 18,
                  fontWeight: '500',
                  color: 'black',
                }}
              >
                Socially
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
      <View style={{ marginTop: 50, marginHorizontal: 20, marginLeft: 30 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 25,
          }}
        >
          <Image
            source={require('../assets/Images/cigarette.png')}
            style={{ height: 40, width: 40 }}
          />
          <Text
            style={{
              fontSize: 25,

              fontWeight: '500',
            }}
          >
            Do you Smoke ?
          </Text>
        </View>
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
            <Pressable
              onPress={() => setSmoke('Never')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: smoke && smoke !== 'Never' ? 0.6 : 1,
                marginTop: 15,

                width: 300,
                height: 40,
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
                    fontSize: 18,
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Never
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setSmoke('Occasionally')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: smoke && smoke !== 'Occasionally' ? 0.6 : 1,

                width: 300,
                height: 40,
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
                    fontSize: 18,
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Occasionally
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setSmoke('Regularly')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: smoke && smoke !== 'Regularly' ? 0.6 : 1,

                width: 300,
                height: 40,
                borderRadius: 10,
                backgroundColor: smoke === 'Regularly' ? '#EEF6FF' : '#F8F8FF',
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
                    fontSize: 18,
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Regularly
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setSmoke('Trying to Quit')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],

                opacity: smoke && smoke !== 'Trying to Quit' ? 0.6 : 1,

                width: 300,
                height: 40,
                borderRadius: 10,
                backgroundColor:
                  smoke === 'Trying to Quit' ? '#EEF6FF' : '#F8F8FF',
                borderRadius: 35,
                borderWidth: 1,
                borderColor: smoke === 'Trying to Quit' ? '#599FDD' : '#CFCFCF',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '500',
                    color: 'black',
                  }}
                >
                  Trying to Quit
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
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
        onPress={handleNextHomeJob}
        disabled={!isLifeStyleValid}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: isLifeStyleValid ? 1 : 0.6,

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

export default LifestyleScreen;

const styles = StyleSheet.create({});
