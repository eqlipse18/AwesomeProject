import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import StackNavigator from './navigation/StackNavigator';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import SplashScreen from 'react-native-splash-screen';
import LinearGradient from 'react-native-linear-gradient';
import AppStatusBar from './components/AppStatusBar';

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hide();

    // StatusBar.setHidden(true, 'fade');

    if (Platform.OS === 'android') {
      changeNavigationBarColor('#FF001E', true);
    }

    const timer = setTimeout(() => {
      setShowSplash(false);

      if (Platform.OS === 'android') {
        changeNavigationBarColor('#fcd2e0', false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <>
        <AppStatusBar hidden />
        {/* <AppStatusBar style="dark-content" />
      <AppStatusBar style="light-content" /> */}
        <LinearGradient
          colors={['#FF001E', '#FF3C80']}
          start={{ x: 0, y: 1 }} // left bottom
          end={{ x: 1, y: 0 }} // top right
          style={styles.splashContainer}
        >
          {/* <StatusBar hidden={true} /> */}
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Image
              source={require('./assets/Images/logo.png')}
              resizeMode="contain"
              style={{
                height: 150,
                width: 150,
                marginTop: 145,
              }}
            />
          </View>
        </LinearGradient>
      </>
    );
  }

  return <StackNavigator />;
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default App;
