import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { AppState } from 'react-native';
import Config from 'react-native-config';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const createApiClient = token =>
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

let socketInstance = null;
const getSocket = token => {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

// ── Cache helpers ─────────────────────────────────────────────────────────
const CACHE_PREFIX = 'flame_msgs_';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const getCacheKey = matchId => `${CACHE_PREFIX}${matchId}`;

const readCache = async matchId => {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(matchId));
    if (!raw) return null;
    const { messages, timestamp, reactionsMap } = JSON.parse(raw);
    // TTL check
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return { messages, reactionsMap };
  } catch {
    return null;
  }
};

const writeCache = async (matchId, messages, reactionsMap) => {
  try {
    const toCache = messages.slice(-60);
    await AsyncStorage.setItem(
      getCacheKey(matchId),
      JSON.stringify({
        messages: toCache,
        reactionsMap,
        timestamp: Date.now(),
      }),
    );
    console.log('[CACHE] 💾 Written —', toCache.length, 'messages cached');
  } catch (e) {
    console.log('[CACHE] Write failed:', e.message);
  }
};
const clearCache = async matchId => {
  try {
    await AsyncStorage.removeItem(getCacheKey(matchId));
    console.log('[CACHE] 🗑️ Cleared —', matchId);
  } catch (e) {
    console.log('[CACHE] Clear failed:', e.message);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// useMatches
// ════════════════════════════════════════════════════════════════════════════
export function useMatches({ token, userId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(createApiClient(token));
  const pollingRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (token) apiClient.current = createApiClient(token);
  }, [token]);

  const fetchMatches = useCallback(async () => {
    if (!apiClient.current) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await apiClient.current.get('/matches');
      if (!resp.data.success) throw new Error(resp.data.error);
      setMatches(resp.data.matches || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchMatches();
  }, [token, fetchMatches]);

  useEffect(() => {
    if (!token) return;
    pollingRef.current = setInterval(fetchMatches, 30000);
    return () => clearInterval(pollingRef.current);
  }, [token, fetchMatches]);

  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener('change', next => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        fetchMatches();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [token, fetchMatches]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const handleNewMessage = message => {
      setMatches(prev =>
        prev
          .map(m =>
            m.matchId === message.matchId
              ? {
                  ...m,
                  lastMessage: message.content,
                  lastMessageAt: message.createdAt,
                  unreadCount: (m.unreadCount || 0) + 1,
                }
              : m,
          )
          .sort(
            (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
          ),
      );
    };

    const handleNewMatch = () => fetchMatches();

    socket.on('new_message', handleNewMessage);
    if (userId) socket.on(`new_match_${userId}`, handleNewMatch);

    return () => {
      socket.off('new_message', handleNewMessage);
      if (userId) socket.off(`new_match_${userId}`, handleNewMatch);
    };
  }, [token, userId, fetchMatches]);

  return { matches, loading, error, refetch: fetchMatches };
}

// ════════════════════════════════════════════════════════════════════════════
// useConversation
// ════════════════════════════════════════════════════════════════════════════
export function useConversation({ token, matchId, userId }) {
  const [messages, setMessages] = useState([]);
  const [reactionsMap, setReactionsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false); // instant cache flag
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const typingTimeout = useRef(null);
  const apiClient = useRef(createApiClient(token));
  const socket = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Safe setState helpers ─────────────────────────────────────────────
  const safeSetMessages = useCallback(fn => {
    if (isMounted.current) setMessages(fn);
  }, []);

  const safeSetReactionsMap = useCallback(fn => {
    if (isMounted.current) setReactionsMap(fn);
  }, []);

  // ── Extract reactions from messages ──────────────────────────────────
  const extractReactions = useCallback(msgs => {
    const rxMap = {};
    msgs.forEach(msg => {
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        rxMap[msg.messageId] = msg.reactions;
      }
    });
    return rxMap;
  }, []);

  // ── Step 1: Load cache instantly on mount ────────────────────────────
  useEffect(() => {
    if (!matchId) return;

    const loadCache = async () => {
      const cached = await readCache(matchId);
      if (cached && isMounted.current) {
        console.log('[CACHE] ✅ Cache hit —', cached.messages.length, 'msgs');
        // Batch mein set karo — ek render mein dono
        setMessages(cached.messages);
        setReactionsMap(cached.reactionsMap || {});
        setCacheLoaded(true);
        setLoading(false); // ← loading bhi false karo turant
      } else {
        console.log('[CACHE] ❌ Cache miss');
      }
    };

    loadCache();
  }, [matchId]);

  // ── Step 2: Fetch fresh messages ──────────────────────────────────────
  const fetchMessages = useCallback(
    async (cursor = null) => {
      if (!matchId) return;
      try {
        if (!cursor) setLoading(true);
        else setIsFetchingMore(true);

        const resp = await apiClient.current.get(`/messages/${matchId}`, {
          params: { limit: 30, ...(cursor && { cursor }) },
        });
        if (!resp.data.success) throw new Error(resp.data.error);

        const newMessages = resp.data.messages || [];
        const rxMap = extractReactions(newMessages);

        if (cursor) {
          // Pagination — prepend older messages
          safeSetMessages(prev => {
            const existingIds = new Set(prev.map(m => m.messageId));
            const unique = newMessages.filter(
              m => !existingIds.has(m.messageId),
            );
            const merged = [...unique, ...prev];
            // Update cache with merged
            writeCache(matchId, merged, {});
            return merged;
          });
          safeSetReactionsMap(prev => ({ ...prev, ...rxMap }));
        } else {
          // Fresh fetch — replace
          safeSetMessages(prev => {
            const existingIds = new Set(newMessages.map(m => m.messageId));
            // Keep socket-added temp messages not in fetch
            const socketMsgs = prev.filter(
              m => !existingIds.has(m.messageId) && m.isTemp,
            );
            const merged = [...newMessages, ...socketMsgs];
            // Write to cache
            writeCache(matchId, merged, rxMap);
            return merged;
          });
          safeSetReactionsMap(rxMap);
        }

        if (isMounted.current) {
          setNextCursor(resp.data.nextCursor || null);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err.response?.data?.error || err.message);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    [matchId, extractReactions, safeSetMessages, safeSetReactionsMap],
  );

  useEffect(() => {
    if (token && matchId) fetchMessages();
  }, [token, matchId, fetchMessages]);

  // ── Socket ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !matchId) return;
    socket.current = getSocket(token);

    const handleConnect = () => {
      socket.current.emit('join_room', { matchId, userId });
    };

    const handleNewMessage = message => {
      if (message.matchId !== matchId) return;
      safeSetMessages(prev => {
        // Replace temp
        const tempIdx = prev.findIndex(
          m =>
            m.isTemp &&
            m.senderId === message.senderId &&
            m.content === message.content,
        );
        if (tempIdx >= 0) {
          const next = [...prev];
          next[tempIdx] = {
            ...message,
            replyTo: message.replyTo || next[tempIdx].replyTo,
            isTemp: false,
          };
          // Update cache
          writeCache(matchId, next, {});
          return next;
        }
        if (prev.find(m => m.messageId === message.messageId)) return prev;
        const next = [...prev, message];
        writeCache(matchId, next, {});
        return next;
      });
      if (message.reactions) {
        safeSetReactionsMap(prev => ({
          ...prev,
          [message.messageId]: message.reactions,
        }));
      }
    };

    const handleDelivered = ({ messageIds }) => {
      safeSetMessages(prev =>
        prev.map(m =>
          messageIds?.includes(m.messageId) && m.status === 'sent'
            ? { ...m, status: 'delivered' }
            : m,
        ),
      );
    };

    const handleRead = ({ readBy }) => {
      if (readBy !== userId) {
        safeSetMessages(prev =>
          prev.map(m =>
            m.senderId === userId && m.status !== 'read'
              ? { ...m, status: 'read' }
              : m,
          ),
        );
      }
    };

    const handleEdited = ({
      messageId: eId,
      content,
      isEdited,
      editedAt,
      originalContent,
    }) => {
      safeSetMessages(prev =>
        prev.map(m =>
          m.messageId === eId
            ? {
                ...m,
                content,
                isEdited,
                editedAt,
                originalContent: m.originalContent || originalContent,
              }
            : m,
        ),
      );
    };

    const handleDeleted = ({ messageId: dId, deletedAt }) => {
      safeSetMessages(prev =>
        prev.map(m =>
          m.messageId === dId
            ? {
                ...m,
                type: 'deleted',
                content: 'This message was deleted',
                deletedAt: deletedAt || new Date().toISOString(),
              }
            : m,
        ),
      );
    };

    const handleReacted = ({ messageId, reactions }) => {
      safeSetReactionsMap(prev => ({ ...prev, [messageId]: reactions }));
    };

    const handleTyping = ({ userId: tid }) => {
      if (tid !== userId) {
        if (isMounted.current) setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
          if (isMounted.current) setIsTyping(false);
        }, 3000);
      }
    };

    const handleStopTyping = () => {
      if (isMounted.current) setIsTyping(false);
    };

    socket.current.on('connect', handleConnect);
    socket.current.on('new_message', handleNewMessage);
    socket.current.on('messages_delivered', handleDelivered);
    socket.current.on('messages_read', handleRead);
    socket.current.on('message_edited', handleEdited);
    socket.current.on('message_deleted', handleDeleted);
    socket.current.on('message_reacted', handleReacted);
    socket.current.on('user_typing', handleTyping);
    socket.current.on('user_stop_typing', handleStopTyping);

    if (socket.current.connected) {
      socket.current.emit('join_room', { matchId, userId });
    }

    // Mark read on open
    apiClient.current.put('/messages/read', { matchId }).catch(() => {});

    return () => {
      socket.current.emit('leave_room', { matchId });
      socket.current.off('connect', handleConnect);
      socket.current.off('new_message', handleNewMessage);
      socket.current.off('messages_delivered', handleDelivered);
      socket.current.off('messages_read', handleRead);
      socket.current.off('message_edited', handleEdited);
      socket.current.off('message_deleted', handleDeleted);
      socket.current.off('message_reacted', handleReacted);
      socket.current.off('user_typing', handleTyping);
      socket.current.off('user_stop_typing', handleStopTyping);
    };
  }, [token, matchId, userId, safeSetMessages, safeSetReactionsMap]);

  // ── sendMessage — optimistic ──────────────────────────────────────────
  const sendMessage = useCallback(
    async (content, replyTo = null) => {
      if (!content?.trim() || !matchId) return;

      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const now = new Date().toISOString();

      const tempMsg = {
        messageId: tempId,
        matchId,
        senderId: userId,
        type: 'text',
        content: content.trim(),
        status: 'sending',
        createdAt: now,
        replyTo: replyTo
          ? {
              messageId: replyTo.messageId,
              senderId: replyTo.senderId,
              senderName: replyTo.senderName,
              type: replyTo.type || 'text',
              content:
                replyTo.type === 'image'
                  ? '📷 Photo'
                  : replyTo.type === 'video'
                  ? '🎥 Video'
                  : replyTo.content,
            }
          : null,
        isTemp: true,
      };

      safeSetMessages(prev => [...prev, tempMsg]);

      try {
        const resp = await apiClient.current.post('/messages', {
          matchId,
          content: content.trim(),
          type: 'text',
          ...(replyTo && { replyTo }),
        });
        if (!resp.data.success) throw new Error(resp.data.error);

        safeSetMessages(prev =>
          prev.map(m =>
            m.messageId === tempId
              ? { ...resp.data.message, isTemp: false }
              : m,
          ),
        );
      } catch (err) {
        safeSetMessages(prev =>
          prev.map(m =>
            m.messageId === tempId ? { ...m, status: 'failed' } : m,
          ),
        );
        setError(err.response?.data?.error || err.message);
      }
    },
    [matchId, userId, safeSetMessages],
  );

  // ── sendMedia — optimistic ────────────────────────────────────────────
  const sendMedia = useCallback(
    async (fileUri, fileType, mediaType = 'image') => {
      if (!fileUri || !matchId) return;

      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const now = new Date().toISOString();

      const tempMsg = {
        messageId: tempId,
        matchId,
        senderId: userId,
        type: mediaType,
        content: fileUri,
        status: 'sending',
        createdAt: now,
        isTemp: true,
      };
      safeSetMessages(prev => [...prev, tempMsg]);

      try {
        const urlResp = await apiClient.current.post('/messages/media', {
          matchId,
          fileType,
          mediaType,
        });
        if (!urlResp.data.success) throw new Error(urlResp.data.error);
        const { uploadUrl, publicUrl } = urlResp.data;

        const blob = await fetch(fileUri).then(r => r.blob());
        await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': fileType },
        });

        const resp = await apiClient.current.post('/messages', {
          matchId,
          content: publicUrl,
          type: mediaType,
        });
        if (!resp.data.success) throw new Error(resp.data.error);

        safeSetMessages(prev =>
          prev.map(m =>
            m.messageId === tempId
              ? { ...resp.data.message, isTemp: false }
              : m,
          ),
        );
      } catch (err) {
        safeSetMessages(prev =>
          prev.map(m =>
            m.messageId === tempId ? { ...m, status: 'failed' } : m,
          ),
        );
        setError(err.response?.data?.error || err.message);
      }
    },
    [matchId, userId, safeSetMessages],
  );

  // ── reactToMessage — optimistic ───────────────────────────────────────
  const reactToMessage = useCallback(
    async (messageId, msgMatchId, emoji) => {
      safeSetReactionsMap(prev => {
        const curr = { ...(prev[messageId] || {}) };
        if (!emoji || curr[userId] === emoji) {
          delete curr[userId];
        } else {
          curr[userId] = emoji;
        }
        return { ...prev, [messageId]: curr };
      });

      try {
        await apiClient.current.patch('/messages/react', {
          messageId,
          matchId: msgMatchId,
          emoji,
        });
      } catch (err) {
        console.error('[reactToMessage]', err.message);
        fetchMessages();
      }
    },
    [userId, fetchMessages],
  );

  // ── deleteMessage — optimistic ────────────────────────────────────────
  const deleteMessage = useCallback(
    async messageId => {
      const now = new Date().toISOString();
      safeSetMessages(prev =>
        prev.map(m =>
          m.messageId === messageId
            ? {
                ...m,
                type: 'deleted',
                content: 'This message was deleted',
                deletedAt: now,
              }
            : m,
        ),
      );
      try {
        await apiClient.current.delete(`/messages/${messageId}`, {
          data: { matchId },
        });
        // Invalidate cache
        clearCache(matchId);
      } catch (err) {
        console.error('[deleteMessage]', err.message);
        fetchMessages();
      }
    },
    [matchId, fetchMessages, safeSetMessages],
  );

  // ── editMessage — optimistic ──────────────────────────────────────────
  const editMessage = useCallback(
    async (messageId, content) => {
      if (!content?.trim()) return;
      safeSetMessages(prev =>
        prev.map(m => {
          if (m.messageId !== messageId) return m;
          return {
            ...m,
            content: content.trim(),
            isEdited: true,
            editedAt: new Date().toISOString(),
            originalContent: m.originalContent || m.content,
          };
        }),
      );
      try {
        await apiClient.current.patch('/messages/edit', {
          messageId,
          matchId,
          content: content.trim(),
        });
        clearCache(matchId);
      } catch (err) {
        console.error('[editMessage]', err.message);
        fetchMessages();
      }
    },
    [matchId, fetchMessages, safeSetMessages],
  );

  // ── emitTyping ────────────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    socket.current?.emit('typing', { matchId, userId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.current?.emit('stop_typing', { matchId, userId });
    }, 1500);
  }, [matchId, userId]);

  // ── loadMore ──────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (nextCursor && !loading && !isFetchingMore) {
      fetchMessages(nextCursor);
    }
  }, [nextCursor, loading, isFetchingMore, fetchMessages]);

  return {
    messages,
    reactionsMap,
    loading: loading && !cacheLoaded, // cache loaded hai toh loading hide karo
    cacheLoaded,
    isFetchingMore,
    sending: false,
    error,
    isTyping,
    hasMore: !!nextCursor,
    sendMessage,
    sendMedia,
    emitTyping,
    loadMore,
    reactToMessage,
    deleteMessage,
    editMessage,
  };
}
