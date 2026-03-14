import {
  Dimensions,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import React, { useEffect } from 'react';
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

const TabItem = ({ route, isFocused, scaleValue, onPress }) => {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        <Image
          source={icons[route.name]}
          style={[
            styles.icon,
            { tintColor: isFocused ? '#ff0059' : '#8a8a8a' },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ✅ Inner content alag nikala — BlurView ke andar ya bahar dono pe same layout
const TabBarContent = ({ state, navigation, scales, indicatorStyle }) => (
  <View style={styles.innerRow}>
    <Animated.View style={[styles.indicator, indicatorStyle]}>
      <LinearGradient
        colors={['#fe73ad', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
    </Animated.View>

    {state.routes.map((route, index) => (
      <TabItem
        key={route.key}
        route={route}
        index={index}
        isFocused={state.index === index}
        scaleValue={scales[index]}
        onPress={() => {
          if (state.index !== index) navigation.navigate(route.name);
        }}
      />
    ))}
  </View>
);

const CustomTabBar = ({ state, navigation }) => {
  const translateX = useSharedValue(state.index * TAB_WIDTH);
  const scale0 = useSharedValue(state.index === 0 ? 1.3 : 1);
  const scale1 = useSharedValue(state.index === 1 ? 1.3 : 1);
  const scale2 = useSharedValue(state.index === 2 ? 1.3 : 1);
  const scale3 = useSharedValue(state.index === 3 ? 1.3 : 1);
  const scales = [scale0, scale1, scale2, scale3];

  useEffect(() => {
    translateX.value = withTiming(state.index * TAB_WIDTH, { duration: 150 });
    scales.forEach((sv, i) => {
      sv.value = withTiming(i === state.index ? 1.3 : 1, { duration: 150 });
    });
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        // ✅ iOS — BlurView works fine
        <BlurView style={styles.blurView} blurType="light" blurAmount={10}>
          <TabBarContent
            state={state}
            navigation={navigation}
            scales={scales}
            indicatorStyle={indicatorStyle}
          />
        </BlurView>
      ) : (
        // ✅ Android — BlurView skip, plain frosted glass look
        <View style={styles.androidBar}>
          <TabBarContent
            state={state}
            navigation={navigation}
            scales={scales}
            indicatorStyle={indicatorStyle}
          />
        </View>
      )}
    </View>
  );
};

export default CustomTabBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    width: width - 20,
    height: 70,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  blurView: {
    flex: 1,
  },
  // ✅ Android frosted glass alternative
  androidBar: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  innerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: '100%',
  },
  gradient: {
    flex: 1,
    borderRadius: 25,
    opacity: 0.6,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 26,
    height: 26,
  },
});
