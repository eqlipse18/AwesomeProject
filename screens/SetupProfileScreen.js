import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

// Configure Reanimated logger
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: true,
});
import { useRef } from 'react';
import CustomAlert from '../components/CustomAlert';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../utils/registrationUtils';

export default function SetupProfileScreen() {
  const [gender, setGender] = useState('');
  const [nonbinary, setNonbinary] = useState('');

  const navigation = useNavigation();

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const [age, setAge] = useState('null');
  const [datingPreferences, setDatingPreferences] = useState([]);
  const [isAutoPreference, setIsAutoPreference] = useState(true);

  const [dayError, setDayError] = useState(false);
  const [monthError, setMonthError] = useState(false);
  const [yearError, setYearError] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };
  //animation MIRON -->

  const _damping = 15;
  const _stiffness = 300;
  const _damping1 = 15;
  const _entering = FadeInDown.springify()
    .damping(_damping1)
    .stiffness(_stiffness);
  const _entering1 = FadeInDown.springify()
    .delay(200)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _entering2 = FadeInDown.springify()
    .delay(350)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _layout = LinearTransition.springify();
  // const _enteringt = FadeInDown.springify()
  //   .damping(_damping)
  //   .stiffness(_stiffness);
  // const _enteringt1 = FadeInDown.springify()
  //   .damping(_damping)
  //   .stiffness(_stiffness)
  //   .delay(200);
  // const _enteringt2 = FadeInDown.springify()
  //   .damping(_damping)
  //   .stiffness(_stiffness)
  //   .delay(350);
  // const _existing = FadeOut.springify().damping(_damping);
  // .damping(_damping);

  const [isDOBValid, setIsDOBValid] = useState(false);

  const CURRENT_YEAR = new Date().getFullYear();
  const card1Y = useSharedValue(30);
  const card1Opacity = useSharedValue(0);

  const card2Y = useSharedValue(30);
  const card2Opacity = useSharedValue(0);

  const card3Y = useSharedValue(30);
  const card3Opacity = useSharedValue(0);

  useEffect(() => {
    if (gender === 'Non-Binary') {
      card1Y.value = withDelay(
        100,
        withSpring(0, { damping: 20, stiffness: 90 }),
      );
      card1Opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      card2Y.value = withDelay(
        200,
        withSpring(0, { damping: 20, stiffness: 90 }),
      );
      card2Opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      card3Y.value = withDelay(
        300,
        withSpring(0, { damping: 20, stiffness: 90 }),
      );
      card3Opacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    } else {
      card1Y.value = withSpring(30, { damping: 20, stiffness: 90 });
      card1Opacity.value = withTiming(0, { duration: 200 });
      card2Y.value = withSpring(30, { damping: 20, stiffness: 90 });
      card2Opacity.value = withTiming(0, { duration: 200 });
      card3Y.value = withSpring(30, { damping: 20, stiffness: 90 });
      card3Opacity.value = withTiming(0, { duration: 200 });
    }
  }, [gender]);

  const card1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: card1Y.value }],
    opacity: card1Opacity.value,
  }));

  const card2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: card2Y.value }],
    opacity: card2Opacity.value,
  }));

  const card3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: card3Y.value }],
    opacity: card3Opacity.value,
  }));

  // const RadioButton = ({ label, value }) => (
  //   <Pressable
  //     onPress={() => setGender(value)}
  //     style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
  //   >
  //     <View
  //       style={{
  //         width: 20,
  //         height: 20,
  //         borderRadius: 10,
  //         borderWidth: 2,
  //         borderColor: '#599FDD',
  //         justifyContent: 'center',
  //         alignItems: 'center',
  //       }}
  //     >
  //       {gender === value && (
  //         <View
  //           style={{
  //             width: 12,
  //             height: 12,
  //             borderRadius: 6,
  //             backgroundColor: '#599FDD',
  //           }}
  //         />
  //       )}
  //     </View>
  //     <Text style={{ fontSize: 16 }}>{label}</Text>
  //   </Pressable>
  // );

  useEffect(() => {
    // DOB validation
    const dobValid =
      day.length === 2 &&
      !dayError &&
      month.length === 2 &&
      !monthError &&
      year.length === 4 &&
      !yearError;

    // Gender validation
    const genderValid =
      gender === 'Male' ||
      gender === 'Female' ||
      (gender === 'Non-Binary' && nonbinary !== '');

    // Combine both
    if (dobValid && genderValid) {
      setIsDOBValid(true);
      //age calculation
      const calculatedAge = calculateAge(
        parseInt(day),
        parseInt(month),
        parseInt(year),
      );

      setAge(calculatedAge);
    } else {
      setIsDOBValid(false);
      setAge(null);
    }
  }, [day, month, year, dayError, monthError, yearError, gender, nonbinary]);

  // dayhandler

  const handleDayChange = text => {
    const numericText = text.replace(/[^0-9]/g, '');
    setDay(numericText);
    setDayError(false);
    if (numericText.length === 2) {
      const dayNum = parseInt(numericText, 10);
      if (dayNum < 1 || dayNum > 31) {
        setDayError(true);
        showAlert('Invalid Day', 'Day must be between 01 and 31'); // Custom Alert
        return;
      } // valid → move focus safely
      setTimeout(() => {
        monthRef.current?.focus();
      }, 100);
    }
  };
  const handleDayBlur = () => {
    if (day.length !== 2) {
      setDayError(true);
      showAlert('Invalid Day', 'Day must be in 2-digit format (01-31)');
    } else {
      const dayNum = parseInt(day, 10);
      if (dayNum < 1 || dayNum > 31) {
        setDayError(true);
        showAlert('Invalid Day', 'Day must be between 01 and 31');
      } else {
        setDayError(false);
      }
    }
  };

  // monthhandler

  const handleMonthChange = text => {
    const numericText = text.replace(/[^0-9]/g, '');
    setMonth(numericText);
    setMonthError(false);
    if (numericText.length === 2) {
      const MonthNum = parseInt(numericText, 10);
      if (MonthNum < 1 || MonthNum > 12) {
        setMonthError(true);
        showAlert('Invalid month', 'Month must be between 01 and 12');
        return;
      }

      // valid → move focus safely
      setTimeout(() => {
        yearRef.current?.focus();
      }, 100);
    }
  };

  const handleMonthBlur = () => {
    if (month.length !== 2) {
      setMonthError(true);
    } else {
      const MonthNum = parseInt(month, 10);
      if (MonthNum < 1 || MonthNum > 12) {
        setMonthError(true);
      } else {
        setMonthError(false);
      }
    }
  };

  // yearhandler
  const handleYearChange = text => {
    const numeric = text.replace(/[^0-9]/g, '');
    setYear(numeric);
    setYearError(false);
    if (numeric.length === 4) {
      const yearNum = parseInt(numeric, 10);
      if (yearNum < 1980 || yearNum > CURRENT_YEAR) {
        setYearError(true);
        showAlert(
          'Invalid Year',
          `Year must be between 1980 and ${CURRENT_YEAR}`,
        );
      }
    }
  };
  const handleYearBlur = () => {
    if (year.length !== 4) {
      setYearError(true);
    }
  };

  const calculateAge = (d, m, y) => {
    const today = new Date();
    const birthDate = new Date(y, m - 1, d);

    let calculatedAge = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      calculatedAge--;
    }

    return calculatedAge;
  };

  // const handleNextGoals = () => {
  //   navigation.navigate('Goals');
  // };

  useFocusEffect(
    useCallback(() => {
      getRegistrationProgress('profileSetup').then(progressData => {
        if (progressData) {
          const { gender, nonbinary, dateOfBirth, age } = progressData;

          if (dateOfBirth) {
            const [dayValue, monthValue, yearValue] = dateOfBirth.split('/');

            setDay(dayValue);
            setMonth(monthValue);
            setYear(yearValue);
          }

          setGender(gender || '');
          setNonbinary(nonbinary || '');
          setAge(age || null);
        }
      });
    }, []),
  );

  const handleNextGoals = async () => {
    if (
      day.trim() !== '' &&
      month.trim() !== '' &&
      year.trim() !== '' &&
      gender !== '' &&
      age !== null
    ) {
      const dataToSave = {
        gender,
        nonbinary,
        dateOfBirth: `${day}/${month}/${year}`,
        age,
        datingPreferences,
      };
      //  DEBUG LOGS
      console.log('--- Saving Profile Setup Data ---');
      console.log('Gender:', gender);
      console.log('NonBinary:', nonbinary);
      console.log('DOB:', `${day}/${month}/${year}`);
      console.log('Age:', age);
      console.log('prefernces:', datingPreferences);
      console.log('Full Object:', dataToSave);

      await saveRegistrationProgress('profileSetup', dataToSave);
    } else {
      console.log('Validation failed — setupProfile data not saved');
      console.log({
        day,
        month,
        year,
        gender,
        age,
      });
    }

    navigation.navigate('Goals'); // ya next screen jo hai
  };

  useEffect(() => {
    if (!isAutoPreference) return; // user ne manual change kiya hai for reedit

    if (gender === 'Male') {
      setDatingPreferences(['Women']);
    } else if (gender === 'Female') {
      setDatingPreferences(['Men']);
    } else if (gender === 'Non-Binary') {
      setDatingPreferences(['EveryOne']);
    }
  }, [gender, isAutoPreference]);

  //--> call this for redit of
  const chooseOption = option => {
    setIsAutoPreference(false); // ✅ user manual mode me chala gaya

    if (option === 'EveryOne') {
      setDatingPreferences(['EveryOne']);
    } else {
      setDatingPreferences(prev => {
        const filtered = prev.filter(item => item !== 'EveryOne');

        if (filtered.includes(option)) {
          return filtered.filter(item => item !== option);
        } else {
          return [...filtered, option];
        }
      });
    }
  };

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
          marginLeft: responsiveWidth(8), //30
        }}
      >
        <Text
          style={{
            fontSize: responsiveFontSize(3.5), //32
            fontFamily: 'Geeza-Pro-Bold',
            fontWeight: 'bold',
          }}
        >
          Setup your Profile
        </Text>
        <Text
          style={{
            fontSize: responsiveFontSize(1.4), //16
            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          Be real — it helps us match you better based on Age and Gender
        </Text>
      </Animated.View>
      <Animated.View
        layout={_layout}
        style={{
          marginTop: responsiveHeight(2),

          marginLeft: responsiveWidth(4), //15
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          {/* <Image
            style={{ height: 40, width: 40 }}
            source={require('../assets/Images/calendar.png')}
          /> */}
        </View>
        <Text
          style={{
            fontSize: responsiveFontSize(2.5), //25
            fontFamily: 'GeezaPro-Bold',
            fontWeight: '300',
            color: '#222222',
          }}
        >
          Your Birthday
        </Text>
      </Animated.View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginTop: responsiveHeight(1.8),
        }}
      >
        <Animated.View entering={_entering}>
          <TextInput
            value={day}
            onChangeText={handleDayChange}
            onBlur={handleDayBlur}
            autoFocus={true}
            keyboardType="numeric"
            maxLength={2}
            placeholder="DD"
            placeholderTextColor={dayError ? 'red' : '#bebebe'}
            style={{
              borderWidth: 1,
              borderColor: '#8977a1ff',
              backgroundColor: '#ffffffff',
              width: responsiveWidth(12), //50
              height: responsiveHeight(6), //55
              textAlign: 'center',
              fontSize: 20,
              color: dayError ? 'red' : 'black',
              fontWeight: '400',
              marginHorizontal: 5,
              borderRadius: 54,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
              borderWidth: 1,
              borderColor: dayError ? 'red' : '#F7F6FF',
            }}
          />
        </Animated.View>
        <Animated.View entering={_entering1}>
          <TextInput
            value={month}
            onChangeText={handleMonthChange}
            onBlur={handleMonthBlur}
            autoFocus={true}
            ref={monthRef}
            editable={!dayError && day.length === 2}
            keyboardType="numeric"
            maxLength={2}
            placeholder="MM"
            placeholderTextColor={monthError ? 'red' : '#bebebe'}
            style={{
              borderWidth: 1,
              borderColor: '#8977a1ff',
              backgroundColor: '#ffffffff',
              width: responsiveWidth(12), //50
              height: responsiveHeight(6), //55
              textAlign: 'center',
              fontSize: 20,
              color: monthError ? 'red' : 'black',
              fontWeight: '400',
              marginHorizontal: 5,
              borderRadius: 54,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
              borderWidth: 1,
              borderColor: monthError ? 'red' : '#F7F6FF',
            }}
          />
        </Animated.View>
        <Animated.View entering={_entering2}>
          <TextInput
            value={year}
            onChangeText={handleYearChange}
            onBlur={handleYearBlur}
            autoFocus={true}
            ref={yearRef}
            keyboardType="numeric"
            maxLength={4}
            placeholder="YYYY"
            placeholderTextColor={yearError ? 'red' : '#bebebe'}
            editable={
              !dayError && day.length === 2 && !monthError && month.length === 2
            }
            style={{
              borderWidth: 1,
              borderColor: '#8977a1ff',
              backgroundColor: '#ffffffff',
              width: responsiveWidth(17), //80
              height: responsiveHeight(6), //55
              textAlign: 'center',
              fontSize: 20,
              color: yearError ? 'red' : 'black',
              fontWeight: '400',
              marginHorizontal: 5,
              borderRadius: 54,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
              borderWidth: 1,
              borderColor: yearError ? 'red' : '#F7F6FF',
            }}
          />
        </Animated.View>
      </View>
      <View
        style={{
          marginTop: 3,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {dayError && (
          <Text style={{ color: 'red', fontSize: 14, marginTop: 4 }}>
            Enter a valid day between 01 and 31
          </Text>
        )}
        {monthError && (
          <Text style={{ color: 'red', fontSize: 14, marginTop: 4 }}>
            Enter a valid Month between 01 and 12
          </Text>
        )}
        {yearError && (
          <Text style={{ color: 'red', fontSize: 14, marginTop: 4 }}>
            Enter a valid Month between 1980 and {CURRENT_YEAR}
          </Text>
        )}
      </View>

      <Animated.View
        layout={_layout}
        style={{
          marginTop: responsiveHeight(2),

          marginLeft: responsiveWidth(4),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {/* <GenderIcon width={30} height={30} fill="#000000ff" /> */}
        </View>
        <Text
          style={{
            fontSize: responsiveFontSize(2.5), //25
            fontFamily: 'GeezaPro-Bold',
            fontWeight: '300',
            color: '#222222',
          }}
        >
          Gender
        </Text>
      </Animated.View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 15,

          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => setGender('Male')}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Animated.View
            layout={_layout}
            entering={_entering}
            style={{
              marginTop: responsiveHeight(3), //30
              width: responsiveWidth(19), //82
              height: responsiveHeight(11), //104
              borderRadius: 30,
              borderColor: gender === 'Male' ? '#E79FE9' : '#F7F6FF',
              borderWidth: 2.05,
              backgroundColor: '#fff',
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Image
              style={{ height: 30, width: 30 }}
              source={require('../assets/Images/male.png')}
            />
            <Text
              style={{ fontSize: responsiveFontSize(1.8), fontWeight: '600' }}
            >
              Male
            </Text>
          </Animated.View>
        </Pressable>
        <Pressable
          onPress={() => setGender('Female')}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Animated.View
            layout={_layout}
            entering={_entering1}
            style={{
              marginLeft: responsiveWidth(8), //30
              marginTop: responsiveHeight(3), //30
              width: responsiveWidth(19), //82
              height: responsiveHeight(11), //104
              borderRadius: 30,
              borderColor: gender === 'Female' ? '#E79FE9' : '#F7F6FF',
              borderWidth: 2.05,
              backgroundColor: '#fff',
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Image
              style={{ height: 35, width: 35 }}
              source={require('../assets/Images/female.png')}
            />
            <Text
              style={{ fontSize: responsiveFontSize(1.8), fontWeight: '600' }}
            >
              Female
            </Text>
          </Animated.View>
        </Pressable>
        <Pressable
          onPress={() => setGender('Non-Binary')}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Animated.View
            layout={_layout}
            entering={_entering2}
            style={{
              marginLeft: responsiveWidth(8), //30
              marginTop: responsiveHeight(3), //30
              width: responsiveWidth(19), //82
              height: responsiveHeight(11), //104
              borderRadius: 30,
              borderColor: gender === 'Non-Binary' ? '#E79FE9' : '#F7F6FF',
              borderWidth: 2.05,
              backgroundColor: '#fff',
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Image
              style={{ height: 35, width: 35 }}
              source={require('../assets/Images/nonbinary.png')}
            />
            <Text
              style={{
                fontSize: responsiveFontSize(1.6),
                fontWeight: '600',
                // marginLeft: 13,
                textAlign: 'center',
              }}
            >
              Non-Binary
            </Text>
          </Animated.View>
        </Pressable>
      </View>

      {gender === 'Non-Binary' && (
        <View>
          <Animated.View
            layout={_layout}
            // entering={_enteringt}
            style={card1Style}
          >
            <Pressable
              onPress={() => setNonbinary('Transgender')}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.96 : 1 }],
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  marginLeft: responsiveWidth(7), //
                  marginTop: responsiveHeight(2), //20
                  width: responsiveWidth(85), //377
                  height: responsiveHeight(8), //78
                  borderRadius: 10,
                  borderColor:
                    nonbinary === 'Transgender' ? '#599FDD' : '#CFCFCF',
                  borderWidth: 1,
                  backgroundColor: '#F8F8FF',
                  elevation: 6,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                  justifyContent: 'flex-start',
                }}
              >
                <View
                  style={{ marginRight: responsiveWidth(14), paddingLeft: 15 }}
                >
                  <Text
                    style={{
                      fontSize: responsiveFontSize(2.5), //22
                      fontFamily: 'GeezaPro-Bold',
                      fontWeight: '300',
                      color: '#1e1d1dff',
                    }}
                  >
                    Transgender
                  </Text>
                  <Text
                    style={{
                      fontSize: responsiveFontSize(1.7), //16
                      fontFamily: 'GeezaPro-Bold',
                      fontWeight: '300',
                      color: '#6D6B6B',

                      width: responsiveWidth(66),
                    }}
                  >
                    A person whose gender identity is different from the sex
                    assigned to them at birth.
                  </Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
          <View>
            <Animated.View
              layout={_layout}
              // entering={_enteringt1}
              style={card2Style}
            >
              <Pressable
                onPress={() => setNonbinary('Trans Man')}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    marginLeft: responsiveWidth(7), //30
                    marginTop: responsiveHeight(2), //20
                    width: responsiveWidth(85), //377
                    height: responsiveHeight(8), //78
                    borderRadius: 10,
                    borderColor:
                      nonbinary === 'Trans Man' ? '#599FDD' : '#CFCFCF',
                    borderWidth: 1,
                    backgroundColor: '#F8F8FF',
                    elevation: 6,
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: 'flex-start',
                  }}
                >
                  <View
                    style={{
                      marginRight: responsiveWidth(14),
                      paddingLeft: 15,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: responsiveFontSize(2.5), //22
                        fontFamily: 'GeezaPro-Bold',
                        fontWeight: '300',
                        color: '#1e1d1dff',
                      }}
                    >
                      Trans Man
                    </Text>
                    <Text
                      style={{
                        fontSize: responsiveFontSize(1.7), //16
                        fontFamily: 'GeezaPro-Bold',
                        fontWeight: '300',
                        color: '#6D6B6B',

                        width: responsiveWidth(66),
                      }}
                    >
                      A person who was assigned female at birth and identifies
                      as a man.
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          </View>
          <View>
            <Animated.View
              layout={_layout}
              // entering={_enteringt2}
              style={card3Style}
            >
              <Pressable
                onPress={() => setNonbinary('Trans Feminine')}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    marginLeft: responsiveWidth(7), //30
                    marginTop: responsiveHeight(2), //20
                    width: responsiveWidth(85), //377
                    height: responsiveHeight(8), //78
                    borderRadius: 10,
                    borderColor:
                      nonbinary === 'Trans Feminine' ? '#599FDD' : '#CFCFCF',
                    borderWidth: 1,
                    backgroundColor: '#F8F8FF',
                    elevation: 6,
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: 'flex-start',
                  }}
                >
                  <View
                    style={{
                      marginRight: responsiveWidth(14),
                      paddingLeft: 15,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: responsiveFontSize(2.5), //22
                        fontFamily: 'GeezaPro-Bold',
                        fontWeight: '300',
                        color: '#1e1d1dff',
                      }}
                    >
                      Trans Feminine
                    </Text>
                    <Text
                      style={{
                        fontSize: responsiveFontSize(1.7), //16
                        fontFamily: 'GeezaPro-Bold',
                        fontWeight: '300',
                        color: '#6D6B6B',

                        width: responsiveWidth(66),
                      }}
                    >
                      A person who was assigned male at birth and identifies
                      with femininity.
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      )}
      <Animated.View layout={_layout}>
        <Text
          style={{
            fontSize: responsiveFontSize(1.4), //16
            marginLeft: responsiveWidth(8), //45
            marginTop: responsiveHeight(4), //40
            justifyContent: 'flex-start',
            color: 'gray',
          }}
        >
          This will be shown on your profile. You can always change it later.
        </Text>
      </Animated.View>
      <Animated.View
        layout={_layout}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <Pressable
          onPress={handleNextGoals}
          disabled={!isDOBValid}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
            backgroundColor: isDOBValid ? '#ff0090ff' : '#ff009080',

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
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Continue
          </Text>
        </Pressable>
      </Animated.View>
      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
