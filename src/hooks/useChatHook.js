import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { AppState } from 'react-native';
import Config from 'react-native-config';
import { io } from 'socket.io-client';

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

  // 30s polling
  useEffect(() => {
    if (!token) return;
    pollingRef.current = setInterval(fetchMatches, 30000);
    return () => clearInterval(pollingRef.current);
  }, [token, fetchMatches]);

  // AppState foreground refetch
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

  // Socket — new_message + new_match
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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [reactionsMap, setReactionsMap] = useState({}); // ✅ { [messageId]: { [userId]: emoji } }
  const [deletedIds, setDeletedIds] = useState(new Set());

  const typingTimeout = useRef(null);
  const apiClient = useRef(createApiClient(token));
  const socket = useRef(null);

  const fetchMessages = useCallback(
    async (cursor = null) => {
      if (!matchId) return;
      try {
        setLoading(true);
        const resp = await apiClient.current.get(`/messages/${matchId}`, {
          params: { limit: 30, ...(cursor && { cursor }) },
        });
        if (!resp.data.success) throw new Error(resp.data.error);

        const newMessages = resp.data.messages || [];

        // ✅ Extract reactions from fetched messages
        const rxMap = {};
        newMessages.forEach(msg => {
          if (msg.reactions && Object.keys(msg.reactions).length > 0) {
            rxMap[msg.messageId] = msg.reactions;
          }
        });
        setReactionsMap(prev => ({ ...prev, ...rxMap }));

        setMessages(prev => {
          if (cursor) {
            const existingIds = new Set(prev.map(m => m.messageId));
            const unique = newMessages.filter(
              m => !existingIds.has(m.messageId),
            );
            return [...unique, ...prev];
          }
          const existingIds = new Set(newMessages.map(m => m.messageId));
          const socketMessages = prev.filter(
            m => !existingIds.has(m.messageId),
          );
          return [...newMessages, ...socketMessages];
        });

        setNextCursor(resp.data.nextCursor || null);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    },
    [matchId],
  );

  useEffect(() => {
    if (token && matchId) fetchMessages();
  }, [token, matchId, fetchMessages]);

  // Socket setup
  useEffect(() => {
    if (!token || !matchId) return;
    socket.current = getSocket(token);

    const handleConnect = () => {
      // ✅ Pass userId so backend can mark delivered
      socket.current.emit('join_room', { matchId, userId });
    };

    const handleNewMessage = message => {
      if (message.matchId !== matchId) return;
      setMessages(prev => {
        // Temp message replace karo (same sender + same content)
        const tempIdx = prev.findIndex(
          m =>
            m.isTemp &&
            m.senderId === message.senderId &&
            m.content === message.content,
        );
        if (tempIdx >= 0) {
          const next = [...prev];
          next[tempIdx] = { ...message, isTemp: false };
          return next;
        }
        // Duplicate check
        if (prev.find(m => m.messageId === message.messageId)) return prev;
        return [...prev, message];
      });
    };

    // ✅ delivered — update status of sent messages
    const handleDelivered = ({ messageIds }) => {
      setMessages(prev =>
        prev.map(m =>
          messageIds.includes(m.messageId) && m.status === 'sent'
            ? { ...m, status: 'delivered' }
            : m,
        ),
      );
    };

    // ✅ reaction — update reactionsMap
    const handleReacted = ({ messageId, reactions }) => {
      setReactionsMap(prev => ({ ...prev, [messageId]: reactions }));
    };

    const handleTyping = ({ userId: tid }) => {
      if (tid !== userId) setIsTyping(true);
    };
    const handleStopTyping = () => setIsTyping(false);

    const handleRead = ({ readBy }) => {
      if (readBy !== userId) {
        setMessages(prev =>
          prev.map(m => (m.senderId === userId ? { ...m, status: 'read' } : m)),
        );
      }
    };
    // ── handleDeleted — deletedAt bhi save karo ──
    const handleDeleted = ({ messageId: dId, deletedAt }) => {
      setMessages(prev =>
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
    // ── handleEdited — originalContent bhi update karo ──
    const handleEdited = ({
      messageId: eId,
      content,
      isEdited,
      editedAt,
      originalContent,
    }) => {
      setMessages(prev =>
        prev.map(m =>
          m.messageId === eId
            ? {
                ...m,
                content,
                isEdited,
                editedAt,
                // pehle se originalContent hai toh preserve karo
                originalContent: m.originalContent || originalContent,
              }
            : m,
        ),
      );
    };

    socket.current.on('connect', handleConnect);
    socket.current.on('new_message', handleNewMessage);
    socket.current.on('messages_delivered', handleDelivered);
    socket.current.on('message_reacted', handleReacted);
    socket.current.on('user_typing', handleTyping);
    socket.current.on('user_stop_typing', handleStopTyping);
    socket.current.on('messages_read', handleRead);
    socket.current.on('message_deleted', handleDeleted);
    socket.current.on('message_edited', handleEdited);

    if (socket.current.connected) {
      socket.current.emit('join_room', { matchId, userId });
    }

    apiClient.current.put('/messages/read', { matchId }).catch(() => {});

    return () => {
      socket.current.emit('leave_room', { matchId });
      socket.current.off('connect', handleConnect);
      socket.current.off('new_message', handleNewMessage);
      socket.current.off('messages_delivered', handleDelivered);
      socket.current.off('message_reacted', handleReacted);
      socket.current.off('user_typing', handleTyping);
      socket.current.off('user_stop_typing', handleStopTyping);
      socket.current.off('messages_read', handleRead);
      socket.current.off('message_deleted', handleDeleted);
      socket.current.off('message_edited', handleEdited);

      // sendMessage mein replyTo support add karo:
    };
  }, [token, matchId, userId]);
  // ── deleteMessage — OPTIMISTIC ──
  const deleteMessage = useCallback(
    async messageId => {
      const now = new Date().toISOString();

      // ── Instant UI update ──
      setMessages(prev =>
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
      } catch (err) {
        console.error('[deleteMessage]', err.message);
        fetchMessages(); // rollback on error
      }
    },
    [matchId, fetchMessages],
  );

  // ── editMessage — OPTIMISTIC (instant, no wait) ──
  const editMessage = useCallback(
    async (messageId, content) => {
      if (!content?.trim()) return;

      // ── Capture original before overwriting ──
      setMessages(prev =>
        prev.map(m => {
          if (m.messageId !== messageId) return m;
          return {
            ...m,
            content: content.trim(),
            isEdited: true,
            editedAt: new Date().toISOString(),
            // Preserve first-ever original
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
      } catch (err) {
        console.error('[editMessage]', err.message);
        // rollback — refetch
        fetchMessages();
      }
    },
    [matchId, fetchMessages],
  );
  // ── sendMessage — OPTIMISTIC (instant bubble, no loader) ──
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
        replyTo: replyTo || null,
        isTemp: true,
      };

      // ── Instant add ──
      setMessages(prev => [...prev, tempMsg]);

      try {
        const resp = await apiClient.current.post('/messages', {
          matchId,
          content: content.trim(),
          type: 'text',
          ...(replyTo && { replyTo }),
        });
        if (!resp.data.success) throw new Error(resp.data.error);

        // ── Replace temp with real ──
        setMessages(prev =>
          prev.map(m =>
            m.messageId === tempId
              ? { ...resp.data.message, isTemp: false }
              : m,
          ),
        );
      } catch (err) {
        // ── Mark failed ──
        setMessages(prev =>
          prev.map(m =>
            m.messageId === tempId ? { ...m, status: 'failed' } : m,
          ),
        );
        setError(err.response?.data?.error || err.message);
      }
      // setSending removed — no loader
    },
    [matchId, userId],
  );

  // ✅ Replace karo pura sendMedia
  const sendMedia = useCallback(
    async (fileUri, fileType, mediaType = 'image') => {
      if (!fileUri || !matchId) return;

      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const now = new Date().toISOString();

      // ── Instant preview with local URI ──
      const tempMsg = {
        messageId: tempId,
        matchId,
        senderId: userId,
        type: mediaType,
        content: fileUri, // local uri — instant preview
        status: 'sending',
        createdAt: now,
        isTemp: true,
      };
      setMessages(prev => [...prev, tempMsg]);

      try {
        // 1. Get presigned URL
        const urlResp = await apiClient.current.post('/messages/media', {
          matchId,
          fileType,
          mediaType,
        });
        if (!urlResp.data.success) throw new Error(urlResp.data.error);
        const { uploadUrl, publicUrl } = urlResp.data;

        // 2. Upload to S3
        const blob = await fetch(fileUri).then(r => r.blob());
        await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': fileType },
        });

        // 3. Save message
        const resp = await apiClient.current.post('/messages', {
          matchId,
          content: publicUrl,
          type: mediaType,
        });
        if (!resp.data.success) throw new Error(resp.data.error);

        // ── Replace temp with real (S3 URL) ──
        setMessages(prev =>
          prev.map(m =>
            m.messageId === tempId
              ? { ...resp.data.message, isTemp: false }
              : m,
          ),
        );
      } catch (err) {
        setMessages(prev =>
          prev.map(m =>
            m.messageId === tempId ? { ...m, status: 'failed' } : m,
          ),
        );
        setError(err.response?.data?.error || err.message);
      }
    },
    [matchId, userId],
  );

  const emitTyping = useCallback(() => {
    socket.current?.emit('typing', { matchId, userId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.current?.emit('stop_typing', { matchId, userId });
    }, 1500);
  }, [matchId, userId]);

  const loadMore = useCallback(() => {
    if (nextCursor && !loading) fetchMessages(nextCursor);
  }, [nextCursor, loading, fetchMessages]);

  // ✅ Replace karo pura reactToMessage
  const reactToMessage = useCallback(
    async (messageId, msgMatchId, emoji) => {
      // ── Optimistic update ──
      setReactionsMap(prev => {
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
        fetchMessages(); // rollback on error
      }
    },
    [userId, fetchMessages],
  );

  return {
    messages,
    loading,
    sending,
    error,
    isTyping,
    hasMore: !!nextCursor,
    sendMessage,
    sendMedia,
    emitTyping,
    loadMore,
    reactToMessage,
    reactionsMap, // ✅ NEW
    deleteMessage,
    editMessage,
  };
}
