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
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DeliveryStatus } from './DeliveryStatus';

const BIG_R = 20,
  SML_R = 5;
const MAX_W = '80%';
const REPLY_TRIGGER = 40;
const MAX_DRAG = 80;

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const ReplyQuote = ({ replyTo, isOwn, onPress }) => {
  if (!replyTo?.messageId) return null;

  const preview =
    replyTo.type === 'image'
      ? '📷 Photo'
      : replyTo.type === 'video'
      ? '🎥 Video'
      : replyTo.type === 'deleted'
      ? '🚫 Deleted'
      : (replyTo.content || '').slice(0, 90);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[q.wrap, isOwn ? q.own : q.other]}>
        <View style={[q.accent, isOwn ? q.accentOwn : q.accentOther]} />
        <View style={q.body}>
          {!!replyTo.senderName && (
            <Text style={[q.sender, isOwn ? q.senderOwn : q.senderOther]}>
              {replyTo.senderName}
            </Text>
          )}
          <Text
            style={[q.txt, isOwn ? q.txtOwn : q.txtOther]}
            numberOfLines={2}
          >
            {preview}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const q = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    minHeight: 38, // ← ensure height
  },
  own: { backgroundColor: '#ff6a9e94' }, // dark on red gradient
  other: { backgroundColor: 'rgba(255, 0, 0, 0.06)' }, // subtle on white

  accent: { width: 2, flexShrink: 0 },
  accentOwn: { backgroundColor: '#FF0059' },
  accentOther: { backgroundColor: '#FF0059' },

  body: { flex: 1, paddingHorizontal: 8, paddingVertical: 6 },

  sender: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  senderOwn: { color: 'rgba(255,255,255,0.9)' }, // white on red
  senderOther: { color: '#FF0059' }, // pink on white

  txt: { fontSize: 12, lineHeight: 17, color: '#0F172A' },
  txtOwn: { color: 'rgba(255, 255, 255, 0.95)' }, // white on red
  txtOther: { color: '#ff0099' }, // dark on white
});

// ── Reaction tip ──────────────────────────────────────────────────────────
const RxTip = ({ reactions, isOwn, onPress }) => {
  if (!reactions || !Object.keys(reactions).length) return null;
  const emojis = [...new Set(Object.values(reactions))].slice(0, 3).join('');
  const count = Object.keys(reactions).length;
  return (
    <TouchableOpacity
      style={[rt.wrap, isOwn ? rt.own : rt.other]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={rt.emoji}>{emojis}</Text>
      {count > 1 && <Text style={rt.count}>{count}</Text>}
    </TouchableOpacity>
  );
};

const rt = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: -13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 5,
  },
  own: { right: 8 },
  other: { left: 8 },
  emoji: { fontSize: 13 },
  count: { fontSize: 10, color: '#64748B', fontWeight: '600' },
});

// ════════════════════════════════════════════════════════════════════════════
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
    onLongPress,
    onRxTipPress,
    onMediaPress,
    onSwipeReply, // onSwipeReply now called on finger RELEASE
    onPressReplyQuote,
    onAvatarPress,
    isHighlighted, // ← ADD
  }) => {
    const isSelected = selectedMsgId === message.messageId;
    const isDeleted = message.type === 'deleted';
    const isMedia = message.type === 'image' || message.type === 'video';
    const hasReactions = reactions && Object.keys(reactions).length > 0;
    const [showOriginal, setShowOriginal] = useState(false);
    const containerRef = useRef(null);

    const radius = isOwn
      ? {
          borderTopLeftRadius: BIG_R,
          borderTopRightRadius: first ? BIG_R : SML_R,
          borderBottomRightRadius: last ? BIG_R : SML_R,
          borderBottomLeftRadius: BIG_R,
        }
      : {
          borderTopLeftRadius: first ? BIG_R : SML_R,
          borderTopRightRadius: BIG_R,
          borderBottomRightRadius: BIG_R,
          borderBottomLeftRadius: last ? BIG_R : SML_R,
        };

    // ── Swipe — full bubble hitSlop, trigger on release ──────────────────
    const swipeX = useSharedValue(0);
    const triggered = useRef(false);

    const fireReply = useCallback(() => {
      onSwipeReply?.(message);
    }, [message, onSwipeReply]);

    const swipeGesture = isOwn
      ? Gesture.Pan()
          .minDistance(4) // ← very sensitive start
          .activeOffsetX([-8, Infinity]) // ← start from tiny move
          .failOffsetY([-20, 20])
          .onUpdate(e => {
            'worklet';
            swipeX.value = Math.max(-MAX_DRAG, Math.min(e.translationX, 0));
            if (swipeX.value <= -REPLY_TRIGGER) triggered.current = true;
          })
          .onEnd(() => {
            'worklet';
            // ── Reply bar only on finger release ──
            if (triggered.current) runOnJS(fireReply)();
            triggered.current = false;
            swipeX.value = withSpring(0, {
              stiffness: 300,
              damping: 26,
              mass: 0.5,
            });
          })
      : Gesture.Pan()
          .minDistance(4)
          .activeOffsetX([-Infinity, 8])
          .failOffsetY([-20, 20])
          .onUpdate(e => {
            'worklet';
            swipeX.value = Math.max(0, Math.min(e.translationX, MAX_DRAG));
            if (swipeX.value >= REPLY_TRIGGER) triggered.current = true;
          })
          .onEnd(() => {
            'worklet';
            if (triggered.current) runOnJS(fireReply)();
            triggered.current = false;
            swipeX.value = withSpring(0, {
              stiffness: 300,
              damping: 26,
              mass: 0.5,
            });
          });

    const swipeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: swipeX.value }],
    }));

    // Arrow opacity + scale
    const arrowStyle = useAnimatedStyle(() => {
      const abs = Math.abs(swipeX.value);
      return {
        opacity: withTiming(abs > 5 ? Math.min(abs / 30, 1) : 0, {
          duration: 40,
        }),
        transform: [
          {
            scale: withSpring(abs >= REPLY_TRIGGER ? 1.3 : 0.85, {
              damping: 18,
              stiffness: 260,
            }),
          },
        ],
      };
    });

    const handleLongPress = useCallback(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        onLongPress?.(message, { x, y, width, height });
      });
    }, [message, onLongPress]);

    const handlePress = useCallback(() => {
      onSelect?.(isSelected ? null : message.messageId);
    }, [message.messageId, isSelected, onSelect]);

    const handleRxTipPress = useCallback(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        onRxTipPress?.(message, {
          x: isOwn ? x : x + width,
          y: y + height,
        });
      });
    }, [message, isOwn, onRxTipPress]);

    return (
      <Animated.View
        layout={LinearTransition.springify().damping(18)}
        style={[
          s.row,
          isOwn ? s.rowOwn : s.rowOther,
          !first && s.rowGrouped,
          hasReactions && s.rowWithRx,
        ]}
      >
        {/* Arrow — received */}
        {!isOwn && (
          <Animated.View style={[s.arrow, s.arrowLeft, arrowStyle]}>
            <Text style={s.arrowIco}>↩</Text>
          </Animated.View>
        )}

        {/* Avatar */}
        {!isOwn && (
          <View style={s.avtSlot}>
            {last ? (
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
                {otherImage ? (
                  <Image source={{ uri: otherImage }} style={s.avt} />
                ) : (
                  <View style={[s.avt, s.avtFb]}>
                    <Text style={{ fontSize: 10 }}>👤</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── Swipeable col ── */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[s.col, isOwn && s.colOwn, swipeStyle]}>
            <Pressable
              ref={containerRef}
              onPress={handlePress}
              onLongPress={handleLongPress}
              delayLongPress={340}
              style={{ position: 'relative' }}
            >
              {/* ── Highlight overlay ── */}
              {isHighlighted && (
                <Animated.View
                  entering={FadeIn.duration(100)}
                  exiting={FadeOut.duration(600)}
                  style={[StyleSheet.absoluteFillObject, s.highlightOverlay]}
                  pointerEvents="none"
                />
              )}
              {/* Reply quote */}
              {!!message.replyTo?.messageId && (
                <ReplyQuote
                  replyTo={message.replyTo}
                  isOwn={isOwn}
                  onPress={() => {
                    console.log(
                      '[DEBUG] ReplyQuote pressed, id:',
                      message.replyTo.messageId,
                    );
                    onPressReplyQuote?.(message.replyTo.messageId);
                  }}
                />
              )}

              {/* Bubble */}
              {isDeleted ? (
                <View style={[s.deletedBubble, radius]}>
                  <Text style={s.deletedTxt}>🚫 This message was deleted</Text>
                </View>
              ) : isMedia ? (
                <TouchableOpacity
                  onPress={() => onMediaPress?.(message.content)}
                  activeOpacity={0.92}
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
                  </View>
                </TouchableOpacity>
              ) : isOwn ? (
                <LinearGradient
                  colors={['#FF0059', '#FF5289']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.bbl, radius]}
                >
                  {message.isEdited && (
                    <TouchableOpacity
                      style={s.editedBadge}
                      hitSlop={8}
                      onPress={() => setShowOriginal(p => !p)}
                    >
                      <Text style={s.editedTxtOwn}>
                        {showOriginal ? 'current ↓' : 'edited ↑'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showOriginal && message.originalContent && (
                    <Animated.View
                      layout={LinearTransition.springify()}
                      style={s.originalWrapOwn}
                    >
                      <Text style={s.originalTxtOwn}>
                        {message.originalContent}
                      </Text>
                    </Animated.View>
                  )}
                  <Text style={s.txtOwn}>{message.content}</Text>
                </LinearGradient>
              ) : (
                <View style={[s.bbl, s.bblOther, radius]}>
                  {message.isEdited && (
                    <TouchableOpacity
                      style={s.editedBadge}
                      hitSlop={8}
                      onPress={() => setShowOriginal(p => !p)}
                    >
                      <Text style={s.editedTxtOther}>
                        {showOriginal ? 'current ↓' : 'edited ↑'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showOriginal && message.originalContent && (
                    <Animated.View
                      layout={LinearTransition.springify()}
                      style={s.originalWrapOther}
                    >
                      <Text style={s.originalTxtOther}>
                        {message.originalContent}
                      </Text>
                    </Animated.View>
                  )}
                  <Text style={s.txtOther}>{message.content}</Text>
                </View>
              )}

              {/* Reaction tip */}
              {hasReactions && (
                <RxTip
                  reactions={reactions}
                  isOwn={isOwn}
                  onPress={handleRxTipPress}
                />
              )}
            </Pressable>

            {/* Tap timestamp */}
            {isSelected && !isDeleted && (
              <Animated.View
                layout={LinearTransition.springify()}
                style={[s.timePill, isOwn && s.timePillOwn]}
              >
                <Text style={s.timeTxt}>{fmt(message.createdAt)}</Text>
              </Animated.View>
            )}

            {/* Deleted timestamp on tap */}
            {isDeleted && isSelected && (
              <Animated.View
                layout={LinearTransition.springify()}
                style={[s.timePill, isOwn && s.timePillOwn]}
              >
                <Text style={s.timeTxt}>
                  Deleted · {fmt(message.deletedAt || message.createdAt)}
                </Text>
              </Animated.View>
            )}

            {/* Last own — delivery */}
            {isOwn && isLastOwn && !isDeleted && !isSelected && (
              <Animated.View layout={LinearTransition.springify()}>
                <DeliveryStatus
                  status={message.status}
                  createdAt={message.createdAt}
                />
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>

        {/* Arrow — own */}
        {isOwn && (
          <Animated.View style={[s.arrow, s.arrowRight, arrowStyle]}>
            <Text style={s.arrowIco}>↩</Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  },
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    // ← NO paddingHorizontal here — full width
    marginBottom: 3,
    overflow: 'visible',
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  rowGrouped: { marginBottom: 1 },
  rowWithRx: { marginBottom: 18 },

  arrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    flexShrink: 0,
  },
  arrowLeft: { marginRight: 2 },
  arrowRight: { marginLeft: 2 },
  arrowIco: { fontSize: 11, color: '#64748B' },

  avtSlot: {
    width: 32,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  avt: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9' },
  avtFb: { justifyContent: 'center', alignItems: 'center' },

  // ← NO maxWidth in px — use percentage so it goes edge to edge
  col: { maxWidth: MAX_W, alignItems: 'flex-start' },
  colOwn: { alignItems: 'flex-end' },

  bbl: { paddingHorizontal: 13, paddingVertical: 9 },
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

  editedBadge: { alignSelf: 'flex-end', marginBottom: 3 },
  editedTxtOwn: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
  },
  editedTxtOther: { fontSize: 10, color: '#94A3B8', fontStyle: 'italic' },

  originalWrapOwn: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    padding: 7,
    marginBottom: 5,
  },
  originalTxtOwn: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
  },
  originalWrapOther: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    padding: 7,
    marginBottom: 5,
  },
  originalTxtOther: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  highlightOverlay: {
    backgroundColor: 'rgba(0, 251, 255, 0.25)', // subtle pink — matches app theme
    borderRadius: 20,
    zIndex: 10,
  },

  deletedBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deletedTxt: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },

  mediaBubble: { overflow: 'hidden' },
  mediaBubbleOther: { borderWidth: 1, borderColor: '#F1F5F9' },
  mediaImg: { width: 220, height: 240 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  timePill: {
    backgroundColor: 'rgba(0,0,0,0.055)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  timePillOwn: { alignSelf: 'flex-end' },
  timeTxt: { fontSize: 10, color: '#94A3B8' },
});
