/**
 * ConversationScreen — Premium v2
 * In Flame Dating App
 *
 * Features:
 *  - Date separators (Today / Yesterday / Day / Full date)
 *  - Message grouping (consecutive same-sender = connected bubbles)
 *  - Long press sheet → React / Copy / Delete
 *  - Emoji reactions (❤️ 😂 😮 😢 😡 👍) with live counts
 *  - Scroll-to-bottom FAB with unread badge
 *  - Header: live online dot + last seen / typing status
 *  - Attachment sheet: Camera + Gallery
 *  - Media fullscreen preview
 *  - Delivered (✓✓ grey) / Read (✓✓ pink) status ticks
 *  - Subtle rose gradient background
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Vibration,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { AuthContext } from '../AuthContex';
import { useConversation } from '../src/hooks/useChatHook';
import { formatLastActive } from '../src/hooks/useOnlineStatus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_W = SCREEN_WIDTH * 0.72;
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const getDateKey = ts => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const formatDateLabel = ts => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const todayKey = getDateKey(now.toISOString());
  const yestKey = getDateKey(new Date(now - 86400000).toISOString());
  const key = getDateKey(ts);
  if (key === todayKey) return 'Today';
  if (key === yestKey) return 'Yesterday';
  if (now - d < 7 * 86400000)
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const fmt = ts =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

/**
 * Build display items:
 *  1. Insert date separators at each day boundary
 *  2. Tag each message with first/last group flags
 *  3. Reverse for inverted FlatList
 */
const buildItems = msgs => {
  if (!msgs?.length) return [];
  const items = [];
  let lastKey = null;

  msgs.forEach((msg, i) => {
    const key = getDateKey(msg.createdAt);
    if (key !== lastKey) {
      items.push({
        type: 'sep',
        id: `sep_${key}_${i}`,
        label: formatDateLabel(msg.createdAt),
      });
      lastKey = key;
    }

    const prev = msgs[i - 1];
    const next = msgs[i + 1];
    const prevKey = prev ? getDateKey(prev.createdAt) : null;
    const nextKey = next ? getDateKey(next.createdAt) : null;

    const sameAsPrev =
      prev &&
      prev.senderId === msg.senderId &&
      prevKey === key &&
      new Date(msg.createdAt) - new Date(prev.createdAt) < 120000;

    const sameAsNext =
      next &&
      next.senderId === msg.senderId &&
      nextKey === key &&
      new Date(next.createdAt) - new Date(msg.createdAt) < 120000;

    items.push({ type: 'msg', ...msg, first: !sameAsPrev, last: !sameAsNext });
  });

  return items.reverse(); // newest first for inverted list
};

// ════════════════════════════════════════════════════════════════════════════
// DATE SEPARATOR
// ════════════════════════════════════════════════════════════════════════════

const DateSep = ({ label }) => (
  <View style={s.dateSep}>
    <View style={s.dateSepLine} />
    <View style={s.dateSepPill}>
      <Text style={s.dateSepText}>{label}</Text>
    </View>
    <View style={s.dateSepLine} />
  </View>
);

// ════════════════════════════════════════════════════════════════════════════
// REACTION STRIP
// ════════════════════════════════════════════════════════════════════════════

const RxStrip = ({ reactions, isOwn, myUserId, onPress }) => {
  if (!reactions || !Object.keys(reactions).length) return null;
  const grouped = {};
  Object.entries(reactions).forEach(([uid, emoji]) => {
    grouped[emoji] = grouped[emoji] ? [...grouped[emoji], uid] : [uid];
  });
  return (
    <TouchableOpacity
      style={[s.rxStrip, isOwn ? s.rxStripOwn : s.rxStripOther]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {Object.entries(grouped).map(([emoji, users]) => (
        <View
          key={emoji}
          style={[s.rxChip, users.includes(myUserId) && s.rxChipMine]}
        >
          <Text style={s.rxEmoji}>{emoji}</Text>
          {users.length > 1 && <Text style={s.rxCount}>{users.length}</Text>}
        </View>
      ))}
    </TouchableOpacity>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ════════════════════════════════════════════════════════════════════════════

const Bubble = React.memo(
  ({
    message,
    isOwn,
    first,
    last,
    reactions,
    myUserId,
    otherImage,
    onLongPress,
    onRxPress,
    onMediaPress,
  }) => {
    const isMedia = message.type === 'image' || message.type === 'video';
    const R = 20,
      r = 5;

    // Rounded corners: inner corners of consecutive bubbles are small
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

    const tick = () => {
      if (!isOwn) return null;
      const { status } = message;
      if (status === 'read')
        return <Text style={[s.tick, { color: '#FF0059' }]}>✓✓</Text>;
      if (status === 'delivered')
        return <Text style={[s.tick, { color: '#64748B' }]}>✓✓</Text>;
      return <Text style={[s.tick, { color: '#CBD5E1' }]}>✓</Text>;
    };

    return (
      <Animated.View
        entering={FadeInUp.duration(220).springify()}
        style={[s.row, isOwn ? s.rowOwn : s.rowOther, !first && s.rowGrouped]}
      >
        {/* Avatar slot — only other user, only on last in group */}
        {!isOwn && (
          <View style={s.avtSlot}>
            {last &&
              (otherImage ? (
                <Image source={{ uri: otherImage }} style={s.avt} />
              ) : (
                <View style={[s.avt, s.avtFallback]}>
                  <Text style={{ fontSize: 11 }}>👤</Text>
                </View>
              ))}
          </View>
        )}

        <View style={[s.col, isOwn && s.colOwn]}>
          <Pressable
            onLongPress={() => onLongPress(message)}
            delayLongPress={300}
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

          <RxStrip
            reactions={reactions}
            isOwn={isOwn}
            myUserId={myUserId}
            onPress={() => onRxPress(message)}
          />

          {/* Time + tick — only last in group */}
          {last && (
            <View style={[s.meta, isOwn && s.metaOwn]}>
              <Text style={s.timeText}>{fmt(message.createdAt)}</Text>
              {tick()}
            </View>
          )}
        </View>
      </Animated.View>
    );
  },
);

// ════════════════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ════════════════════════════════════════════════════════════════════════════

const TypingDots = () => {
  const d1 = useSharedValue(0),
    d2 = useSharedValue(0),
    d3 = useSharedValue(0);

  useEffect(() => {
    const anim = (sv, delay) => {
      const run = () => {
        sv.value = withTiming(1, { duration: 300 }, () => {
          sv.value = withTiming(0, { duration: 300 });
        });
      };
      const t = setInterval(run, 900);
      setTimeout(run, delay);
      return t;
    };
    const t1 = anim(d1, 0),
      t2 = anim(d2, 150),
      t3 = anim(d3, 300);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, []);

  const a1 = useAnimatedStyle(() => ({
    opacity: 0.4 + d1.value * 0.6,
    transform: [{ translateY: -d1.value * 4 }],
  }));
  const a2 = useAnimatedStyle(() => ({
    opacity: 0.4 + d2.value * 0.6,
    transform: [{ translateY: -d2.value * 4 }],
  }));
  const a3 = useAnimatedStyle(() => ({
    opacity: 0.4 + d3.value * 0.6,
    transform: [{ translateY: -d3.value * 4 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.typingWrap}>
      <View style={s.typingBubble}>
        <Animated.View style={[s.dot, a1]} />
        <Animated.View style={[s.dot, a2]} />
        <Animated.View style={[s.dot, a3]} />
      </View>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// LONG PRESS SHEET
// ════════════════════════════════════════════════════════════════════════════

const LPSheet = ({
  visible,
  message,
  isOwn,
  onClose,
  onCopy,
  onReact,
  onDelete,
}) => {
  if (!visible || !message) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={s.sheetBg}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          entering={SlideInUp.duration(260).springify()}
          style={s.sheet}
        >
          {/* Reaction row */}
          <View style={s.sheetRxRow}>
            {REACTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={s.sheetRxBtn}
                onPress={() => {
                  onReact(e);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={s.sheetRxEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.sheetDiv} />
          {message.type !== 'image' && message.type !== 'video' && (
            <TouchableOpacity
              style={s.sheetRow}
              onPress={() => {
                onCopy();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={s.sheetRowIco}>📋</Text>
              <Text style={s.sheetRowTxt}>Copy</Text>
            </TouchableOpacity>
          )}
          {isOwn && (
            <TouchableOpacity
              style={s.sheetRow}
              onPress={() => {
                onDelete();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={s.sheetRowIco}>🗑️</Text>
              <Text style={[s.sheetRowTxt, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.sheetRow, { justifyContent: 'center', marginTop: 4 }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[s.sheetRowTxt, { color: '#94A3B8' }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ATTACHMENT SHEET
// ════════════════════════════════════════════════════════════════════════════

const AttachSheet = ({ visible, onClose, onCamera, onGallery }) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={s.sheetBg}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          entering={SlideInUp.duration(260).springify()}
          style={[s.sheet, { paddingBottom: 32 }]}
        >
          <View style={s.attachRow}>
            <TouchableOpacity
              style={s.attachOpt}
              onPress={onCamera}
              activeOpacity={0.8}
            >
              <View style={[s.attachIco, { backgroundColor: '#FFF0F5' }]}>
                <Text style={{ fontSize: 30 }}>📷</Text>
              </View>
              <Text style={s.attachLbl}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.attachOpt}
              onPress={onGallery}
              activeOpacity={0.8}
            >
              <View style={[s.attachIco, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 30 }}>🖼️</Text>
              </View>
              <Text style={s.attachLbl}>Gallery</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={s.attachCancel}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={s.attachCancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MEDIA PREVIEW
// ════════════════════════════════════════════════════════════════════════════

const MediaPreview = ({ uri, onClose }) => (
  <Modal
    visible={!!uri}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <View style={s.previewBg}>
      <SafeAreaView style={s.previewHeader}>
        <TouchableOpacity style={s.previewClose} onPress={onClose}>
          <Text style={s.previewCloseIco}>✕</Text>
        </TouchableOpacity>
      </SafeAreaView>
      {uri && (
        <Image source={{ uri }} style={s.previewImg} resizeMode="contain" />
      )}
    </View>
  </Modal>
);

// ════════════════════════════════════════════════════════════════════════════
// SCROLL TO BOTTOM FAB
// ════════════════════════════════════════════════════════════════════════════

const ScrollFAB = ({ visible, onPress, unread }) => {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={s.fab}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient colors={['#FF0059', '#FF5289']} style={s.fabGrad}>
          {unread > 0 && (
            <View style={s.fabBadge}>
              <Text style={s.fabBadgeTxt}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
          <Text style={s.fabIco}>↓</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT BAR
// ════════════════════════════════════════════════════════════════════════════

const InputBar = ({ onSend, onAttach, emitTyping, sending }) => {
  const [text, setText] = useState('');
  const scale = useSharedValue(1);
  const sendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const has = text.trim().length > 0;

  const send = useCallback(() => {
    if (!has || sending) return;
    scale.value = withSpring(0.85, { duration: 100 }, () => {
      scale.value = withSpring(1);
    });
    onSend(text.trim());
    setText('');
  }, [text, sending, onSend, has]);

  return (
    <View style={s.inputBar}>
      <TouchableOpacity style={s.attBtn} onPress={onAttach} activeOpacity={0.7}>
        <Text style={s.attBtnIco}>＋</Text>
      </TouchableOpacity>
      <TextInput
        style={s.inputField}
        value={text}
        onChangeText={t => {
          setText(t);
          emitTyping();
        }}
        placeholder="Type a message..."
        placeholderTextColor="#94A3B8"
        multiline
        maxLength={1000}
      />
      <Animated.View style={sendStyle}>
        <TouchableOpacity
          style={[s.sendBtn, !has && s.sendBtnOff]}
          onPress={send}
          disabled={!has || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.sendIco}>↑</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

export default function ConversationScreen({ navigation, route }) {
  const {
    matchId,
    targetUserId,
    name,
    image,
    isOnline: initOnline,
    lastActiveAt: initLastActive,
  } = route.params;
  const { token, userId } = useContext(AuthContext);
  const flatRef = useRef(null);

  const {
    messages,
    loading,
    sending,
    isTyping,
    hasMore,
    sendMessage,
    sendMedia,
    emitTyping,
    loadMore,
    reactToMessage,
    reactionsMap,
  } = useConversation({ token, matchId, userId });

  const [isOnline] = useState(initOnline ?? false);
  const [lastActiveAt] = useState(initLastActive ?? null);
  const [selMsg, setSelMsg] = useState(null);
  const [showLP, setShowLP] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadScrolled, setUnreadScrolled] = useState(0);
  const prevLen = useRef(0);

  // Count new messages while user is scrolled up
  useEffect(() => {
    const diff = messages.length - prevLen.current;
    if (diff > 0 && !atBottom) setUnreadScrolled(p => p + diff);
    prevLen.current = messages.length;
  }, [messages.length, atBottom]);

  const displayItems = useMemo(() => buildItems(messages), [messages]);

  const scrollToBottom = useCallback(() => {
    flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    setAtBottom(true);
    setUnreadScrolled(0);
  }, []);

  const onScroll = useCallback(e => {
    const y = e.nativeEvent.contentOffset.y;
    setAtBottom(y < 80);
    if (y < 80) setUnreadScrolled(0);
  }, []);

  const onLongPress = useCallback(msg => {
    Vibration.vibrate(25);
    setSelMsg(msg);
    setShowLP(true);
  }, []);

  const onCopy = useCallback(() => {
    if (selMsg?.content) {
      // Install @react-native-clipboard/clipboard if Clipboard import fails
      try {
        require('@react-native-clipboard/clipboard').default.setString(
          selMsg.content,
        );
      } catch {
        console.log('[Copy] install @react-native-clipboard/clipboard');
      }
    }
  }, [selMsg]);

  const onReact = useCallback(
    async emoji => {
      if (!selMsg) return;
      await reactToMessage(selMsg.messageId, matchId, emoji);
    },
    [selMsg, matchId, reactToMessage],
  );

  const onMediaPick = useCallback(
    async type => {
      setShowAttach(false);
      const fn = type === 'camera' ? launchCamera : launchImageLibrary;
      fn({ mediaType: 'mixed', quality: 0.8, selectionLimit: 1 }, async res => {
        if (res.didCancel || res.errorCode) return;
        const a = res.assets?.[0];
        if (!a) return;
        await sendMedia(
          a.uri,
          a.type || 'image/jpeg',
          a.type?.startsWith('video') ? 'video' : 'image',
        );
      });
    },
    [sendMedia],
  );

  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === 'sep') return <DateSep label={item.label} />;
      const isOwn = item.senderId === userId;
      return (
        <Bubble
          message={item}
          isOwn={isOwn}
          first={item.first}
          last={item.last}
          reactions={reactionsMap?.[item.messageId]}
          myUserId={userId}
          otherImage={image}
          onLongPress={onLongPress}
          onRxPress={msg => {
            setSelMsg(msg);
            setShowLP(true);
          }}
          onMediaPress={uri => setPreviewUri(uri)}
        />
      );
    },
    [userId, image, onLongPress, reactionsMap],
  );

  const headerSub = isTyping
    ? '✍️ typing...'
    : isOnline
    ? '🟢 Online'
    : lastActiveAt
    ? formatLastActive(lastActiveAt)
    : '';

  return (
    <View style={s.container}>
      {/* Subtle background */}
      <LinearGradient
        colors={['#FFF5F7', '#FFFBFC', '#FFF5F7']}
        style={StyleSheet.absoluteFillObject}
      />

      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            activeOpacity={0.7}
          >
            <Text style={s.backIco}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.headerCenter}
            onPress={() =>
              navigation.navigate('UserProfile', {
                targetUserId,
                imageUrl: image,
              })
            }
            activeOpacity={0.85}
          >
            <View style={s.hAvtWrap}>
              {image ? (
                <Image source={{ uri: image }} style={s.hAvt} />
              ) : (
                <View style={[s.hAvt, s.hAvtFb]}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
              )}
              <View
                style={[
                  s.hDot,
                  { backgroundColor: isOnline ? '#22C55E' : '#CBD5E1' },
                ]}
              />
            </View>
            <View style={s.hInfo}>
              <Text style={s.hName} numberOfLines={1}>
                {name}
              </Text>
              {!!headerSub && (
                <Text
                  style={[s.hSub, isOnline && !isTyping && s.hSubOnline]}
                  numberOfLines={1}
                >
                  {headerSub}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.moreBtn} activeOpacity={0.7}>
            <Text style={s.moreBtnIco}>⋮</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading && !messages.length ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color="#FF0059" />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={displayItems}
            inverted
            keyExtractor={item =>
              item.type === 'sep' ? item.id : item.messageId
            }
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={s.msgList}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={isTyping ? <TypingDots /> : null}
            ListFooterComponent={
              hasMore ? (
                <ActivityIndicator
                  size="small"
                  color="#FF0059"
                  style={{ margin: 12 }}
                />
              ) : null
            }
            ListEmptyComponent={
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <View style={s.emptyWrap}>
                  {image && (
                    <Image source={{ uri: image }} style={s.emptyAvt} />
                  )}
                  <Text style={s.emptyTitle}>You matched with {name}! 🎉</Text>
                  <Text style={s.emptySub}>Be the first to say hi 👋</Text>
                </View>
              </View>
            }
          />
        )}

        <ScrollFAB
          visible={!atBottom}
          onPress={scrollToBottom}
          unread={unreadScrolled}
        />

        <SafeAreaView edges={['bottom']} style={s.inputWrap}>
          <InputBar
            onSend={sendMessage}
            onAttach={() => setShowAttach(true)}
            emitTyping={emitTyping}
            sending={sending}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* ── Sheets & Modals ── */}
      <LPSheet
        visible={showLP}
        message={selMsg}
        isOwn={selMsg?.senderId === userId}
        onClose={() => {
          setShowLP(false);
          setSelMsg(null);
        }}
        onCopy={onCopy}
        onReact={onReact}
        onDelete={() => {
          /* TODO */
        }}
      />

      <AttachSheet
        visible={showAttach}
        onClose={() => setShowAttach(false)}
        onCamera={() => onMediaPick('camera')}
        onGallery={() => onMediaPick('gallery')}
      />

      <MediaPreview uri={previewUri} onClose={() => setPreviewUri(null)} />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerSafe: {
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIco: { fontSize: 18, color: '#0F172A' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hAvtWrap: { position: 'relative' },
  hAvt: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9' },
  hAvtFb: { justifyContent: 'center', alignItems: 'center' },
  hDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hInfo: { flex: 1 },
  hName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  hSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  hSubOnline: { color: '#22C55E' },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtnIco: { fontSize: 20, color: '#64748B', lineHeight: 22 },

  // Messages
  msgList: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },

  // Bubble row
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
  avtFallback: { justifyContent: 'center', alignItems: 'center' },
  col: { maxWidth: MAX_W, alignItems: 'flex-start' },
  colOwn: { alignItems: 'flex-end' },

  // Bubbles
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

  // Media
  mediaBubble: { overflow: 'hidden' },
  mediaBubbleOther: { borderWidth: 1, borderColor: '#F1F5F9' },
  mediaImg: { width: MAX_W * 0.82, height: MAX_W * 0.82 * 1.15 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  // Meta
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  metaOwn: { justifyContent: 'flex-end' },
  timeText: { fontSize: 10, color: '#94A3B8' },
  tick: { fontSize: 10, fontWeight: '700' },

  // Reactions
  rxStrip: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  rxStripOwn: { justifyContent: 'flex-end' },
  rxStripOther: { justifyContent: 'flex-start' },
  rxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  rxChipMine: {
    backgroundColor: 'rgba(255,0,89,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,89,0.2)',
  },
  rxEmoji: { fontSize: 13 },
  rxCount: { fontSize: 10, color: '#64748B', fontWeight: '600' },

  // Date separator
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 16,
  },
  dateSepLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  dateSepPill: {
    marginHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dateSepText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },

  // Typing
  typingWrap: { alignSelf: 'flex-start', marginLeft: 38, marginBottom: 8 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94A3B8' },

  // Long press + attach sheet
  sheetBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetRxRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
  },
  sheetRxBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetRxEmoji: { fontSize: 26 },
  sheetDiv: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
  },
  sheetRowIco: { fontSize: 20 },
  sheetRowTxt: { fontSize: 16, fontWeight: '500', color: '#0F172A' },

  // Attach
  attachRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  attachOpt: { alignItems: 'center', gap: 10 },
  attachIco: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachLbl: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  attachCancel: {
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
  },
  attachCancelTxt: { fontSize: 15, fontWeight: '600', color: '#64748B' },

  // Media preview
  previewBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  previewClose: {
    margin: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  previewCloseIco: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewImg: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3 },

  // FAB
  fab: { position: 'absolute', bottom: 84, right: 16, zIndex: 50 },
  fabGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF0059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIco: { color: '#fff', fontSize: 18, fontWeight: '700' },
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fabBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Input
  inputWrap: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 5,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  attBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attBtnIco: { fontSize: 22, color: '#64748B', lineHeight: 24 },
  inputField: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnOff: { backgroundColor: '#E2E8F0' },
  sendIco: { fontSize: 16, color: '#fff', fontWeight: '700', marginTop: -1 },

  // Empty
  emptyWrap: {
    height: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyAvt: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 20,
    backgroundColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
});
