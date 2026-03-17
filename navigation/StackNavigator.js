import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext } from 'react';
import LikesScreen from '../screens/LikesScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import OtpScreen from '../screens/OtpSrcreen';
import ForgetPassScreen from '../screens/ForgetPassScreen';
import NameScreen from '../screens/NameScreen';
import SetupProfileScreen from '../screens/SetupProfileScreen';
import GoalsScreen from '../screens/GoalsScreen';
import LifeStyleScreen from '../screens/LifestyleScreen';
import HomeJobScreen from '../screens/HomeJobScreen';
import PhotoScreen from '../screens/PhotoScreen';
import HobbyScreen from '../screens/HobbyScreen';
import PreFinalScreen from '../screens/PreFinalScreen';
import SetNewPasswordScreen from '../screens/SetNewPasswordScreen';

import { NavigationContainer } from '@react-navigation/native';
import { AuthContext, AuthProvider } from '../AuthContex';
import { ActivityIndicator, View } from 'react-native';

import CustomTabBar from './CustomTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
function BottomTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Like" component={LikesScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={BottomTabs} />
    </Stack.Navigator>
  );
}

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen name="LoginScreen" component={LoginScreen} /> */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="ForgetPass" component={ForgetPassScreen} />
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
    </Stack.Navigator>
  );
};

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="Setup" component={SetupProfileScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="LifeStyle" component={LifeStyleScreen} />
      <Stack.Screen name="HomeJob" component={HomeJobScreen} />
      <Stack.Screen name="Photo" component={PhotoScreen} />
      <Stack.Screen name="Hobby" component={HobbyScreen} />
      <Stack.Screen name="Final" component={PreFinalScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

export default function StackNavigator() {
  const { token, authLoading, profileComplete } = useContext(AuthContext);

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FF0059',
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer key={token ? 'user' : 'guest'}>
      {!token ? (
        <AuthStack />
      ) : !profileComplete ? (
        <OnboardingStack />
      ) : (
        <AppStack />
      )}
    </NavigationContainer>
  );
}
