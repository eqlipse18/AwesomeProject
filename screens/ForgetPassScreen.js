import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import Animated from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const ForgetPassScreen = () => {
  const [activeInput, setActiveInput] = useState(null);
  const [email, setEmail] = useState('');
  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      {/* <Image
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        source={require('../assets/Images/bg1.jpg')}
      /> */}
      <LinearGradient
        colors={['#FF6A6A', '#ffffffff']} // bottom → top
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <Text
        style={{
          fontSize: 32, //32
          fontWeight: 'bold',
          marginTop: 80,
          marginLeft: 10,
        }}
      >
        Forget Your Password ?
      </Text>
      <Text
        style={{
          fontSize: 15, //32
          fontWeight: 'bold',
          fontFamily: 'GeezaPro-Bold',
          marginTop: 50,
          marginLeft: 25,
          color: '#4d4d4d',
        }}
      >
        Enter your email for Reset password link
      </Text>

      <Animated.View
        // entering={_entering}
        // layout={_layout}
        // exiting={_existing}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: responsiveWidth(90), //370
          paddingVertical: 3,
          borderRadius: 35,
          transform: [{ scale: activeInput === 'email' ? 1.02 : 1 }],
          backgroundColor: activeInput === 'email' ? '#FFFFFF' : '#F7F6FF',
          borderColor: activeInput === 'email' ? '#599FDD' : '#E0E0E0',
          paddingHorizontal: 15,
          marginBottom: 5,
          borderWidth: 1,
          marginTop: 10,
          marginLeft: 20,
        }}
      >
        <Image
          source={require('../assets/Images/email.png')}
          style={{ height: 25, width: 25, marginRight: 10 }}
        />
        <TextInput
          // value={email}
          // onChangeText={text => setEmail(text)}
          // value={values.email}
          // onChangeText={handleChange('email')}
          placeholder="Enter your email"
          placeholderTextColor="#bebebe"
          onFocus={() => setActiveInput('email')}
          // onBlur={() => setActiveInput(null)}
          onBlur={() => setFieldTouched('email')}
          autoFocus={true}
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '500',

            color: '#4d4d4d',
          }}
        />
      </Animated.View>
      <View style={{ alignItems: 'center' }}>
        <Pressable
          // onPress={handleSubmit}
          // disabled={!isValid}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
            marginTop: responsiveHeight(5), //40
            width: responsiveWidth(60),
            // height: 50,
            paddingVertical: 9,
            borderRadius: 25,
            backgroundColor: '#ff3b80',
            // backgroundColor: isValid ? '#FF0059' : '#b35777',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Text
            style={{
              color: 'white',
              fontSize: responsiveFontSize(2.1),
              fontWeight: '400',
            }}
          >
            Reset Password
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default ForgetPassScreen;

const styles = StyleSheet.create({});
