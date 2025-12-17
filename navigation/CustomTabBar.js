import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import React, { useEffect, useRef } from 'react';

import { BlurView } from '@react-native-community/blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const TAB_COUNT = 4;
const TAB_WIDTH = (width - 40) / TAB_COUNT;
const icons = {
  Home: require('../assets/Images/home.png'),
  Like: require('../assets/Images/like.png'),
  Chat: require('../assets/Images/chat.png'),
  Profile: require('../assets/Images/user.png'),
};

const CustomTabBar = ({ state, navigation }) => {
  const translateX = useSharedValue(state.index * TAB_WIDTH);
  const initialized = useRef(false);

  const scales = Array(TAB_COUNT)
    .fill(0)
    .map((_, i) => useSharedValue(i === state.index ? 1.3 : 1));
  useEffect(() => {
    if (!initialized.current) {
      translateX.value = state.index * TAB_WIDTH;
      scales.forEach((sv, i) => {
        sv.value = i === state.index ? 1.3 : 1;
      });
      initialized.current = true;
    } else {
      translateX.value = withTiming(state.index * TAB_WIDTH, { duration: 150 });
      scales.forEach((sv, i) => {
        sv.value = withTiming(i === state.index ? 1.3 : 1, { duration: 150 });
      });
    }
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 10,
        right: 20,
        width: width - 40,
        height: 90,
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 10,
        borderWidth: 1,
        borderColor: '#eee',
      }}
    >
      <BlurView
        style={{
          flex: 1,
          flexDirection: 'row',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 25,
          alignItems: 'center',
        }}
        blurType="light"
        blurAmount={10}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: TAB_WIDTH,
              height: '100%',
            },
            indicatorStyle,
          ]}
        >
          <LinearGradient
            colors={['#fe73adff', '#ffffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: 25, opacity: 0.6 }}
          />
        </Animated.View>
        {state.routes.map((route, index) => {
          const iconStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scales[index].value }],
          }));

          const isFocused = state.index === index;
          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };
          const iconBase = icons[route.name] || 'ellipse';
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Animated.View
                style={[
                  iconStyle,
                  {
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <Image
                  source={icons[route.name]}
                  style={{
                    width: 26,
                    height: 26,
                    tintColor: isFocused ? '#ff0059ff' : '#8a8a8aff',
                  }}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
};

export default CustomTabBar;

const styles = StyleSheet.create({});
