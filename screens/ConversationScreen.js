/**
 * ConversationScreen - Real-time Chat
 *
 * Features:
 * - Real-time messaging via Socket.io
 * - Image/Video sending via S3
 * - Typing indicator
 * - Read receipts
 * - Load more (pagination)
 * - Smooth keyboard handling
 */

import React, {
  useCallback,
  useContext,
  useEffect,
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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { AuthContext } from '../AuthContex';
import { useConversation } from '../src/hooks/useChatHook';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.72;

// ════════════════════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ════════════════════════════════════════════════════════════════════════════

const MessageBubble = React.memo(({ message, isOwn, showTime }) => {
  const isImage = message.type === 'image';
  const isVideo = message.type === 'video';

  return (
    <Animated.View
      entering={FadeInUp.duration(200).springify()}
      style={[
        styles.bubbleWrapper,
        isOwn ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther,
      ]}
    >
      {/* Image message */}
      {isImage && (
        <View
          style={[
            styles.mediaBubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          <Image
            source={{ uri: message.content }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Text message */}
      {!isImage && !isVideo && (
        <View
          style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
        >
          <Text
            style={[
              styles.bubbleText,
              isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther,
            ]}
          >
            {message.content}
          </Text>
        </View>
      )}

      {/* Time + Status */}
      {showTime && (
        <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
          <Text style={styles.timeText}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isOwn && (
            <Text style={styles.statusIcon}>
              {message.status === 'read' ? ' ✓✓' : ' ✓'}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ════════════════════════════════════════════════════════════════════════════

const TypingIndicator = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      dot1.value = withTiming(1, { duration: 300 }, () => {
        dot1.value = withTiming(0, { duration: 300 });
      });
      setTimeout(() => {
        dot2.value = withTiming(1, { duration: 300 }, () => {
          dot2.value = withTiming(0, { duration: 300 });
        });
      }, 150);
      setTimeout(() => {
        dot3.value = withTiming(1, { duration: 300 }, () => {
          dot3.value = withTiming(0, { duration: 300 });
        });
      }, 300);
    };

    animate();
    const interval = setInterval(animate, 900);
    return () => clearInterval(interval);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: 0.4 + dot1.value * 0.6,
    transform: [{ translateY: -dot1.value * 4 }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: 0.4 + dot2.value * 0.6,
    transform: [{ translateY: -dot2.value * 4 }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: 0.4 + dot3.value * 0.6,
    transform: [{ translateY: -dot3.value * 4 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.typingWrapper}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dot1Style]} />
        <Animated.View style={[styles.typingDot, dot2Style]} />
        <Animated.View style={[styles.typingDot, dot3Style]} />
      </View>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT BAR
// ════════════════════════════════════════════════════════════════════════════

const InputBar = ({ onSend, onMediaPick, emitTyping, sending }) => {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const sendBtnScale = useSharedValue(1);

  const sendBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendBtnScale.value }],
  }));

  const handleSend = useCallback(() => {
    if (!text.trim() || sending) return;
    sendBtnScale.value = withSpring(0.85, { duration: 100 }, () => {
      sendBtnScale.value = withSpring(1);
    });
    onSend(text.trim());
    setText('');
  }, [text, sending, onSend]);

  const handleChangeText = useCallback(
    val => {
      setText(val);
      emitTyping();
    },
    [emitTyping],
  );

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.inputBar}>
      {/* Media button */}
      <TouchableOpacity
        style={styles.mediaBtn}
        onPress={onMediaPick}
        activeOpacity={0.7}
      >
        <Text style={styles.mediaBtnIcon}>📎</Text>
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={handleChangeText}
        placeholder="Type a message..."
        placeholderTextColor="#94A3B8"
        multiline
        maxLength={1000}
        returnKeyType="default"
      />

      {/* Send button */}
      <Animated.View style={sendBtnStyle}>
        <TouchableOpacity
          style={[styles.sendBtn, !hasText && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!hasText || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnIcon}>↑</Text>
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
  const { matchId, targetUserId, name, image } = route.params;
  const { token, userId } = useContext(AuthContext);

  const flatListRef = useRef(null);

  const {
    messages,
    loading,
    sending,
    error,
    isTyping,
    hasMore,
    sendMessage,
    sendMedia,
    emitTyping,
    loadMore,
  } = useConversation({ token, matchId, userId });

  const reversedMessages = [...messages].reverse();

  // ── Auto scroll to bottom on new message ──

  // ── Handle media pick ──
  const handleMediaPick = useCallback(() => {
    launchImageLibrary(
      {
        mediaType: 'mixed',
        quality: 0.8,
        selectionLimit: 1,
      },
      async response => {
        if (response.didCancel || response.errorCode) return;

        const asset = response.assets?.[0];
        if (!asset) return;

        const fileType = asset.type || 'image/jpeg';
        const mediaType = asset.type?.startsWith('video') ? 'video' : 'image';

        await sendMedia(asset.uri, fileType, mediaType);
      },
    );
  }, [sendMedia]);

  // ── Render message ──
  const renderMessage = useCallback(
    ({ item, index }) => {
      const isOwn = item.senderId === userId;
      // ✅ inverted mein next message actually previous hai visually
      const prevMessage = reversedMessages[index - 1];
      const showTime = !prevMessage || prevMessage.senderId !== item.senderId;

      return (
        <MessageBubble
          key={item.messageId}
          message={item}
          isOwn={isOwn}
          showTime={showTime}
        />
      );
    },
    [reversedMessages, userId],
  );
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerProfile}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('UserProfile', {
                targetUserId,
                imageUrl: image,
              })
            }
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarFallback]}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
            )}
            <View>
              <Text style={styles.headerName}>{name}</Text>
              <Text style={styles.headerStatus}>
                {isTyping ? '✍️ typing...' : 'tap to view profile'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF0059" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversedMessages}
            inverted
            keyExtractor={item => item.messageId}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" // ✅ keyboard dismiss nahi hoga message tap pe
            keyboardDismissMode="interactive" // ✅ scroll karne pe keyboard smoothly jaata hai
            contentContainerStyle={styles.messagesList}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
            ListFooterComponent={
              hasMore ? (
                <ActivityIndicator
                  size="small"
                  color="#FF0059"
                  style={{ marginVertical: 12 }}
                />
              ) : null
            }
            ListEmptyComponent={
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <View style={styles.emptyChat}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.emptyChatImage}
                    />
                  ) : null}
                  <Text style={styles.emptyChatTitle}>
                    You matched with {name}! 🎉
                  </Text>
                  <Text style={styles.emptyChatSub}>
                    Send a message to start the conversation
                  </Text>
                </View>
              </View>
            }
          />
        )}

        {/* ── Input Bar ── */}
        <SafeAreaView edges={['bottom']} style={styles.inputWrapper}>
          <InputBar
            onSend={sendMessage}
            onMediaPick={handleMediaPick}
            emitTyping={emitTyping}
            sending={sending}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──
  headerWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: '#0F172A', marginTop: -1 },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerStatus: { fontSize: 12, color: '#94A3B8', marginTop: 1 },

  // ── Messages ──
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  bubbleWrapper: {
    marginBottom: 3,
    maxWidth: MAX_BUBBLE_WIDTH,
  },
  bubbleWrapperOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapperOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleOwn: {
    backgroundColor: '#FF0059',
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextOwn: { color: '#fff' },
  bubbleTextOther: { color: '#0F172A' },

  // ── Media bubble ──
  mediaBubble: { borderRadius: 16, overflow: 'hidden' },
  mediaImage: {
    width: MAX_BUBBLE_WIDTH * 0.85,
    height: MAX_BUBBLE_WIDTH * 0.85 * 1.1,
    borderRadius: 16,
  },

  // ── Time row ──
  timeRow: {
    flexDirection: 'row',
    marginTop: 3,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  timeRowOwn: { justifyContent: 'flex-end' },
  timeText: { fontSize: 10, color: '#94A3B8' },
  statusIcon: { fontSize: 10, color: '#94A3B8' },

  // ── Typing ──
  typingWrapper: { alignSelf: 'flex-start', marginBottom: 8, marginLeft: 16 },
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
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },

  // ── Input ──
  inputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    // ✅ Android pe shadow add karo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  mediaBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaBtnIcon: { fontSize: 18 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF0059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E2E8F0' },
  sendBtnIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginTop: -1,
  },

  // ── Empty ──
  emptyChat: {
    height: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyChatImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 20,
    backgroundColor: '#F1F5F9',
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyChatSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
});
