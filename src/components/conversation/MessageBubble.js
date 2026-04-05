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
const MAX_W = 260;
const REPLY_TRIGGER = 65; // trigger setReplyingTo
const REPLY_SHOW_AT = 5; // show arrow from this px

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

// ── Reply quote (inside bubble) ───────────────────────────────────────────
const ReplyQuote = ({ replyTo, isOwn, onPress }) => {
  if (!replyTo) return null;
  const content =
    replyTo.type === 'image'
      ? '📷 Photo'
      : replyTo.type === 'video'
      ? '🎥 Video'
      : replyTo.type === 'deleted'
      ? 'Message deleted'
      : (replyTo.content || '').slice(0, 80);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[q.wrap, isOwn ? q.own : q.other]}
    >
      <View style={q.accent} />
      <Text style={[q.txt, isOwn && q.txtOwn]} numberOfLines={2}>
        {replyTo.senderName ? `${replyTo.senderName}: ` : ''}
        {content}
      </Text>
    </TouchableOpacity>
  );
};

const q = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
    opacity: 0.72,
    maxWidth: MAX_W * 0.9,
  },
  own: { backgroundColor: 'rgba(255,255,255,0.22)' },
  other: { backgroundColor: 'rgba(0,0,0,0.06)' },
  accent: { width: 3, backgroundColor: '#FF0059', flexShrink: 0 },
  txt: { flex: 1, fontSize: 12, color: '#64748B', padding: 6, lineHeight: 17 },
  txtOwn: { color: 'rgba(255,255,255,0.78)' },
});

// ── Reaction tip (emoji at bubble tip corner) ─────────────────────────────
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
    bottom: -12,
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
  own: { right: 6 },
  other: { left: 6 },
  emoji: { fontSize: 13 },
  count: { fontSize: 10, color: '#64748B', fontWeight: '600' },
});

// ── Main Bubble ───────────────────────────────────────────────────────────
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
    onLongPress, // (message, bubbleLayout) => void
    onRxTipPress, // (message, { x, y }) => void
    onMediaPress,
    onSwipeReply,
    onPressReplyQuote, // (replyToMessageId) => void
    onAvatarPress,
  }) => {
    const isSelected = selectedMsgId === message.messageId;
    const isDeleted = message.type === 'deleted';
    const isMedia = message.type === 'image' || message.type === 'video';
    const [showOriginal, setShowOriginal] = useState(false);

    const containerRef = useRef(null);

    // Radii — connected bubble corners
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

    const swipeGesture = Gesture.Pan()
      .activeOffsetX([REPLY_SHOW_AT, Infinity])
      .failOffsetY([-15, 15])
      .onUpdate(e => {
        'worklet';
        swipeX.value = Math.max(0, Math.min(e.translationX, 85));
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
      transform: [{ translateX: withTiming(swipeX.value, { duration: 30 }) }],
    }));

    const arrowScale = useAnimatedStyle(() => ({
      opacity: withTiming(
        swipeX.value > REPLY_SHOW_AT
          ? Math.min((swipeX.value - REPLY_SHOW_AT) / 35, 1)
          : 0,
        { duration: 60 },
      ),
      transform: [
        { scale: withSpring(swipeX.value >= REPLY_TRIGGER ? 1.2 : 0.9) },
      ],
    }));

    // ── Long press — measure bubble position ──────────────────────────────
    const handleLongPress = useCallback(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        onLongPress?.(message, { x, y, width, height });
      });
    }, [message, onLongPress]);

    // ── Tap ───────────────────────────────────────────────────────────────
    const handlePress = useCallback(() => {
      if (isDeleted) return;
      onSelect?.(isSelected ? null : message.messageId);
    }, [isDeleted, message.messageId, isSelected, onSelect]);

    // ── Reaction tip press ────────────────────────────────────────────────
    const handleRxTipPress = useCallback(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        onRxTipPress?.(message, { x: x + (isOwn ? width : 0), y: y + height });
      });
    }, [message, isOwn, onRxTipPress]);

    const hasReactions = reactions && Object.keys(reactions).length > 0;

    return (
      <Animated.View
        layout={LinearTransition.springify().damping(18)}
        style={[
          s.row,
          isOwn ? s.rowOwn : s.rowOther,
          !first && s.rowGrouped,
          hasReactions && s.rowWithRx, // extra bottom margin for rx tip
        ]}
      >
        {/* Reply arrow */}
        {!isOwn && (
          <Animated.View style={[s.replyArrow, arrowScale]}>
            <Text style={s.replyArrowIco}>↩</Text>
          </Animated.View>
        )}

        {/* Avatar — received bubbles, last in group */}
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

        {/* Swipeable bubble area */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[s.col, isOwn && s.colOwn, swipeStyle]}>
            <Pressable
              ref={containerRef}
              onPress={handlePress}
              onLongPress={handleLongPress}
              delayLongPress={340}
              style={{ position: 'relative' }}
            >
              {/* Reply quote on top of bubble */}
              {message.replyTo && (
                <ReplyQuote
                  replyTo={message.replyTo}
                  isOwn={isOwn}
                  onPress={() =>
                    onPressReplyQuote?.(message.replyTo?.messageId)
                  }
                />
              )}

              {/* ── Bubble content ── */}
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
                  </View>
                </TouchableOpacity>
              ) : isOwn ? (
                <LinearGradient
                  colors={['#FF0059', '#FF5289']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.bbl, radius]}
                >
                  {/* Edited badge — top right, inside bubble */}
                  {message.isEdited && (
                    <TouchableOpacity
                      style={s.editedBadgeOwn}
                      onPress={() => setShowOriginal(p => !p)}
                      hitSlop={6}
                    >
                      <Text style={s.editedTxtOwn}>edited</Text>
                    </TouchableOpacity>
                  )}
                  {/* Original content on tap of badge */}
                  {showOriginal && message.originalContent && (
                    <Animated.View
                      layout={LinearTransition.springify()}
                      style={s.originalWrap}
                    >
                      <Text style={s.originalTxt}>
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
                      style={s.editedBadgeOther}
                      onPress={() => setShowOriginal(p => !p)}
                      hitSlop={6}
                    >
                      <Text style={s.editedTxtOther}>edited</Text>
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

              {/* Reaction tip — at bubble tip corner */}
              {hasReactions && (
                <RxTip
                  reactions={reactions}
                  isOwn={isOwn}
                  onPress={handleRxTipPress}
                />
              )}
            </Pressable>

            {/* Tap-to-show timestamp */}
            {isSelected && !isDeleted && (
              <Animated.View
                layout={LinearTransition.springify()}
                style={[s.timePill, isOwn && s.timePillOwn]}
              >
                <Text style={s.timeTxt}>{fmt(message.createdAt)}</Text>
              </Animated.View>
            )}

            {/* Last own message — always show timestamp + delivery */}
            {isOwn && isLastOwn && !isDeleted && !isSelected && (
              <Animated.View layout={LinearTransition.springify()}>
                <DeliveryStatus
                  status={message.status}
                  createdAt={message.createdAt}
                />
              </Animated.View>
            )}

            {/* Deleted message timestamp on tap */}
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
          </Animated.View>
        </GestureDetector>

        {/* Right arrow for own bubbles */}
        {isOwn && (
          <Animated.View style={[s.replyArrow, s.replyArrowOwn, arrowScale]}>
            <Text style={s.replyArrowIco}>↩</Text>
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
    overflow: 'visible',
  },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  rowGrouped: { marginBottom: 1 },
  rowWithRx: { marginBottom: 16 }, // space for reaction tip

  replyArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  replyArrowOwn: { marginRight: 0, marginLeft: 6 },
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

  // Edited badge — inside bubble, top-right
  editedBadgeOwn: {
    alignSelf: 'flex-end',
    marginBottom: 3,
  },
  editedTxtOwn: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  editedBadgeOther: {
    alignSelf: 'flex-end',
    marginBottom: 3,
  },
  editedTxtOther: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.35)',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  // Original content reveal
  originalWrap: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  originalTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  originalWrapOther: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  originalTxtOther: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },

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
  mediaImg: { width: MAX_W * 0.82, height: MAX_W * 0.82 * 1.12 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

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
});
