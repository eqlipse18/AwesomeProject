import React, { useEffect, useContext, useState, useRef } from 'react';
import { Linking, View, Image, Platform, StyleSheet } from 'react-native';
import StackNavigator from './navigation/StackNavigator';
import { AuthContext } from './AuthContex';
import { LocationProvider } from './LocationContext';
import axios from 'axios';
import SplashScreen from 'react-native-splash-screen';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import LinearGradient from 'react-native-linear-gradient';
import AppStatusBar from './components/AppStatusBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './urls/url';
import { configureGoogleSignIn } from './utils/googleAuth';

export default function Root() {
  const { token, setToken, setProfileComplete } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(true);
  const authHandledRef = useRef(false);

  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      console.log('Deep link URL:', url);
      const code = url.split('code=')[1]?.split('&')[0];
      if (code) exchangeCodeForToken(code);
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, []);

  const exchangeCodeForToken = async code => {
    if (authHandledRef.current) return;
    authHandledRef.current = true;
    try {
      const res = await axios.post(`${BASE_URL}/googleAuth`, { code });
      const { access_token, isProfileComplete } = res.data;
      const profileState = isProfileComplete ?? false;
      if (access_token) {
        await AsyncStorage.setItem('token', access_token);
        await AsyncStorage.setItem(
          'profileComplete',
          JSON.stringify(profileState),
        );
        setToken(access_token);
        setProfileComplete(profileState);
      }
    } catch (err) {
      console.log('Token exchange error:', err);
    }
  };

  useEffect(() => {
    SplashScreen.hide();
    configureGoogleSignIn();

    if (Platform.OS === 'android') {
      changeNavigationBarColor('#FF001E', true);
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
      if (Platform.OS === 'android') {
        changeNavigationBarColor('#ffffff', false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <>
        <AppStatusBar hidden />
        <LinearGradient
          colors={['#FF001E', '#FF3C80']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.splashContainer}
        >
          <View style={styles.splashContent}>
            <Image
              source={require('./assets/Images/logo.png')}
              resizeMode="contain"
              style={{ height: 150, width: 150, marginTop: 145 }}
            />
          </View>
        </LinearGradient>
      </>
    );
  }

  // ✅ LocationProvider yahan — splash ke baad, token available hone ke baad
  // Token null bhi ho sakta hai (logged out user) — LocationProvider handle karta hai
  return (
    <LocationProvider token={token}>
      <StackNavigator />
    </LocationProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
