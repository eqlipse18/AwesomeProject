import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'In Flame needs camera access to take photos',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

const _entering = FadeInDown.springify().damping(18).stiffness(300);
const _layout = LinearTransition.springify();

export const AttachmentSheet = ({ visible, onClose, onMediaSelected }) => {
  const handleCamera = useCallback(async () => {
    onClose();
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Camera Access Denied',
        'Please allow camera access in Settings to take photos.',
        [{ text: 'OK' }],
      );
      return;
    }
    launchCamera(
      { mediaType: 'photo', quality: 0.85, saveToPhotos: false },
      res => {
        if (res.didCancel || res.errorCode) return;
        const a = res.assets?.[0];
        if (!a) return;
        onMediaSelected?.(a.uri, a.type || 'image/jpeg', 'image');
      },
    );
  }, [onClose, onMediaSelected]);

  const handleGallery = useCallback(() => {
    onClose();
    launchImageLibrary(
      { mediaType: 'mixed', quality: 0.85, selectionLimit: 1 },
      res => {
        if (res.didCancel || res.errorCode) return;
        const a = res.assets?.[0];
        if (!a) return;
        const isVideo = a.type?.startsWith('video');
        onMediaSelected?.(
          a.uri,
          a.type || 'image/jpeg',
          isVideo ? 'video' : 'image',
        );
      },
    );
  }, [onClose, onMediaSelected]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(160)}
        style={s.bg}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View entering={_entering} layout={_layout} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Send Media</Text>

          <View style={s.row}>
            <TouchableOpacity
              style={s.opt}
              onPress={handleCamera}
              activeOpacity={0.8}
            >
              <View style={[s.ico, { backgroundColor: '#FFF0F5' }]}>
                <Text style={{ fontSize: 32 }}>📷</Text>
              </View>
              <Text style={s.lbl}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.opt}
              onPress={handleGallery}
              activeOpacity={0.8}
            >
              <View style={[s.ico, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 32 }}>🖼️</Text>
              </View>
              <Text style={s.lbl}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.cancel}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  opt: { alignItems: 'center', gap: 10 },
  ico: {
    width: 76,
    height: 76,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lbl: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  cancel: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
  },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: '#64748B' },
});
