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
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthContext } from '../AuthContex';
import { useConversation } from '../src/hooks/useChatHook';
import { formatLastActive } from '../src/hooks/useOnlineStatus';

import { DateSeparator } from '../src/components/conversation/DateSeparator';
import { MessageBubble } from '../src/components/conversation/MessageBubble';
import { TypingIndicator } from '../src/components/conversation/TypingIndicator';
import { FloatingContextMenu } from '../src/components/conversation/FloatingContextMenu';
import { ReactionTooltip } from '../src/components/conversation/ReactionTooltip';
import { AttachmentSheet } from '../src/components/conversation/AttachmentSheet';
import { MediaPreviewModal } from '../src/components/conversation/MediaPreviewModal';
import { ScrollFAB } from '../src/components/conversation/ScrollFAB';
import { InputBar } from '../src/components/conversation/InputBar';
import Config from 'react-native-config';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';
const getDateKey = ts => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const formatDateLabel = ts => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const key = getDateKey(ts);
  if (key === getDateKey(now.toISOString())) return 'Today';
  if (key === getDateKey(new Date(now - 86400000).toISOString()))
    return 'Yesterday';
  if (now - d < 7 * 86400000)
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

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
  return items.reverse(); // newest first (inverted FlatList)
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
    isOnline: initOnline = false,
    lastActiveAt: initLastActive = null,
  } = route.params;

  const { token, userId, userImage: myImage } = useContext(AuthContext);
  const flatRef = useRef(null);
  const prevMsgLen = useRef(0);

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
    deleteMessage,
    editMessage,
  } = useConversation({ token, matchId, userId });

  // ── UI state ──────────────────────────────────────────────────────────
  const [selectedMsgId, setSelectedMsgId] = useState(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState({
    visible: false,
    msg: null,
    bubbleLayout: null,
  });

  // Reaction tooltip
  const [rxTooltip, setRxTooltip] = useState({
    visible: false,
    msg: null,
    anchor: { x: 0, y: 0 },
  });

  // Reply
  const [replyingTo, setReplyingTo] = useState(null);

  // Edit
  const [editingMsg, setEditingMsg] = useState(null);

  // Media
  const [showAttach, setShowAttach] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);

  // Scroll
  const [atBottom, setAtBottom] = useState(true);
  const [unreadScrolled, setUnreadScrolled] = useState(0);
  const prevLen = useRef(0);

  // ── Track unread while scrolled up ───────────────────────────────────
  useEffect(() => {
    const diff = messages.length - prevLen.current;
    if (diff > 0 && !atBottom) setUnreadScrolled(p => p + diff);
    prevLen.current = messages.length;
  }, [messages.length, atBottom]);

  // ── Build display items ───────────────────────────────────────────────
  const displayItems = useMemo(() => buildItems(messages), [messages]);

  // Last own message — delivery status + always-visible timestamp
  const lastOwnMsgId = useMemo(() => {
    const own = displayItems.find(
      item => item.type === 'msg' && item.senderId === userId,
    );
    return own?.messageId;
  }, [displayItems, userId]);

  useEffect(() => {
    const newMsgs = messages.slice(
      0,
      Math.max(0, messages.length - prevMsgLen.current),
    );
    const newReceived = newMsgs.filter(
      m => m.senderId !== userId && !m.isTemp && m.status !== 'failed',
    );
    if (newReceived.length > 0 && !atBottom) {
      setUnreadScrolled(p => p + newReceived.length);
    }
    prevMsgLen.current = messages.length;
  }, [messages.length]);

  // User profiles map — for reaction tooltip
  // We have otherUser's image from route.params
  const userProfiles = useMemo(
    () => ({
      [targetUserId]: { name, image },
      [userId]: { name: 'You', image: myImage || null },
    }),
    [targetUserId, name, image, userId, myImage],
  );

  // When user scrolls back to bottom — reset unread + mark read
  const scrollToBottom = useCallback(() => {
    flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    setAtBottom(true);
    setUnreadScrolled(0);
    // Mark all as read now that user has seen them
    fetch(`${API}/messages/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ matchId }),
    }).catch(() => {});
  }, [token, matchId]);

  const onScroll = useCallback(e => {
    const y = e.nativeEvent.contentOffset.y;
    const nowAtBottom = y < 80;
    setAtBottom(nowAtBottom);
    if (nowAtBottom) {
      setUnreadScrolled(0);
    }
  }, []);

  // ── Scroll to replied message ─────────────────────────────────────────
  const scrollToMessage = useCallback(
    messageId => {
      const idx = displayItems.findIndex(
        item => item.type === 'msg' && item.messageId === messageId,
      );
      if (idx < 0) return;
      try {
        flatRef.current?.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (e) {
        // Fallback: scroll to end if index not rendered
        flatRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    },
    [displayItems],
  );

  // ── Long press → context menu ─────────────────────────────────────────
  const onLongPress = useCallback((msg, bubbleLayout) => {
    setCtxMenu({ visible: true, msg, bubbleLayout });
  }, []);

  // ── Context menu actions ──────────────────────────────────────────────
  const onCtxReact = useCallback(
    async emoji => {
      if (!ctxMenu.msg) return;
      await reactToMessage(ctxMenu.msg.messageId, matchId, emoji);
    },
    [ctxMenu.msg, matchId, reactToMessage],
  );

  const onCtxReply = useCallback(() => {
    if (!ctxMenu.msg) return;
    setReplyingTo({
      messageId: ctxMenu.msg.messageId,
      senderId: ctxMenu.msg.senderId,
      content: ctxMenu.msg.content,
      type: ctxMenu.msg.type,
      senderName: ctxMenu.msg.senderId === userId ? 'You' : name,
    });
  }, [ctxMenu.msg, userId, name]);

  const onCtxCopy = useCallback(() => {
    if (!ctxMenu.msg?.content) return;
    try {
      require('@react-native-clipboard/clipboard').default.setString(
        ctxMenu.msg.content,
      );
    } catch {
      console.log('[Copy] install @react-native-clipboard/clipboard');
    }
  }, [ctxMenu.msg]);

  const onCtxEdit = useCallback(() => {
    if (!ctxMenu.msg) return;
    setEditingMsg(ctxMenu.msg);
  }, [ctxMenu.msg]);

  const onCtxDelete = useCallback(async () => {
    if (!ctxMenu.msg) return;
    await deleteMessage(ctxMenu.msg.messageId);
  }, [ctxMenu.msg, deleteMessage]);

  // ── Reaction tip press → tooltip ──────────────────────────────────────
  const onRxTipPress = useCallback((msg, anchor) => {
    setRxTooltip({ visible: true, msg, anchor });
  }, []);

  const onRemoveMyReaction = useCallback(async () => {
    if (!rxTooltip.msg) return;
    // Toggle with null emoji = remove
    await reactToMessage(rxTooltip.msg.messageId, matchId, null);
  }, [rxTooltip.msg, matchId, reactToMessage]);

  // ── Swipe reply ───────────────────────────────────────────────────────
  const onSwipeReply = useCallback(
    msg => {
      setReplyingTo({
        messageId: msg.messageId,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type,
        senderName: msg.senderId === userId ? 'You' : name,
      });
    },
    [userId, name],
  );

  // ── Send with reply ───────────────────────────────────────────────────
  const handleSend = useCallback(
    async (content, replyTo) => {
      await sendMessage(content, replyTo);
    },
    [sendMessage],
  );

  // ── Edit save ─────────────────────────────────────────────────────────
  const handleEditSave = useCallback(
    async (messageId, content) => {
      await editMessage(messageId, content);
      setEditingMsg(null);
    },
    [editMessage],
  );

  // ── Media ─────────────────────────────────────────────────────────────
  const handleMediaSelected = useCallback(
    async (uri, fileType, mediaType) => {
      await sendMedia(uri, fileType, mediaType);
    },
    [sendMedia],
  );

  // ── Render item ───────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === 'sep') {
        return (
          <Animated.View layout={LinearTransition.springify().damping(18)}>
            <DateSeparator label={item.label} />
          </Animated.View>
        );
      }
      const isOwn = item.senderId === userId;
      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          first={item.first}
          last={item.last}
          reactions={reactionsMap?.[item.messageId]}
          myUserId={userId}
          otherImage={image}
          isLastOwn={item.messageId === lastOwnMsgId}
          selectedMsgId={selectedMsgId}
          onSelect={setSelectedMsgId}
          onLongPress={onLongPress}
          onRxTipPress={onRxTipPress}
          onMediaPress={uri => setPreviewUri(uri)}
          onSwipeReply={onSwipeReply}
          onPressReplyQuote={scrollToMessage}
          onAvatarPress={() =>
            navigation.navigate('UserProfile', {
              targetUserId,
              imageUrl: image,
            })
          }
        />
      );
    },
    [
      userId,
      image,
      onLongPress,
      reactionsMap,
      lastOwnMsgId,
      selectedMsgId,
      onSwipeReply,
      scrollToMessage,
      onRxTipPress,
      targetUserId,
      navigation,
    ],
  );

  // ── Header status ─────────────────────────────────────────────────────
  const headerStatus = isTyping
    ? { text: '✍️ typing...', color: '#FF0059' }
    : initOnline
    ? { text: 'Online', color: '#22C55E' }
    : {
        text: initLastActive ? formatLastActive(initLastActive) : '',
        color: '#94A3B8',
      };

  // ── FlatList onScrollToIndexFailed ────────────────────────────────────
  const onScrollToIndexFailed = useCallback(({ highestMeasuredFrameIndex }) => {
    flatRef.current?.scrollToIndex({
      index: highestMeasuredFrameIndex,
      animated: true,
    });
  }, []);

  return (
    <GestureHandlerRootView style={s.container}>
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
                  <Text>👤</Text>
                </View>
              )}
              <View
                style={[
                  s.hDot,
                  { backgroundColor: initOnline ? '#22C55E' : '#CBD5E1' },
                ]}
              />
            </View>
            <View style={s.hInfo}>
              <Text style={s.hName} numberOfLines={1}>
                {name}
              </Text>
              {!!headerStatus.text && (
                <Text
                  style={[s.hStatus, { color: headerStatus.color }]}
                  numberOfLines={1}
                >
                  {headerStatus.text}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.moreBtn} activeOpacity={0.7}>
            <Text style={s.moreIco}>⋮</Text>
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
            onScrollToIndexFailed={onScrollToIndexFailed}
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
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
            onSend={handleSend}
            onAttach={() => setShowAttach(true)}
            emitTyping={emitTyping}
            sending={sending}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            myUserId={userId}
            editingMsg={editingMsg}
            onCancelEdit={() => setEditingMsg(null)}
            onEditSave={handleEditSave}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* ── iMessage Context Menu ── */}
      <FloatingContextMenu
        visible={ctxMenu.visible}
        message={ctxMenu.msg}
        isOwn={ctxMenu.msg?.senderId === userId}
        bubbleLayout={ctxMenu.bubbleLayout}
        onClose={() =>
          setCtxMenu(p => ({ ...p, visible: false, bubbleLayout: null }))
        }
        onReact={onCtxReact}
        onReply={onCtxReply}
        onCopy={onCtxCopy}
        onEdit={onCtxEdit}
        onDelete={onCtxDelete}
      />

      {/* ── Reaction Tooltip ── */}
      <ReactionTooltip
        visible={rxTooltip.visible}
        reactions={
          rxTooltip.msg ? reactionsMap?.[rxTooltip.msg.messageId] : null
        }
        myUserId={userId}
        userProfiles={userProfiles}
        anchorX={rxTooltip.anchor.x}
        anchorY={rxTooltip.anchor.y}
        onClose={() => setRxTooltip(p => ({ ...p, visible: false }))}
        onRemoveMyReaction={onRemoveMyReaction}
      />

      {/* ── Attachment Sheet ── */}
      <AttachmentSheet
        visible={showAttach}
        onClose={() => setShowAttach(false)}
        onMediaSelected={handleMediaSelected}
      />

      {/* ── Media Preview ── */}
      <MediaPreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  hAvt: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9' },
  hAvtFb: { justifyContent: 'center', alignItems: 'center' },
  hDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hInfo: { flex: 1 },
  hName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  hStatus: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIco: { fontSize: 20, color: '#64748B', lineHeight: 22 },

  msgList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
    paddingBottom: 16,
  },

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

  emptyWrap: {
    height: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyAvt: { width: 90, height: 90, borderRadius: 45, marginBottom: 20 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
});
