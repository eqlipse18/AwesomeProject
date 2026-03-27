/**
 * useChatHook - Real-time chat with Socket.io
 *
 * - useMatches: Match list
 * - useConversation: Messages for a specific match
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

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

// ── Singleton socket ──
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
// useMatches — Match list
// ════════════════════════════════════════════════════════════════════════════

export function useMatches({ token }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(createApiClient(token));

  useEffect(() => {
    if (token) apiClient.current = createApiClient(token);
  }, [token]);

  const fetchMatches = useCallback(async () => {
    if (!apiClient.current) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await apiClient.current.get('/matches');
      console.log('[useMatches] response:', JSON.stringify(resp.data));
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

  // ✅ Sirf new_message listen karo — no matchId needed
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

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [token]);

  return { matches, loading, error, refetch: fetchMatches };
}

// ════════════════════════════════════════════════════════════════════════════
// useConversation — Messages for one match
// ════════════════════════════════════════════════════════════════════════════
export function useConversation({ token, matchId, userId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
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

        setMessages(prev => {
          if (cursor) {
            // ✅ Load more — purane messages upar add karo
            const existingIds = new Set(prev.map(m => m.messageId));
            const unique = newMessages.filter(
              m => !existingIds.has(m.messageId),
            );
            return [...unique, ...prev];
          }
          // ✅ Initial load — socket se aaye messages preserve karo
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

  // ✅ Socket — matchId yahan properly exist karta hai
  useEffect(() => {
    if (!token || !matchId) return;

    socket.current = getSocket(token);

    // named handler — proper cleanup ke liye
    const handleConnect = () => {
      socket.current.emit('join_room', { matchId });
    };

    const handleNewMessage = message => {
      if (message.matchId !== matchId) return;
      setMessages(prev => {
        if (prev.find(m => m.messageId === message.messageId)) return prev;
        return [...prev, message];
      });
    };

    const handleTyping = ({ userId: typingUserId }) => {
      if (typingUserId !== userId) setIsTyping(true);
    };

    const handleStopTyping = () => setIsTyping(false);

    const handleMessagesRead = ({ readBy }) => {
      if (readBy !== userId) {
        setMessages(prev =>
          prev.map(m => (m.senderId === userId ? { ...m, status: 'read' } : m)),
        );
      }
    };

    // ALWAYS listen for connect — handles reconnects bhi
    socket.current.on('connect', handleConnect);
    socket.current.on('new_message', handleNewMessage);
    socket.current.on('user_typing', handleTyping);
    socket.current.on('user_stop_typing', handleStopTyping);
    socket.current.on('messages_read', handleMessagesRead);

    // Agar already connected hai toh abhi bhi join karo
    if (socket.current.connected) {
      socket.current.emit('join_room', { matchId });
    }

    apiClient.current.put('/messages/read', { matchId }).catch(() => {});

    return () => {
      socket.current.emit('leave_room', { matchId });
      // named handlers hata rahe hain — sirf ye wale, baaki safe
      socket.current.off('connect', handleConnect);
      socket.current.off('new_message', handleNewMessage);
      socket.current.off('user_typing', handleTyping);
      socket.current.off('user_stop_typing', handleStopTyping);
      socket.current.off('messages_read', handleMessagesRead);
    };
  }, [token, matchId, userId]);

  const sendMessage = useCallback(
    async content => {
      if (!content?.trim() || !matchId) return;
      try {
        setSending(true);
        const resp = await apiClient.current.post('/messages', {
          matchId,
          content: content.trim(),
          type: 'text',
        });
        if (!resp.data.success) throw new Error(resp.data.error);
        setMessages(prev => {
          if (prev.find(m => m.messageId === resp.data.message.messageId))
            return prev;
          return [...prev, resp.data.message];
        });
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setSending(false);
      }
    },
    [matchId],
  );

  const sendMedia = useCallback(
    async (fileUri, fileType, mediaType = 'image') => {
      if (!fileUri || !matchId) return;
      try {
        setSending(true);
        const urlResp = await apiClient.current.post('/messages/media', {
          matchId,
          fileType,
          mediaType,
        });
        if (!urlResp.data.success) throw new Error(urlResp.data.error);
        const { uploadUrl, publicUrl } = urlResp.data;
        const fileBlob = await fetch(fileUri).then(r => r.blob());
        await fetch(uploadUrl, {
          method: 'PUT',
          body: fileBlob,
          headers: { 'Content-Type': fileType },
        });
        const resp = await apiClient.current.post('/messages', {
          matchId,
          content: publicUrl,
          type: mediaType,
        });
        if (!resp.data.success) throw new Error(resp.data.error);
        setMessages(prev => {
          if (prev.find(m => m.messageId === resp.data.message.messageId))
            return prev;
          return [...prev, resp.data.message];
        });
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setSending(false);
      }
    },
    [matchId],
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
  };
}
