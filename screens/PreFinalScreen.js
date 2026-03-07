import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import Animated, {
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getRegistrationProgress } from '../utils/registrationUtils';
import { BASE_URL } from '../urls/url';
import { AuthContext } from '../AuthContex';

const REGISTRATION_SCREENS = [
  'Email',
  'Name',
  'profileSetup',
  'Goals',
  'LifeStyle',
  'HomeJob',
  'imageUrls',
  'hobbies',
];

const PreFinalScreen = () => {
  const [userdata, setUserdata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const isSubmitting = useRef(false);

  const navigation = useNavigation();
  // add this inside the component, with your other state
  const { setProfileComplete } = useContext(AuthContext);

  const _damping1 = 10;
  const _stiffness = 300;
  const _entering1 = FadeInDown.springify()
    .damping(_damping1)
    .stiffness(_stiffness);
  const _layout = LinearTransition.springify();

  useEffect(() => {
    getAllUserData();
  }, []);

  const getAllUserData = async () => {
    try {
      let combinedData = {};
      for (const screenName of REGISTRATION_SCREENS) {
        const screenData = await getRegistrationProgress(screenName);
        if (screenData) {
          combinedData = { ...combinedData, ...screenData };
        }
      }
      setUserdata(combinedData);
      console.log('PreFinalScreen userdata:', combinedData);
    } catch (e) {
      console.error('Error loading registration data:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearAllScreenData = async () => {
    for (const screenName of REGISTRATION_SCREENS) {
      await AsyncStorage.removeItem(`registration_progress_${screenName}`);
    }
  };

  const handleFinishRegistering = async () => {
    if (!userdata || isSubmitting.current) return; // ← double-tap guard
    isSubmitting.current = true; // lock immediately — before any await
    setRegistering(true);
    try {
      // ✅ Matches your OTP screen: AsyncStorage.setItem('token', token)
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert(
          'Session expired',
          'Please go back and verify your email again.',
        );
        return;
      }

      const response = await axios.post(`${BASE_URL}/register`, userdata, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // success path
      if (response.data.success) {
        await AsyncStorage.setItem('profileComplete', JSON.stringify(true));
        setProfileComplete(true); // ← triggers StackNavigator to switch to AppStack
        await clearAllScreenData();
      }
    } catch (error) {
      console.error(
        '[PreFinalScreen] Register error:',
        JSON.stringify(
          {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status,
          },
          null,
          2,
        ),
      );

      //  409 path
      if (error?.response?.status === 409) {
        await AsyncStorage.setItem('profileComplete', JSON.stringify(true));
        setProfileComplete(true); // ← same here
        await clearAllScreenData();
        return;
      }
      const message =
        error?.response?.data?.errors?.join('\n') ||
        error?.response?.data?.error ||
        'Something went wrong. Please try again.';

      Alert.alert('Registration Error', message);
    } finally {
      isSubmitting.current = false;
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#ff0090" />
      </SafeAreaView>
    );
  }

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
          marginTop: responsiveHeight(8),
          marginLeft: responsiveWidth(8),
        }}
      >
        <Text style={styles.titleBold}>All set to register</Text>
        <Text style={styles.titleLight}>Setting up Your Profile for you.</Text>
      </Animated.View>

      <Animated.View layout={_layout} entering={_entering1}>
        <LottieView
          style={{
            height: responsiveHeight(26),
            width: responsiveWidth(60),
            alignSelf: 'center',
            marginTop: responsiveHeight(4),
          }}
          source={require('../assets/animations/Love.json')}
          autoPlay
          loop
        />
      </Animated.View>

      <Animated.View
        layout={_layout}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 'auto',
        }}
      >
        <Pressable
          onPress={handleFinishRegistering}
          disabled={registering}
          style={[styles.button, registering && styles.buttonDisabled]}
        >
          {registering ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Finish Registering</Text>
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
};

export default PreFinalScreen;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  titleBold: {
    fontSize: responsiveFontSize(3.8),
    fontWeight: 'bold',
    fontFamily: 'GeezaPro-Bold',
  },
  titleLight: {
    fontSize: responsiveFontSize(3.4),
    fontWeight: 'bold',
    fontFamily: 'GeezaPro-Bold',
  },
  button: {
    backgroundColor: '#ff0090ff',
    padding: 15,
    margin: 20,
    width: responsiveWidth(85),
    paddingVertical: 10,
    borderRadius: 35,
    borderStyle: 'solid',
    borderColor: '#ff00aaff',
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
