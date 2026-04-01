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
import { AuthContext } from '../AuthContex';
import { useConversation } from '../src/hooks/useChatHook';
import { formatLastActive } from '../src/hooks/useOnlineStatus';

// ── Conversation Components ──
import { DateSeparator } from '../src/components/conversation/DateSeparator';
import { MessageBubble } from '../src/components/conversation/MessageBubble';
import { TypingIndicator } from '../src/components/conversation/TypingIndicator';
import { LongPressSheet } from '../src/components/conversation/LongPressSheet';
import { AttachmentSheet } from '../src/components/conversation/AttachmentSheet';
import { MediaPreviewModal } from '../src/components/conversation/MediaPreviewModal';
import { ScrollFAB } from '../src/components/conversation/ScrollFAB';
import { InputBar } from '../src/components/conversation/InputBar';

import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

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

  return items.reverse();
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

  // ── UI state ──
  const [selectedMsgId, setSelectedMsgId] = useState(null); // tap-to-time
  const [selMsg, setSelMsg] = useState(null);
  const [showLP, setShowLP] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadScrolled, setUnreadScrolled] = useState(0);
  const prevLen = useRef(0);

  // Track new msgs while scrolled up
  useEffect(() => {
    const diff = messages.length - prevLen.current;
    if (diff > 0 && !atBottom) setUnreadScrolled(p => p + diff);
    prevLen.current = messages.length;
  }, [messages.length, atBottom]);

  const displayItems = useMemo(() => buildItems(messages), [messages]);

  // Last own message ID — for delivery status
  const lastOwnMsgId = useMemo(() => {
    const own = displayItems.find(
      item => item.type === 'msg' && item.senderId === userId,
    );
    return own?.messageId;
  }, [displayItems, userId]);

  // ── Callbacks ──
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
    setSelMsg(msg);
    setShowLP(true);
  }, []);

  const onCopy = useCallback(() => {
    if (!selMsg?.content) return;
    try {
      require('@react-native-clipboard/clipboard').default.setString(
        selMsg.content,
      );
    } catch {
      console.log('[Copy] install @react-native-clipboard/clipboard');
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
      if (item.type === 'sep') return <DateSeparator label={item.label} />;
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
          onRxPress={msg => {
            setSelMsg(msg);
            setShowLP(true);
          }}
          onMediaPress={uri => setPreviewUri(uri)}
        />
      );
    },
    [userId, image, onLongPress, reactionsMap, lastOwnMsgId, selectedMsgId],
  );

  // ── Header status ──
  const headerStatus = isTyping
    ? { text: '✍️ typing...', color: '#FF0059' }
    : initOnline
    ? { text: 'Online', color: '#22C55E' }
    : {
        text: initLastActive ? formatLastActive(initLastActive) : '',
        color: '#94A3B8',
      };

  return (
    <View style={s.container}>
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
              {/* Online dot */}
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
            // Typing indicator — below last message (inverted = bottom)
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
            onSend={sendMessage}
            onAttach={() => setShowAttach(true)}
            emitTyping={emitTyping}
            sending={sending}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* ── Modals ── */}
      <LongPressSheet
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
          /* TODO phase 3 */
        }}
      />

      <AttachmentSheet
        visible={showAttach}
        onClose={() => setShowAttach(false)}
        onCamera={() => onMediaPick('camera')}
        onGallery={() => onMediaPick('gallery')}
      />

      <MediaPreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

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
  hStatus: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtnIco: { fontSize: 20, color: '#64748B', lineHeight: 22 },

  msgList: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },

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
