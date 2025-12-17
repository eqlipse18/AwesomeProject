import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { useNavigation } from '@react-navigation/native';

const NameScreen = () => {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const navigation = useNavigation();
  const handleNextSetup = () => {
    navigation.navigate('Setup');
  };
  return (
    <SafeAreaView
      style={{
        paddingTop: Platform.OS === 'android' ? 35 : 0,
        flex: 1,
        backgroundColor: 'white',
      }}
    >
      <View style={{ marginTop: 50, marginHorizontal: 20, marginLeft: 30 }}>
        <Text
          style={{
            fontSize: 35,
            fontFamily: 'Geeza-Pro-Bold',
            fontWeight: 'bold',
          }}
        >
          My First Name is
        </Text>
      </View>
      <TextInput
        value={firstName}
        onChangeText={text => setFirstName(text)}
        placeholder="eg Noah R                                               
         (Required)"
        placeholderTextColor={'#959494ff'}
        autoFocus={true}
        paddingleft={15}
        fontSize={18}
        style={{
          width: 360,
          height: 55,
          marginLeft: 35,
          marginTop: 25,
          paddingLeft: 15,
          backgroundColor: '#ede7e7',
          borderWidth: 2,
          borderColor: '#c5c5c5',
          borderRadius: 20,
          color: '#4d4d4d',
          fontWeight: '500',
        }}
      />
      <Text
        style={{
          marginLeft: 45,
          marginTop: 3,
          justifyContent: 'flex-start',
          color: 'gray',
        }}
      >
        This is how it will appear in Flame
      </Text>
      <TextInput
        value={lastName}
        onChangeText={text => setLastName(text)}
        placeholder="Last Name                                               
         (Optional)"
        placeholderTextColor={'#959494ff'}
        paddingleft={15}
        fontSize={18}
        style={{
          width: 360,
          height: 55,
          marginLeft: 35,
          marginTop: 15,
          paddingLeft: 15,
          backgroundColor: '#ede7e7',
          borderWidth: 2,
          borderColor: '#c5c5c5',
          borderRadius: 20,
          color: '#4d4d4d',
          fontWeight: '500',
        }}
      />
      <Text
        style={{
          marginLeft: 45,
          marginTop: 3,
          justifyContent: 'flex-start',
          color: 'gray',
        }}
      >
        You can always change it later after profile setup
      </Text>

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          onPress={handleNextSetup}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
            marginTop: 100,
            width: 260,
            height: 50,
            borderRadius: 25,
            backgroundColor: '#FF0059',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default NameScreen;

const styles = StyleSheet.create({});
