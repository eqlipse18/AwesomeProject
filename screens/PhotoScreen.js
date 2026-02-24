import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PermissionsAndroid } from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import Animated, {
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../utils/registrationUtils';

import axios from 'axios';
import { BASE_URL } from '../urls/url';

const PhotoScreen = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  useFocusEffect(
    useCallback(() => {
      getRegistrationProgress('imageUrls').then(progressData => {
        if (progressData) {
          // setImageUrls(progressData.imageUrls || '');
          setImageUrls(progressData.imageUrls || ['', '', '', '', '', '']);
        }
      });
    }, []),
  );

  const handleNextHobby = async () => {
    try {
      setLoading(true);
      console.log('HANDLE NEXT STARTED');

      const finalUrls = [];

      for (let slot of imageSlots) {
        if (slot.status === 'new') {
          const uploadedUrl = await uploadToS3(slot.localPath);
          finalUrls.push(uploadedUrl);
        }

        if (slot.status === 'existing') {
          finalUrls.push(slot.s3Url);
        }

        if (slot.status === 'deleted' && slot.s3Url) {
          await axios.post(`${BASE_URL}/s3-delete`, {
            imageUrl: slot.s3Url,
          });
        }
      }

      await saveRegistrationProgress('imageUrls', { imageUrls: finalUrls });
      navigation.navigate('Hobby');
    } catch (e) {
      console.log('UPLOAD FAILED', e);
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        let permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        // Android 13+
        if (Platform.Version >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        }

        const granted = await PermissionsAndroid.request(permission, {
          title: 'Storage Permission',
          message: 'App needs access to your photos to select images',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS ke liye
  };

  // const [imageUrls, setImageUrls] = React.useState(['', '', '', '', '', '']);
  // const [imageUrl, setImageUrl] = useState('');

  // const images = Array.isArray(imageUrls) ? imageUrls : [];
  // const handleAddImage = () => {
  //   const cleanUrl = imageUrl.trim();

  //   if (!/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(cleanUrl)) {
  //     alert('Enter valid image URL');
  //     return;
  //   }

  //   const index = imageUrls.findIndex(url => url === '');

  //   if (index !== -1 && imageUrl.trim() !== '') {
  //     const updated = [...imageUrls];
  //     updated[index] = imageUrl.trim();

  //     setImageUrls(updated);
  //     setImageUrl('');
  //   }
  // };
  const [imageSlots, setImageSlots] = useState([
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
  ]);

  const pickAndCropImage = async index => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) return;

    try {
      const image = await ImageCropPicker.openPicker({
        width: 400,
        height: 500,
        cropping: true,
        compressImageQuality: 0.95,
        mediaType: 'photo',
        forceJpg: true,
      });

      const updated = [...imageSlots];
      updated[index] = {
        localPath: image.path,
        s3Url: null,
        status: 'new',
      };

      setImageSlots(updated);
    } catch (e) {
      console.log('pick failed', e);
    }
  };

  const uploadToS3 = async (localPath, retries = 2) => {
    try {
      // 1️⃣ presigned url
      const res = await axios.post(`${BASE_URL}/s3-upload-url`, {
        fileType: 'image/jpeg',
      });

      const { uploadUrl, publicUrl } = res.data;

      // 2️⃣ blob
      const response = await fetch(localPath);
      const blob = await response.blob();

      // 3️⃣ PUT upload
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error('PUT failed');
      }

      return publicUrl;
    } catch (err) {
      if (retries > 0) {
        console.log('Retrying upload...', retries);
        return uploadToS3(localPath, retries - 1);
      }
      throw err;
    }
  };

  const previewOrRecrop = async index => {
    try {
      const slot = imageSlots[index];
      if (!slot?.localPath) return;

      const image = await ImageCropPicker.openCropper({
        path: slot.localPath,
        width: 400,
        height: 500,
      });

      const updated = [...imageSlots];
      updated[index] = {
        localPath: image.path,
        s3Url: null,
        status: 'new',
      };
      setImageSlots(updated);
    } catch {
      console.log('crop cancelled');
    }
  };
  const removeImage = index => {
    const updated = [...imageSlots];

    if (updated[index].s3Url) {
      updated[index].status = 'deleted';
    } else {
      updated[index] = {
        localPath: null,
        s3Url: null,
        status: 'empty',
      };
    }

    setImageSlots(updated);
  };

  const _damping = 15;
  const _stiffness = 200;
  const _damping1 = 25;
  const _entering = FadeInDown.springify()

    // .damping(_damping1)
    .stiffness(_stiffness);
  const _entering1 = FadeInDown.springify()
    .delay(100)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _entering2 = FadeInDown.springify()
    .delay(150)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _entering3 = FadeInDown.springify()
    .delay(200)
    .damping(_damping1)
    .stiffness(_stiffness);
  const _layout = LinearTransition.springify();
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
        // entering={_entering}
        style={{
          marginTop: responsiveHeight(8), //80
          marginLeft: responsiveWidth(8), //30
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Image
            style={{
              height: responsiveHeight(4), //40
              width: responsiveWidth(7), //40
            }}
            source={require('../assets/Images/image.png')}
          />
        </View>
        <Text
          style={{
            fontSize: responsiveFontSize(2.8), //25
            fontFamily: 'GeezaPro-Bold',
            fontWeight: 'bold',
          }}
        >
          Upload photos to Profiles
        </Text>
      </Animated.View>
      <View style={{ marginTop: responsiveHeight(2), margin: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          {imageSlots.slice(0, 3).map((slot, index) => (
            <Pressable
              key={index}
              style={{
                borderColor: '#581845',
                borderWidth: slot.localPath || slot.s3Url ? 0 : 2,
                flex: 1,
                justifyContent: 'center',
                borderStyle: 'dotted',
                borderRadius: 15,
                alignItems: 'center',
                height: responsiveHeight(12.5), //115
                marginLeft: responsiveWidth(3.5), //15
                marginRight: responsiveWidth(3.5), //15
              }}
              onPress={() =>
                slot.localPath || slot.s3Url
                  ? previewOrRecrop(index)
                  : pickAndCropImage(index)
              }
            >
              {slot.localPath || slot.s3Url ? (
                <>
                  <Image
                    source={{ uri: slot.localPath || slot.s3Url }}
                    style={{ width: '100%', height: '100%', borderRadius: 10 }}
                  />
                  <Pressable
                    onPress={() => removeImage(index)}
                    style={{
                      position: 'absolute',
                      alignItems: 'center',
                      top: -10,
                      right: -10,
                      width: 28,
                      height: 28,

                      backgroundColor: 'rgba(255, 0, 34, 0.96)',
                      borderRadius: 15,

                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 14,
                        lineHeight: 14,
                      }}
                    >
                      X
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Image
                  style={{
                    height: responsiveHeight(3.5), //35
                    width: responsiveWidth(6.5),
                    opacity: 0.8,
                  }}
                  source={require('../assets/Images/img.png')}
                />
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ marginTop: 20, margin: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {imageSlots.slice(3, 6).map((slot, index) => (
            <Pressable
              key={index}
              style={{
                borderColor: '#581845',
                borderWidth: slot.localPath || slot.s3Url ? 0 : 2,
                flex: 1,
                justifyContent: 'center',
                borderStyle: 'dotted',
                borderRadius: 15,

                alignItems: 'center',
                height: responsiveHeight(12.5), //115
                marginLeft: responsiveWidth(3.5), //15
                marginRight: responsiveWidth(3.5), //15
              }}
              onPress={() =>
                slot.status === 'empty'
                  ? pickAndCropImage(index + 3)
                  : previewOrRecrop(index + 3)
              }
            >
              {slot.localPath || slot.s3Url ? (
                <>
                  <Image
                    source={{ uri: slot.localPath || slot.s3Url }}
                    style={{ width: '100%', height: '100%', borderRadius: 10 }}
                  />
                  <Pressable
                    key={index}
                    onPress={() => removeImage(index + 3)}
                    style={{
                      position: 'absolute',
                      alignItems: 'center',
                      top: -10,
                      right: -10,
                      width: 28,
                      height: 28,

                      backgroundColor: 'rgba(255, 0, 34, 0.96)',
                      borderRadius: 15,

                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 14,
                        lineHeight: 14,
                      }}
                    >
                      X
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Image
                  style={{
                    height: responsiveHeight(3.5), //35
                    width: responsiveWidth(6.5),
                    opacity: 0.8,
                  }}
                  source={require('../assets/Images/img.png')}
                />
              )}
            </Pressable>
          ))}
        </View>
        <View style={{ marginVertical: 10 }}>
          <Text
            style={{
              color: 'gray',
              fontSize: 15,
              marginLeft: responsiveWidth(3.5), //15
            }}
          >
            Tap to edit
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: '#581845',
              fontWeight: '500',
              fontSize: 15,
              marginLeft: responsiveWidth(3.5), //15
            }}
          >
            Add four to six Photos
          </Text>
        </View>
        {/* <View style={{ marginTop: 25, marginLeft: 15 }}>
          <Text style={{ color: '#581845' }}>
            Add pictue and Video from instagram and tiktok
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              marginTop: 10,
              backgroundColor: '#Dcdcdc',
              borderRadius: 15,
              paddingLeft: 6,
              marginRight: 10,
              paddingHorizontal: 6,
            }}
          >
            <Image
              style={{
                height: 25,
                width: 25,
              }}
              source={require('../assets/Images/instagram.png')}
            />
            <TextInput
              value={imageUrl}
              onChangeText={text => setImageUrl(text)}
              placeholder="Paste image url From Instagram"
              placeholderTextColor={'#595959ff'}
              multiline={false}
              style={{
                color: 'black',
                marginVertical: 10,
                flex: 1,
              }}
            />
          </View>

          <View
            style={{
              padding: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{ fontSize: 16, color: '#565656' }}
              onPress={handleAddImage}
            >
              Add image
            </Text>
          </View>
        </View> */}
      </View>
      <Animated.View
        layout={_layout}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <Pressable
          onPress={handleNextHobby}
          // disabled={!isLifeStyleValid}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            // opacity: isLifeStyleValid ? 1 : 0.6,

            backgroundColor: '#ff0090ff',
            width: responsiveWidth(85),
            paddingVertical: 10,
            marginTop: 10,

            borderRadius: 35,
            borderStyle: 'solid',
            borderColor: '#ff00aaff',
            borderWidth: 2,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 5,
            },
            shadowOpacity: 0.5,
            shadowRadius: 4.65,

            elevation: 6,
          })}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Add Media To Profile
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
};

export default PhotoScreen;

const styles = StyleSheet.create({});
