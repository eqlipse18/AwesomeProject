import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const HomeJobScreen = () => {
  const usenavigation = useNavigation();
  const handleNextHeight = () => {
    usenavigation.navigate('Photo');
  };
  const [hometown, setHomeTown] = useState('');
  const [jobtittle, setJobTittle] = useState('');
  const [activeInput, setActiveInput] = useState(null);

  const [heightCm, setHeightCm] = useState(null);
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [unit, setUnit] = useState('ft'); // 'ft' or 'cm'

  const cmToFeet = cm => {
    const totalInches = Math.round(cm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return { feet, inch };
  };

  // convert ft + in to cm
  const feetToCm = (ft, inch) => Math.round((ft * 12 + inch) * 2.54);

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
          Your basic details
        </Text>
        <Text
          style={{
            marginLeft: 5,

            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          Be real — it helps us personalize your matches
        </Text>
      </View>
      <View style={{ marginTop: 10, marginHorizontal: 20, marginLeft: 30 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 25,
          }}
        >
          <Image
            source={require('../assets/Images/height.png')}
            style={{ height: 30, width: 30 }}
          />
          <Text
            style={{
              fontSize: 25,

              fontWeight: '500',
            }}
          >
            Whats your Height ?
          </Text>
        </View>
        <View>
          <Pressable
            onPress={() => setShowHeightPicker(true)}
            style={{
              width: 360,
              height: 55,
              marginLeft: 5,
              marginTop: 25,
              paddingLeft: 15,
              justifyContent: 'center',
              backgroundColor: activeInput === 'height' ? '#FFFFFF' : '#F7F6FF',
              borderWidth: 1.2,
              borderColor: activeInput === 'height' ? '#599FDD' : '#E0E0E0',
              transform: [{ scale: activeInput === 'height' ? 1.02 : 1 }],
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                color: heightCm ? '#4d4d4d' : '#959494ff',
                fontWeight: '500',
              }}
            >
              {heightCm
                ? unit === 'cm'
                  ? `${heightCm} cm`
                  : `${cmToFeet(heightCm).feet}' ${cmToFeet(heightCm).inch}"`
                : 'Height'}
            </Text>
          </Pressable>
        </View>
        {/* Modal */}
        <Modal visible={showHeightPicker} transparent animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: '#00000055',
            }}
          >
            <View
              style={{
                backgroundColor: 'white',
                padding: 20,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}
              >
                Select your height
              </Text>

              {/* Unit toggle */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginBottom: 15,
                }}
              >
                {['ft', 'cm'].map(u => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    style={{
                      marginHorizontal: 10,
                      paddingVertical: 5,
                      paddingHorizontal: 15,
                      borderRadius: 20,
                      backgroundColor: unit === u ? '#ff0090ff' : '#F7F6FF',
                    }}
                  >
                    <Text
                      style={{
                        color: unit === u ? '#fff' : '#4d4d4d',
                        fontWeight: '500',
                      }}
                    >
                      {u.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Scrollable Picker */}
              <ScrollView style={{ height: 180 }}>
                {unit === 'cm'
                  ? Array.from({ length: 61 }, (_, i) => 140 + i).map(h => (
                      <Pressable
                        key={h}
                        onPress={() => setHeightCm(h)}
                        style={{ paddingVertical: 12 }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            textAlign: 'center',
                            color: heightCm === h ? '#ff0090ff' : '#4d4d4d',
                          }}
                        >
                          {h} cm
                        </Text>
                      </Pressable>
                    ))
                  : Array.from({ length: 4 }, (_, f) => f + 4).flatMap(ft =>
                      Array.from({ length: 12 }, (_, i) => {
                        const cm = feetToCm(ft, i);
                        return (
                          <Pressable
                            key={`${ft}-${i}`}
                            onPress={() => setHeightCm(cm)}
                            style={{ paddingVertical: 12 }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                textAlign: 'center',
                                color:
                                  heightCm === cm ? '#ff0090ff' : '#4d4d4d',
                              }}
                            >
                              {ft}' {i}"
                            </Text>
                          </Pressable>
                        );
                      }),
                    )}
              </ScrollView>

              {/* Done button */}
              <Pressable
                onPress={() => {
                  setShowHeightPicker(false);
                  setActiveInput(null);
                }}
                style={{
                  marginTop: 20,
                  backgroundColor: '#ff0090ff',
                  padding: 12,
                  borderRadius: 30,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
      {heightCm && (
        <View>
          <View style={{ marginTop: 10, marginHorizontal: 20, marginLeft: 30 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: 25,
              }}
            >
              <Image
                source={require('../assets/Images/location.png')}
                style={{ height: 30, width: 30 }}
              />
              <Text
                style={{
                  fontSize: 25,

                  fontWeight: '500',
                }}
              >
                Where do you Live ?
              </Text>
            </View>
          </View>
          <View>
            <TextInput
              value={hometown}
              onChangeText={text => setHomeTown(text)}
              placeholder="HomeTown"
              placeholderTextColor={'#959494ff'}
              onFocus={() => setActiveInput('hometown')}
              onBlur={() => setActiveInput(null)}
              paddingleft={15}
              fontSize={18}
              style={{
                width: 360,
                height: 55,
                marginLeft: 35,
                marginTop: 25,
                paddingLeft: 15,
                backgroundColor:
                  activeInput === 'hometown' ? '#FFFFFF' : '#F7F6FF',
                borderWidth: 1.2,
                borderColor: activeInput === 'hometown' ? '#599FDD' : '#E0E0E0',
                transform: [{ scale: activeInput === 'hometown' ? 1.02 : 1 }],
                borderRadius: 10,
                color: '#4d4d4d',
                fontWeight: '500',
              }}
            />
          </View>
        </View>
      )}
      {heightCm && hometown && (
        <View>
          <View style={{ marginTop: 10, marginHorizontal: 20, marginLeft: 30 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: 25,
              }}
            >
              <Image
                source={require('../assets/Images/suitcase.png')}
                style={{ height: 30, width: 30 }}
              />
              <Text
                style={{
                  fontSize: 25,

                  fontWeight: '500',
                }}
              >
                Whats your Job title ?
              </Text>
            </View>
          </View>

          <View>
            <TextInput
              value={jobtittle}
              onChangeText={text => setJobTittle(text)}
              placeholder="Student"
              placeholderTextColor={'#959494ff'}
              onFocus={() => setActiveInput('jobtittle')}
              onBlur={() => setActiveInput(null)}
              paddingleft={15}
              fontSize={18}
              style={{
                width: 360,
                height: 55,
                marginLeft: 35,
                marginTop: 25,
                paddingLeft: 15,
                backgroundColor:
                  activeInput === 'jobtittle' ? '#FFFFFF' : '#F7F6FF',
                borderWidth: 1.2,
                borderColor:
                  activeInput === 'jobtittle' ? '#599FDD' : '#E0E0E0',
                transform: [{ scale: activeInput === 'jobtittle' ? 1.02 : 1 }],
                borderRadius: 10,
                color: '#4d4d4d',
                fontWeight: '500',
              }}
            />
          </View>
        </View>
      )}
      <Pressable
        onPress={handleNextHeight}
        // disabled={!isLifeStyleValid}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.96 : 1 }],
          // opacity: isLifeStyleValid ? 1 : 0.6,

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

export default HomeJobScreen;

const styles = StyleSheet.create({});
