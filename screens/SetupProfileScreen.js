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
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useRef } from 'react';

export default function SetupProfileScreen() {
  const [gender, setGender] = useState('');
  const navigation = useNavigation();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const [dayError, setDayError] = useState(false);
  const [monthError, setMonthError] = useState(false);
  const [yearError, setYearError] = useState(false);
  const [isDOBValid, setIsDOBValid] = useState(false);

  const CURRENT_YEAR = new Date().getFullYear();

  useEffect(() => {
    if (
      day.length === 2 &&
      !dayError &&
      month.length === 2 &&
      !monthError &&
      year.length === 4 &&
      !yearError
    ) {
      setIsDOBValid(true);
    } else {
      setIsDOBValid(false);
    }
  }, [day, month, year, dayError, monthError, yearError]);

  // dayhandler

  const handleDayChange = text => {
    const numericText = text.replace(/[^0-9]/g, '');
    setDay(numericText);
    setDayError(false);
    if (numericText.length === 2) {
      const dayNum = parseInt(numericText, 10);
      if (dayNum < 1 || dayNum > 31) {
        setDayError(true);
        Alert.alert('Invalid Day', 'Day must be between 01 and 31');
        return;
      }

      // valid → move focus safely
      setTimeout(() => {
        monthRef.current?.focus();
      }, 50);
    }
  };
  const handleDayBlur = () => {
    if (day.length !== 2) {
      setDayError(true);
      Alert.alert('Invalid Day', 'Day must be in 2-digit format (01-31)');
    } else {
      const dayNum = parseInt(day, 10);
      if (dayNum < 1 || dayNum > 31) {
        setDayError(true);
        Alert.alert('Invalid Day', 'Day must be between 01 and 31');
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
      if (MonthNum < 1 || MonthNum > 31) {
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
        Alert.alert(
          'Invalid Year',
          `Year must be between 1900 and ${CURRENT_YEAR}`,
        );
      }
    }
  };
  const handleYearBlur = () => {
    if (year.length !== 4) {
      setYearError(true);
    }
  };
  const handleNextGoals = () => {
    navigation.navigate('Goals');
  };

  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      <View style={{ marginTop: 30, marginHorizontal: 20, marginLeft: 30 }}>
        <Text
          style={{
            fontSize: 35,
            fontFamily: 'Geeza-Pro-Bold',
            fontWeight: 'bold',
          }}
        >
          Setup your Profile
        </Text>
      </View>
      <View style={{ marginTop: 18, marginHorizontal: 20, marginLeft: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Image
            style={{ height: 40, width: 40 }}
            source={require('../assets/Images/calendar.png')}
          />
        </View>
        <Text
          style={{
            fontSize: 25,
            fontFamily: 'GeezaPro-Bold',
            fontWeight: '300',
            color: '#3D3B3B',
          }}
        >
          Your birthday
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginTop: 20,
        }}
      >
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
            width: 50,
            height: 55,
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
            width: 50,
            height: 55,
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
            width: 80,
            height: 55,
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
      </View>
      <View
        style={{
          marginTop: 3,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {dayError && (
          <Text style={{ color: 'red', fontSize: 18, marginTop: 4 }}>
            Enter a valid day between 01 and 31
          </Text>
        )}
        {monthError && (
          <Text style={{ color: 'red', fontSize: 18, marginTop: 4 }}>
            Enter a valid Month between 01 and 12
          </Text>
        )}
        {yearError && (
          <Text style={{ color: 'red', fontSize: 18, marginTop: 4 }}>
            Enter a valid Month between 1980 and {CURRENT_YEAR}
          </Text>
        )}
      </View>

      <View style={{ marginTop: 20, marginHorizontal: 20, marginLeft: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Image
            style={{ height: 30, width: 30 }}
            source={require('../assets/Images/gender.png')}
          />
        </View>
        <Text
          style={{
            fontSize: 25,
            fontFamily: 'GeezaPro-Bold',
            fontWeight: '300',
            color: '#3D3B3B',
          }}
        >
          Gender
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 15,

          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => setGender('Men')}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{
              marginTop: 30,
              width: 82,
              height: 104,
              borderRadius: 30,
              borderColor: gender === 'Men' ? '#E79FE9' : '#F7F6FF',
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
            <Text style={{ fontSize: 20, fontWeight: '600' }}>Male</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setGender('Female')}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{
              marginLeft: 30,
              marginTop: 30,
              width: 82,
              height: 104,
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
            <Text style={{ fontSize: 20, fontWeight: '600' }}>Female</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setGender('Non-Binary')}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{
              marginLeft: 30,
              marginTop: 30,
              width: 82,
              height: 104,
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
                fontSize: 18,
                fontWeight: '600',
                marginLeft: 13,
              }}
            >
              Non- Binary
            </Text>
          </View>
        </Pressable>
      </View>
      <View>
        <View
          style={{
            marginLeft: 30,
            marginTop: 30,
            width: 377,
            height: 78,
            borderRadius: 10,
            borderColor: '#F7F6FF',
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
          <View style={{ marginRight: 65, paddingLeft: 15 }}>
            <Text
              style={{
                fontSize: 22,
                fontFamily: 'GeezaPro-Bold',
                fontWeight: '300',
                color: '#1e1d1dff',
              }}
            >
              Transgender
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'GeezaPro-Bold',
                fontWeight: '300',
                color: '#6D6B6B',
                multiLine: true,
                width: 300,
              }}
            >
              A person whose gender identity is different from the sex assigned
              to them at birth.
            </Text>
          </View>
        </View>
      </View>
      <View>
        <View
          style={{
            marginLeft: 30,
            marginTop: 30,
            width: 377,
            height: 78,
            borderRadius: 10,
            borderColor: '#F7F6FF',
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
          <View style={{ marginRight: 65, paddingLeft: 15 }}>
            <Text
              style={{
                fontSize: 22,
                fontFamily: 'GeezaPro-Bold',
                fontWeight: '300',
                color: '#1e1d1dff',
              }}
            >
              Trans Man
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'GeezaPro-Bold',
                fontWeight: '300',
                color: '#6D6B6B',
                multiLine: true,
                width: 300,
              }}
            >
              A person who was assigned female at birth and identifies as a man.
            </Text>
          </View>
        </View>
      </View>
      <View>
        <View
          style={{
            marginLeft: 30,
            marginTop: 30,
            width: 377,
            height: 78,
            borderRadius: 10,
            borderColor: '#F7F6FF',
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
          <View style={{ marginRight: 65, paddingLeft: 15 }}>
            <Text
              style={{
                fontSize: 22,
                fontFamily: 'GeezaPro-Bold',
                fontWeight: '300',
                color: '#1e1d1dff',
              }}
            >
              Trans Feminine
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'GeezaPro-Bold',
                fontWeight: '300',
                color: '#6D6B6B',
                multiLine: true,
                width: 300,
              }}
            >
              A person who was assigned male at birth and identifies with
              femininity.
            </Text>
          </View>
        </View>
      </View>
      <Pressable
        onPress={handleNextGoals}
        disabled={!isDOBValid}
        style={{
          backgroundColor: isDOBValid ? '#ff0090ff' : '#ff009080',
          marginTop: 50,
          padding: 15,
          margin: 20,
          marginTop: 'auto',
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
          Continue
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
