import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

const { width: W } = Dimensions.get('window');
const COL = 3;
const CELL = (W - 4) / COL;

export const SharedMediaSheet = ({
  visible,
  messages,
  onClose,
  onPressMedia,
}) => {
  const mediaItems = useMemo(
    () => messages.filter(m => m.type === 'image' || m.type === 'video'),
    [messages],
  );

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(260)}
        exiting={SlideOutDown.duration(200)}
        style={sm.sheet}
      >
        {/* Header */}
        <View style={sm.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={sm.closeIco}>✕</Text>
          </TouchableOpacity>
          <Text style={sm.title}>Shared Media</Text>
          <Text style={sm.count}>{mediaItems.length} items</Text>
        </View>

        {mediaItems.length === 0 ? (
          <View style={sm.empty}>
            <Text style={sm.emptyIco}>📷</Text>
            <Text style={sm.emptyTxt}>No shared media yet</Text>
          </View>
        ) : (
          <FlatList
            data={mediaItems}
            numColumns={COL}
            keyExtractor={item => item.messageId}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onPressMedia(item.content)}
                activeOpacity={0.85}
                style={sm.cell}
              >
                <Image
                  source={{ uri: item.content }}
                  style={sm.img}
                  resizeMode="cover"
                />
                {item.type === 'video' && (
                  <View style={sm.videoOverlay}>
                    <Text style={sm.videoIco}>▶</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

const sm = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#111',
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  closeIco: { fontSize: 16, color: '#94A3B8', width: 28 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },
  count: { fontSize: 12, color: '#64748B' },
  cell: { width: CELL, height: CELL, margin: 0.5 },
  img: { width: '100%', height: '100%' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoIco: { fontSize: 24, color: '#fff' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  emptyIco: { fontSize: 48 },
  emptyTxt: { fontSize: 14, color: '#94A3B8' },
});
