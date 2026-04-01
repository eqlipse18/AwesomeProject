import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ReactionStrip } from './ReactionStrip';
import { DeliveryStatus } from './DeliveryStatus';

const R = 20,
  r = 5;
const MAX_W = 260;

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const isMediaUrl = url =>
  typeof url === 'string' &&
  (url.includes('amazonaws.com') || url.startsWith('http'));

export const MessageBubble = React.memo(
  ({
    message,
    isOwn,
    first,
    last,
    reactions,
    myUserId,
    otherImage,
    isLastOwn, // ← show delivery status below this bubble
    selectedMsgId, // ← tap-to-show-time state from parent
    onSelect, // ← (msgId) => void
    onLongPress,
    onRxPress,
    onMediaPress,
  }) => {
    const isSelected = selectedMsgId === message.messageId;
    const isMedia = message.type === 'image' || message.type === 'video';

    const radius = isOwn
      ? {
          borderTopLeftRadius: R,
          borderTopRightRadius: first ? R : r,
          borderBottomRightRadius: last ? R : r,
          borderBottomLeftRadius: R,
        }
      : {
          borderTopLeftRadius: first ? R : r,
          borderTopRightRadius: R,
          borderBottomRightRadius: R,
          borderBottomLeftRadius: last ? R : r,
        };

    const handlePress = useCallback(() => {
      onSelect(isSelected ? null : message.messageId);
    }, [isSelected, message.messageId, onSelect]);

    return (
      <Animated.View
        entering={FadeInUp.duration(200).springify()}
        style={[s.row, isOwn ? s.rowOwn : s.rowOther, !first && s.rowGrouped]}
      >
        {/* Avatar — other user only, last in group */}
        {!isOwn && (
          <View style={s.avtSlot}>
            {last ? (
              otherImage ? (
                <Image source={{ uri: otherImage }} style={s.avt} />
              ) : (
                <View style={[s.avt, s.avtFb]}>
                  <Text style={{ fontSize: 11 }}>👤</Text>
                </View>
              )
            ) : null}
          </View>
        )}

        <View style={[s.col, isOwn && s.colOwn]}>
          <Pressable
            onPress={handlePress}
            onLongPress={() => onLongPress(message)}
            delayLongPress={350}
          >
            {isMedia ? (
              <TouchableOpacity
                onPress={() => onMediaPress(message.content)}
                activeOpacity={0.9}
              >
                <View
                  style={[s.mediaBubble, radius, !isOwn && s.mediaBubbleOther]}
                >
                  <Image
                    source={{ uri: message.content }}
                    style={s.mediaImg}
                    resizeMode="cover"
                  />
                  {message.type === 'video' && (
                    <View style={s.videoOverlay}>
                      <Text style={{ fontSize: 28, color: '#fff' }}>▶</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : isOwn ? (
              <LinearGradient
                colors={['#FF0059', '#FF5289']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.bbl, radius]}
              >
                <Text style={s.txtOwn}>{message.content}</Text>
              </LinearGradient>
            ) : (
              <View style={[s.bbl, s.bblOther, radius]}>
                <Text style={s.txtOther}>{message.content}</Text>
              </View>
            )}
          </Pressable>

          <ReactionStrip
            reactions={reactions}
            isOwn={isOwn}
            myUserId={myUserId}
            onPress={() => onRxPress(message)}
          />

          {/* Tap-to-show timestamp — only when selected */}
          {isSelected && (
            <Animated.View
              entering={FadeInUp.duration(150)}
              style={[s.timePill, isOwn && s.timePillOwn]}
            >
              <Text style={s.timeTxt}>{fmt(message.createdAt)}</Text>
            </Animated.View>
          )}

          {/* Delivery status — insta style, only below last own message */}
          {isOwn && isLastOwn && (
            <DeliveryStatus
              status={message.status}
              createdAt={message.createdAt}
            />
          )}
        </View>
      </Animated.View>
    );
  },
);

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  rowGrouped: { marginBottom: 1 },

  avtSlot: {
    width: 32,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avt: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9' },
  avtFb: { justifyContent: 'center', alignItems: 'center' },

  col: { maxWidth: MAX_W, alignItems: 'flex-start' },
  colOwn: { alignItems: 'flex-end' },

  bbl: { paddingHorizontal: 14, paddingVertical: 10 },
  bblOther: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  txtOwn: { fontSize: 15, color: '#fff', lineHeight: 22 },
  txtOther: { fontSize: 15, color: '#0F172A', lineHeight: 22 },

  mediaBubble: { overflow: 'hidden' },
  mediaBubbleOther: { borderWidth: 1, borderColor: '#F1F5F9' },
  mediaImg: { width: MAX_W * 0.82, height: MAX_W * 0.82 * 1.15 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  timePill: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  timePillOwn: { alignSelf: 'flex-end' },
  timeTxt: { fontSize: 11, color: '#64748B' },
});
