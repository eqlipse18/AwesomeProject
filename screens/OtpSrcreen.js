import { StyleSheet, Text, View, TextInput } from 'react-native';
import React, { useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
const OtpSrcreen = () => {
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const inputs = useRef([]);
  const route = useRoute();
  const email = route.params?.email;
  const navigation = useNavigation();

  const handleConfirmSignUp = () => {
    console.log('working');
    navigation.navigate('Name');
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      changeNavigationBarColor('#ffffffff', false);
    }
    return () => {
      if (Platform.OS === 'android') {
        changeNavigationBarColor('#FF6A6A', false);
      }
    };
  }, []);

  useEffect(() => {
    if (otp.every(digit => digit !== '')) {
      handleConfirmSignUp();
    }
  }, [otp]);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleBackSpace = index => {
    if (index > 0) {
      inputs.current[index - 1].focus();
    }
    const newOtp = [...otp];
    newOtp[index] = '';
    setOtp(newOtp);
    if (index > 0) {
      setTimeout(() => {
        inputs.current[index - 1].focus();
      }, 0);
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
      <View
        style={{
          height: 80,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 50,
        }}
      >
        <Text style={{ fontSize: 25, fontWeight: '500' }}>
          Verification code
        </Text>
        <Text style={{ fontSize: 16, color: '#7d7d7dff', marginTop: 5 }}>
          Enter the 6 digit code sent to your email address
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          marginLeft: 45,
          gap: 5,

          marginTop: 10,
        }}
      >
        {otp?.map((_, index) => (
          <TextInput
            key={index}
            ref={el => (inputs.current[index] = el)}
            keyboardType="numeric"
            maxLength={1}
            value={otp[index]}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace') {
                handleBackSpace(index);
              }
            }}
            style={{
              borderWidth: 1,
              borderColor: '#8977a1ff',
              backgroundColor: '#ffffffff',
              width: 44,
              height: 55,
              textAlign: 'center',
              fontSize: 20,
              fontWeight: '400',
              marginHorizontal: 5,
              borderRadius: 54,
              shadowColor: '#000000ff',
              shadowOpacity: 0.09,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 13,
              borderWidth: 1,
              borderColor: '#949494a4',
            }}
          />
        ))}
      </View>
      <View
        style={{
          marginLeft: 20,
          marginBottom: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 70,
        }}
      >
        <View>
          <LottieView
            style={{
              height: 260,
              width: 300,
              alignSelf: 'center',
              opacity: 0.9,
              justifyContent: 'center',
            }}
            source={require('../assets/animations/otp.json')}
            autoPlay
            loop
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OtpSrcreen;

const styles = StyleSheet.create({});
