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
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DeliveryStatus } from './DeliveryStatus';

const BIG_R = 20,
  SML_R = 5;
const MAX_W = 265;
const REPLY_TRIGGER = 40;
const REPLY_SHOW_AT = 5;
const MAX_DRAG = 80;

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

// ── Reply quote (inside bubble, top) ──────────────────────────────────────
const ReplyQuote = ({ replyTo, isOwn, onPress }) => {
  if (!replyTo?.messageId) return null;

  const preview =
    replyTo.type === 'image'
      ? '📷 Photo'
      : replyTo.type === 'video'
      ? '🎥 Video'
      : replyTo.type === 'deleted'
      ? '🚫 Message deleted'
      : (replyTo.content || '').slice(0, 90);

  const label = replyTo.senderName || (replyTo.senderId ? 'User' : '');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[q.wrap, isOwn ? q.own : q.other]}
    >
      <View style={[q.accent, isOwn ? q.accentOwn : q.accentOther]} />
      <View style={q.body}>
        {!!label && (
          <Text style={[q.sender, isOwn && q.senderOwn]} numberOfLines={1}>
            {label}
          </Text>
        )}
        <Text style={[q.txt, isOwn && q.txtOwn]} numberOfLines={2}>
          {preview}
        </Text>
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
    maxWidth: MAX_W * 0.92,
  },
  own: { backgroundColor: 'rgba(255,255,255,0.20)' },
  other: { backgroundColor: 'rgba(0,0,0,0.07)' },
  accent: { width: 3, flexShrink: 0 },
  accentOwn: { backgroundColor: 'rgba(255,255,255,0.7)' },
  accentOther: { backgroundColor: '#FF0059' },
  body: { flex: 1, padding: 7 },
  sender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  senderOwn: { color: 'rgba(255,255,255,0.65)' },
  txt: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  txtOwn: { color: 'rgba(255,255,255,0.75)' },
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
    onSwipeReply,
    onPressReplyQuote,
    onAvatarPress,
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

    // ── Swipe to reply ────────────────────────────────────────────────────
    const swipeX = useSharedValue(0);
    const triggered = useRef(false);

    const triggerReply = useCallback(() => {
      onSwipeReply?.(message);
    }, [message, onSwipeReply]);

    // Received → swipe RIGHT (positive)
    // Own      → swipe LEFT  (negative)
    const swipeGesture = isOwn
      ? Gesture.Pan()
          .activeOffsetX([-Infinity, -REPLY_SHOW_AT])
          .failOffsetY([-15, 15])
          .onUpdate(e => {
            'worklet';
            swipeX.value = Math.max(-MAX_DRAG, Math.min(e.translationX, 0));
            if (swipeX.value <= -REPLY_TRIGGER && !triggered.current) {
              triggered.current = true;
              runOnJS(triggerReply)();
            }
          })
          .onEnd(() => {
            'worklet';
            triggered.current = false;
            swipeX.value = withSpring(0, {
              stiffness: 340,
              damping: 28,
              mass: 0.6,
            });
          })
      : Gesture.Pan()
          .activeOffsetX([REPLY_SHOW_AT, Infinity])
          .failOffsetY([-15, 15])
          .onUpdate(e => {
            'worklet';
            swipeX.value = Math.max(0, Math.min(e.translationX, MAX_DRAG));
            if (swipeX.value >= REPLY_TRIGGER && !triggered.current) {
              triggered.current = true;
              runOnJS(triggerReply)();
            }
          })
          .onEnd(() => {
            'worklet';
            triggered.current = false;
            swipeX.value = withSpring(0, {
              stiffness: 340,
              damping: 28,
              mass: 0.6,
            });
          });

    const swipeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: swipeX.value }],
    }));

    const arrowStyle = useAnimatedStyle(() => {
      const abs = Math.abs(swipeX.value);
      return {
        opacity: withTiming(
          abs > REPLY_SHOW_AT ? Math.min((abs - REPLY_SHOW_AT) / 25, 1) : 0,
          { duration: 50 },
        ),
        transform: [
          {
            scale: withSpring(abs >= REPLY_TRIGGER ? 1.25 : 0.85, {
              damping: 20,
              stiffness: 280,
            }),
          },
        ],
      };
    });

    // ── Long press ────────────────────────────────────────────────────────
    const handleLongPress = useCallback(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        onLongPress?.(message, { x, y, width, height });
      });
    }, [message, onLongPress]);

    // ── Tap — ALL messages (including deleted) ────────────────────────────
    const handlePress = useCallback(() => {
      onSelect?.(isSelected ? null : message.messageId);
    }, [message.messageId, isSelected, onSelect]);

    // ── Rx tip press ──────────────────────────────────────────────────────
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
        {/* Left arrow — received bubbles, right swipe */}
        {!isOwn && (
          <Animated.View style={[s.arrow, s.arrowLeft, arrowStyle]}>
            <Text style={s.arrowIco}>↩</Text>
          </Animated.View>
        )}

        {/* Avatar slot */}
        {!isOwn && (
          <View style={s.avtSlot}>
            {last ? (
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
                {otherImage ? (
                  <Image source={{ uri: otherImage }} style={s.avt} />
                ) : (
                  <View style={[s.avt, s.avtFb]}>
                    <Text style={{ fontSize: 11 }}>👤</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Swipeable column */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[s.col, isOwn && s.colOwn, swipeStyle]}>
            <Pressable
              ref={containerRef}
              onPress={handlePress}
              onLongPress={handleLongPress}
              delayLongPress={340}
              style={{ position: 'relative' }}
            >
              {/* Reply quote on TOP of bubble */}
              {!!message.replyTo?.messageId && (
                <ReplyQuote
                  replyTo={message.replyTo}
                  isOwn={isOwn}
                  onPress={() => onPressReplyQuote?.(message.replyTo.messageId)}
                />
              )}

              {/* ── Bubble ── */}
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
                  {/* Reply quote can also be above media */}
                </TouchableOpacity>
              ) : isOwn ? (
                <LinearGradient
                  colors={['#FF0059', '#FF5289']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.bbl, radius]}
                >
                  {/* Edited badge — top-right inside bubble */}
                  {message.isEdited && (
                    <TouchableOpacity
                      style={s.editedBadge}
                      onPress={() => setShowOriginal(p => !p)}
                      hitSlop={8}
                    >
                      <Text style={s.editedTxtOwn}>
                        {showOriginal ? 'current ↓' : 'edited ↑'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* Original content — shown on badge tap */}
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
                      onPress={() => setShowOriginal(p => !p)}
                      hitSlop={8}
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

            {/* Timestamp on tap — normal messages */}
            {isSelected && !isDeleted && (
              <Animated.View
                layout={LinearTransition.springify()}
                style={[s.timePill, isOwn && s.timePillOwn]}
              >
                <Text style={s.timeTxt}>{fmt(message.createdAt)}</Text>
              </Animated.View>
            )}

            {/* Deletion timestamp on tap */}
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

            {/* Last own — delivery + timestamp */}
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

        {/* Right arrow — own bubbles, left swipe */}
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
    marginBottom: 3,
    paddingHorizontal: 0,
    overflow: 'visible',
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  rowGrouped: { marginBottom: 1 },
  rowWithRx: { marginBottom: 18 },

  // Swipe arrow
  arrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  arrowLeft: { marginRight: 4, marginLeft: 2 },
  arrowRight: { marginLeft: 4, marginRight: 2 },
  arrowIco: { fontSize: 11, color: '#64748B' },

  // Avatar
  avtSlot: {
    width: 34,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avt: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9' },
  avtFb: { justifyContent: 'center', alignItems: 'center' },

  col: { maxWidth: MAX_W, alignItems: 'flex-start' },
  colOwn: { alignItems: 'flex-end' },

  // Bubbles
  bbl: { paddingHorizontal: 14, paddingVertical: 9 },
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

  // Edited badge — top-right inside bubble
  editedBadge: { alignSelf: 'flex-end', marginBottom: 3 },
  editedTxtOwn: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
  },
  editedTxtOther: { fontSize: 10, color: '#94A3B8', fontStyle: 'italic' },

  // Original content reveal
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

  // Deleted
  deletedBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deletedTxt: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },

  // Media
  mediaBubble: { overflow: 'hidden' },
  mediaBubbleOther: { borderWidth: 1, borderColor: '#F1F5F9' },
  mediaImg: { width: MAX_W * 0.82, height: MAX_W * 0.82 * 1.1 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  // Timestamp
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
