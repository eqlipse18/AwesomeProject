import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
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

import { NavigationContainer } from '@react-navigation/native';

import CustomTabBar from './CustomTabBar';

const StackNavigator = () => {
  const Stack = createNativeStackNavigator();
  const Tab = createBottomTabNavigator();
  function BottomTabs() {
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        tabBar={props => <CustomTabBar {...props} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Like" component={LikesScreen} />
        <Tab.Screen name="Chat" component={HomeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
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
        <Stack.Screen name="Name" component={NameScreen} />
        <Stack.Screen name="Setup" component={SetupProfileScreen} />
        <Stack.Screen name="Goals" component={GoalsScreen} />
        <Stack.Screen name="LifeStyle" component={LifeStyleScreen} />
        <Stack.Screen name="HomeJob" component={HomeJobScreen} />
        <Stack.Screen name="Photo" component={PhotoScreen} />
        <Stack.Screen name="Hobby" component={HobbyScreen} />
        <Stack.Screen name="Final" component={PreFinalScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        {/* <Stack.Screen name="Name" component={NameScreen} />
       
        <Stack.Screen name="Prompt" component={PromptScreen} />
        <Stack.Screen name="ShowPrompts" component={ShowPrompts} />
        <Stack.Screen name="WritePrompt" component={WritePrompt} />
        {/* <Stack.Screen name="Location" component={LocationScreen} /> */}
      </Stack.Navigator>
    );
  };
  function MainStack() {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={BottomTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }
  return (
    <NavigationContainer>
      <AuthStack />
    </NavigationContainer>
  );
};

export default StackNavigator;
