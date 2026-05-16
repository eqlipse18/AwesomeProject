import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../utils/registrationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

import axios from 'axios';
import { BASE_URL } from '../urls/url';
// PhotoScreen.js top pe
import { useFaceCheck } from '../src/hooks/useFaceCheck';
import { FaceCheckSheet } from '../src/components/registration/FaceCheckSheet';
import { OnboardingProgress } from '../src/components/shared/OnboardingProgress';

const PhotoScreen = () => {
  const navigation = useNavigation();
  const [imageError, setImageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletedUrls, setDeletedUrls] = useState([]);

  const { checking, sheetState, closeSheet, validateAndSet } = useFaceCheck();

  useFocusEffect(
    useCallback(() => {
      getRegistrationProgress('imageUrls').then(progressData => {
        if (progressData?.imageUrls) {
          // URL strings ko slot objects mein convert karo
          const restoredSlots = progressData.imageUrls.map(url =>
            url
              ? { localPath: null, s3Url: url, status: 'existing' }
              : { localPath: null, s3Url: null, status: 'empty' },
          );
          setImageSlots(restoredSlots); //  imageUrls nahi, imageSlots set karo
        }
      });
    }, []),
  );
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!loading) return;

      e.preventDefault();
    });

    return unsubscribe;
  }, [loading]);

  const handleNextHobby = async () => {
    try {
      if (loading) return;
      setLoading(true);

      const finalUrls = [];

      // ✅ 1. Load previous session uploads (for cleanup on error)
      let uploadedThisSession = JSON.parse(
        (await AsyncStorage.getItem('uploadedThisSession')) || '[]',
      );

      // ✅ 2. Upload new images
      const newSlots = imageSlots.filter(s => s.status === 'new');

      if (newSlots.length > 0) {
        const uploadedUrls = await Promise.all(
          newSlots.map(s => uploadToS3(s.localPath)),
        );

        uploadedThisSession.push(...uploadedUrls);
        finalUrls.push(...uploadedUrls);

        await AsyncStorage.setItem(
          'uploadedThisSession',
          JSON.stringify(uploadedThisSession),
        );
      }

      // ✅ 3. Add existing (restored from storage) images
      imageSlots.forEach(s => {
        if (s.status === 'existing') {
          finalUrls.push(s.s3Url);
        }
      });

      // ✅ 4. Save to registration progress
      await saveRegistrationProgress('imageUrls', { imageUrls: finalUrls });

      // ✅ 5. Delete removed S3 images (using deletedUrls state)
      if (deletedUrls.length > 0) {
        await Promise.all(
          deletedUrls.map(url =>
            axios.post(`${BASE_URL}/s3-delete`, { imageUrl: url }),
          ),
        );
        setDeletedUrls([]); // clear after delete
      }

      // ✅ 6. Cleanup session storage
      await AsyncStorage.removeItem('uploadedThisSession');

      // ✅ 7. Navigate
      navigation.navigate('Hobby');
    } catch (error) {
      console.log('Upload failed:', error);

      // Cleanup all uploaded images this session
      const uploadedThisSession = JSON.parse(
        (await AsyncStorage.getItem('uploadedThisSession')) || '[]',
      );
      if (uploadedThisSession.length > 0) {
        await Promise.all(
          uploadedThisSession.map(url =>
            axios.post(`${BASE_URL}/s3-delete`, { imageUrl: url }),
          ),
        );
        await AsyncStorage.removeItem('uploadedThisSession');
      }

      alert('Upload failed. All temporary uploads removed.');
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

  const [imageSlots, setImageSlots] = useState([
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
    { localPath: null, s3Url: null, status: 'empty' },
  ]);

  const selectedImagesCount = (imageSlots ?? []).filter(
    s => s.status === 'new' || s.status === 'existing',
  ).length;

  const handlePressNext = () => {
    if (selectedImagesCount < 2) {
      setImageError('Upload at least 2 images'); // red message
      return;
    }
    setImageError('');
    handleNextHobby(); // call the main upload function
  };

  const ImageSlot = ({ slot, actualIndex, imageSlots, onPress, onRemove }) => {
    const opacity = useSharedValue(
      actualIndex !== 0 && imageSlots[0].status === 'empty' ? 0.4 : 1,
    );

    useEffect(() => {
      const shouldDim = actualIndex !== 0 && imageSlots[0].status === 'empty';
      opacity.value = withDelay(
        actualIndex * 80,
        withTiming(shouldDim ? 0.4 : 1, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        }),
      );
    }, [imageSlots[0].status]);

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
      // 👇 Animated.View wrap — opacity yahan
      <Animated.View
        style={[
          {
            flex: 1,
            height: responsiveHeight(12.5), // 👈 height yahan lagao
          },
          animStyle,
        ]}
      >
        <Pressable
          style={{
            borderColor: '#581845',
            borderWidth: slot.status === 'empty' ? 2 : 0,
            flex: 1,
            width: '100%',
            justifyContent: 'center',
            borderStyle: 'dotted',
            borderRadius: 15,
            alignItems: 'center',
            marginRight: responsiveWidth(6.5),
          }}
          onPress={onPress}
        >
          {slot.status !== 'empty' ? (
            <>
              <Image
                source={{ uri: slot.localPath || slot.s3Url }}
                style={{ width: '100%', height: '100%', borderRadius: 10 }}
              />
              <Pressable
                onPress={onRemove}
                style={{
                  position: 'absolute',
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
                height: responsiveHeight(3.5),
                width: responsiveWidth(6.5),
                opacity: 0.8,
              }}
              source={require('../assets/Images/img.png')}
            />
          )}
        </Pressable>
      </Animated.View>
    );
  };

  const pickAndCropImage = async index => {
    if (index !== 0 && imageSlots[0].status === 'empty') {
      // Toast/feedback show karo
      setImageError('Upload your Profile Picture first! ');
      // Auto clear after 2.5s
      setTimeout(() => setImageError(''), 4500);
      return;
    }

    const hasPermission = await requestStoragePermission();
    if (!hasPermission) return;

    try {
      const image = await ImageCropPicker.openPicker({
        width: 400,
        height: 600,
        cropping: false,
        compressImageQuality: 0.95,
        compressImageMaxWidth: 2000,
        compressImageMaxHeight: 2000,
        includeBase64: false,
        mediaType: 'photo',
        forceJpg: true,
      });

      const setSlot = () => {
        const updated = [...imageSlots];
        updated[index] = { localPath: image.path, s3Url: null, status: 'new' };
        setImageSlots(updated);
      };

      // ✅ Sirf slot 0 pe face check
      if (index === 0) {
        await validateAndSet({
          localPath: image.path,
          index,
          // allowSkip: true,
          onPass: setSlot,
        });
      } else {
        // Baaki slots — seedha set, koi check nahi
        setSlot();
      }
    } catch (e) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        console.log('pick failed', e);
      }
    }
  };

  const uploadToS3 = async (localPath, retries = 2) => {
    try {
      // 1️ presigned url
      const res = await axios.post(`${BASE_URL}/s3-upload-url`, {
        fileType: 'image/jpeg',
      });

      const { uploadUrl, publicUrl } = res.data;

      // 2️ blob
      const response = await fetch(localPath);
      const blob = await response.blob();

      // 3️ PUT upload
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
    const slot = imageSlots[index];
    const pathToUse = slot?.localPath || slot?.s3Url;
    if (!pathToUse) return; // ✅ localPath ya s3Url, koi bhi ho

    try {
      const image = await ImageCropPicker.openCropper({
        path: pathToUse, // ✅ S3 URL bhi work karega
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
    } catch (err) {
      console.log('crop cancelled', err);
    }
  };
  const removeImage = index => {
    const updated = [...imageSlots];
    if (updated[index].s3Url) {
      setDeletedUrls(prev => [...prev, updated[index].s3Url]); // S3 delete ke liye save
    }
    updated[index] = { localPath: null, s3Url: null, status: 'empty' }; // slot clear
    setImageSlots(updated);
  };

  // 4️⃣ FaceCheckSheet handlers — add these:

  // User retries — close sheet, re-open picker for same slot
  const handleFaceRetry = async () => {
    closeSheet();
    const index = sheetState.pendingIndex;
    if (index == null) return;
    // Small delay so sheet closes smoothly before picker opens
    setTimeout(() => pickAndCropImage(index), 300);
  };

  // User uploads anyway — skip face check
  const handleFaceSkip = () => {
    if (!sheetState.onPass) return;
    closeSheet();
    sheetState.onPass(); // call the stored onPass — sets slot directly
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
      <OnboardingProgress
        currentStep="Photo" // ← har screen ka apna key
        onBack={() => navigation.goBack()}
      />
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
            <ImageSlot
              key={index}
              slot={slot}
              actualIndex={index}
              imageSlots={imageSlots}
              onPress={() =>
                slot.status === 'empty'
                  ? pickAndCropImage(index)
                  : previewOrRecrop(index)
              }
              onRemove={() => removeImage(index)}
            />
          ))}
        </View>
      </View>
      <View style={{ marginTop: 20, margin: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          {imageSlots.slice(3, 6).map((slot, index) => (
            <ImageSlot
              key={index}
              slot={slot}
              actualIndex={index + 3}
              imageSlots={imageSlots}
              onPress={() =>
                slot.status === 'empty'
                  ? pickAndCropImage(index)
                  : previewOrRecrop(index)
              }
              onRemove={() => removeImage(index)}
            />
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
      </View>
      <Animated.View
        layout={_layout}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        {imageError !== '' && (
          <Animated.Text
            entering={FadeInDown.duration(200).springify()}
            style={{
              color: imageError.includes('main photo') ? '#FF0059' : 'red',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            {imageError}
          </Animated.Text>
        )}

        <Pressable
          onPress={handlePressNext}
          layout={_layout}
          disabled={loading} // disable if less than 2 images or uploading
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: loading || selectedImagesCount < 2 ? 0.7 : 1,
            backgroundColor: '#ff0090ff',
            width: responsiveWidth(85),
            paddingVertical: 10,
            marginTop: 10,
            borderRadius: 35,
            borderStyle: 'solid',
            borderColor: '#ff00aaff',
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
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
          {loading ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <ActivityIndicator color="#fff" />
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Uploading...
              </Text>
            </View>
          ) : (
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
          )}
        </Pressable>
      </Animated.View>

      <FaceCheckSheet
        visible={sheetState.visible}
        result={sheetState.result}
        imageUri={sheetState.imageUri}
        onRetry={handleFaceRetry}
        // onSkip={handleFaceSkip}
        onClose={closeSheet}
      />
    </SafeAreaView>
  );
};

export default PhotoScreen;

const styles = StyleSheet.create({});
