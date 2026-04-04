import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ReactionStrip } from './ReactionStrip';
import { DeliveryStatus } from './DeliveryStatus';

const R = 20,
  r = 5;
const MAX_W = 260;
const SWIPE_THRESHOLD = 70;

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const _entering = FadeInDown.springify().damping(18).stiffness(320);
const _entering1 = FadeInDown.springify().delay(80).damping(18).stiffness(320);
const _layout = LinearTransition.springify();

// ── Reply preview inside bubble ──
const ReplyQuote = ({ replyTo, isOwn }) => {
  if (!replyTo) return null;
  const content =
    replyTo.type === 'image'
      ? '📷 Photo'
      : replyTo.type === 'video'
      ? '🎥 Video'
      : replyTo.type === 'deleted'
      ? 'Message deleted'
      : replyTo.content?.slice(0, 60) || '';

  return (
    <View style={[q.wrap, isOwn ? q.own : q.other]}>
      <View style={q.accent} />
      <Text style={[q.txt, isOwn && q.txtOwn]} numberOfLines={2}>
        {content}
      </Text>
    </View>
  );
};

const q = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.07)',
    maxWidth: MAX_W * 0.9,
  },
  own: { backgroundColor: 'rgba(255,255,255,0.2)' },
  other: { backgroundColor: 'rgba(0,0,0,0.06)' },
  accent: { width: 3, backgroundColor: '#FF0059' },
  txt: { flex: 1, fontSize: 12, color: '#64748B', padding: 6, lineHeight: 17 },
  txtOwn: { color: 'rgba(255,255,255,0.8)' },
});

export const MessageBubble = React.memo(
  ({
    message,
    isOwn,
    first,
    last,
    reactions,
    myUserId,
    otherImage,
    isLastOwn,
    selectedMsgId,
    onSelect,
    onLongPress, // (message, pageY, pageX) => void
    onRxPress,
    onMediaPress,
    onSwipeReply, // (message) => void
  }) => {
    const isSelected = selectedMsgId === message.messageId;
    const isDeleted = message.type === 'deleted';
    const isMedia = message.type === 'image' || message.type === 'video';
    const [showOriginal, setShowOriginal] = useState(false);
    const bubbleRef = useRef(null);

    // Swipe to reply
    const swipeX = useSharedValue(0);
    const ARROW_THRESHOLD = 60;
    const triggered = useRef(false);

    const triggerReply = useCallback(() => {
      onSwipeReply?.(message);
    }, [message, onSwipeReply]);

    const swipeGesture = Gesture.Pan()
      .activeOffsetX([15, Infinity])
      .failOffsetY([-12, 12])
      .onUpdate(e => {
        'worklet';
        swipeX.value = Math.min(e.translationX, 90);
        if (swipeX.value > ARROW_THRESHOLD && !triggered.current) {
          triggered.current = true;
          runOnJS(triggerReply)();
        }
      })
      .onEnd(() => {
        'worklet';
        triggered.current = false;
        swipeX.value = withSpring(0, { stiffness: 300, damping: 22 });
      });

    const swipeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: withTiming(swipeX.value, { duration: 50 }) }],
    }));

    const arrowOpacity = useAnimatedStyle(() => ({
      opacity: withTiming(
        swipeX.value > 20 ? Math.min((swipeX.value - 20) / 40, 1) : 0,
        { duration: 80 },
      ),
      transform: [
        { scale: withSpring(swipeX.value > ARROW_THRESHOLD ? 1.15 : 1) },
      ],
    }));

    // Bubble corner radii
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

    const handleLongPress = useCallback(
      e => {
        onLongPress?.(message, e.nativeEvent.pageY, e.nativeEvent.pageX);
      },
      [message, onLongPress],
    );

    const handlePress = useCallback(() => {
      if (isDeleted) return;
      if (message.isEdited && showOriginal !== undefined) {
        setShowOriginal(p => !p);
        return;
      }
      onSelect?.(isSelected ? null : message.messageId);
    }, [isDeleted, message, isSelected, onSelect, showOriginal]);

    // Reaction count summary for bubble tip
    const rxSummary =
      reactions && Object.keys(reactions).length
        ? Object.values(reactions).slice(0, 3).join('')
        : null;

    return (
      <Animated.View
        entering={_entering}
        layout={_layout}
        style={[s.row, isOwn ? s.rowOwn : s.rowOther, !first && s.rowGrouped]}
      >
        {/* Reply arrow indicator */}
        <Animated.View style={[s.replyArrow, arrowOpacity]}>
          <Text style={s.replyArrowIco}>↩</Text>
        </Animated.View>

        {/* Avatar — other user, last in group */}
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

        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[s.col, isOwn && s.colOwn, swipeStyle]}>
            <Pressable
              ref={bubbleRef}
              onPress={handlePress}
              onLongPress={handleLongPress}
              delayLongPress={330}
            >
              {/* Reply quote if this is a reply */}
              {message.replyTo && (
                <ReplyQuote replyTo={message.replyTo} isOwn={isOwn} />
              )}

              {/* Bubble content */}
              {isDeleted ? (
                <View style={[s.deletedBubble, radius]}>
                  <Text style={s.deletedTxt}>🚫 This message was deleted</Text>
                </View>
              ) : isMedia ? (
                <TouchableOpacity
                  onPress={() => onMediaPress?.(message.content)}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      s.mediaBubble,
                      radius,
                      !isOwn && s.mediaBubbleOther,
                    ]}
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
                    {/* Reaction tip on media */}
                    {rxSummary && (
                      <View
                        style={[s.rxTip, isOwn ? s.rxTipOwn : s.rxTipOther]}
                      >
                        <Text style={s.rxTipTxt}>{rxSummary}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ) : isOwn ? (
                <View>
                  <LinearGradient
                    colors={['#FF0059', '#FF5289']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[s.bbl, radius]}
                  >
                    <Text style={s.txtOwn}>{message.content}</Text>
                  </LinearGradient>
                  {/* Reaction tip on text bubble */}
                  {rxSummary && (
                    <View style={[s.rxTip, s.rxTipOwn]}>
                      <Text style={s.rxTipTxt}>{rxSummary}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <View style={[s.bbl, s.bblOther, radius]}>
                    <Text style={s.txtOther}>{message.content}</Text>
                  </View>
                  {rxSummary && (
                    <View style={[s.rxTip, s.rxTipOther]}>
                      <Text style={s.rxTipTxt}>{rxSummary}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>

            {/* Tap-to-show timestamp */}
            {isSelected && !isDeleted && (
              <Animated.View
                entering={_entering1}
                layout={_layout}
                style={[s.timePill, isOwn && s.timePillOwn]}
              >
                <Text style={s.timeTxt}>{fmt(message.createdAt)}</Text>
              </Animated.View>
            )}

            {/* Edited indicator + original on tap */}
            {message.isEdited && !isDeleted && (
              <Animated.View layout={_layout}>
                <TouchableOpacity onPress={() => setShowOriginal(p => !p)}>
                  <Text style={[s.editedLbl, isOwn && s.editedLblOwn]}>
                    edited {showOriginal ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {showOriginal && (
                  <Animated.View
                    entering={_entering1}
                    layout={_layout}
                    style={[s.originalWrap, isOwn && s.originalWrapOwn]}
                  >
                    <Text style={s.originalTxt}>{message.originalContent}</Text>
                  </Animated.View>
                )}
              </Animated.View>
            )}

            {/* Last own message — delivery status */}
            {isOwn && isLastOwn && !isDeleted && (
              <DeliveryStatus
                status={message.status}
                createdAt={message.createdAt}
              />
            )}

            {/* Last message — always show timestamp */}
            {isLastOwn && !isSelected && !isDeleted && (
              <Animated.View
                layout={_layout}
                style={[s.timePill, s.timePillOwn, { marginTop: 2 }]}
              >
                <Text style={s.timeTxt}>{fmt(message.createdAt)}</Text>
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    );
  },
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
    overflow: 'visible',
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  rowGrouped: { marginBottom: 1 },

  replyArrow: {
    position: 'absolute',
    left: -28,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  replyArrowIco: { fontSize: 12, color: '#64748B' },

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

  deletedBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deletedTxt: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },

  mediaBubble: { overflow: 'hidden' },
  mediaBubbleOther: { borderWidth: 1, borderColor: '#F1F5F9' },
  mediaImg: { width: MAX_W * 0.82, height: MAX_W * 0.82 * 1.15 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  // Reaction tip — bottom corner of bubble
  rxTip: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rxTipOwn: { right: 4 },
  rxTipOther: { left: 4 },
  rxTipTxt: { fontSize: 13 },

  timePill: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  timePillOwn: { alignSelf: 'flex-end' },
  timeTxt: { fontSize: 10, color: '#94A3B8' },

  editedLbl: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  editedLblOwn: { alignSelf: 'flex-end' },
  originalWrap: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    maxWidth: MAX_W * 0.85,
    alignSelf: 'flex-start',
  },
  originalWrapOwn: { alignSelf: 'flex-end' },
  originalTxt: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
});
