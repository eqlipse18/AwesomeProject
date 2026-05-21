import { useState, useCallback, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import Config from 'react-native-config';
import { AuthContext } from '../../AuthContex';

const API = Config.API_BASE_URL || 'http://192.168.100.154:9000';

export const useRequests = () => {
  const { token, userId } = useContext(AuthContext);

  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);

  const api = useRef(
    axios.create({
      baseURL: API,
      timeout: 10000,
    }),
  );

  // Always fresh token
  useEffect(() => {
    api.current.defaults.headers.common.Authorization = `Bearer ${token}`;
  }, [token]);

  // ── Fetch received ────────────────────────────────────────────────────
  const fetchReceived = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await api.current.get('/requests/received');
      if (resp.data.success) setReceived(resp.data.requests || []);
    } catch (err) {
      console.error(
        '[useRequests] fetchReceived:',
        err.response?.status,
        err.response?.data || err.message,
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── Fetch sent ────────────────────────────────────────────────────────
  const fetchSent = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await api.current.post('/requests/send', {
        receiverId: targetUserId, // ← targetUserId → receiverId
        fromSuperlike,
      });
      if (resp.data.success) setSent(resp.data.requests || []);
    } catch (err) {
      console.error(
        '[useRequests] fetchSent:',
        err.response?.status,
        err.response?.data || err.message,
      );
    }
  }, [token]);

  // ── Send request ──────────────────────────────────────────────────────
  // useRequests.js — sendRequest mein detailed log add karo
  const sendRequest = useCallback(
    async (targetUserId, fromSuperlike = false) => {
      if (!token) {
        console.log('[sendRequest] No token!');
        return { success: false, error: 'No token' };
      }
      try {
        console.log('[sendRequest] Calling:', targetUserId);
        const resp = await api.current.post(
          '/requests/send',
          { targetUserId, fromSuperlike },
          { headers: { Authorization: `Bearer ${token}` } }, // ← direct header
        );
        console.log('[sendRequest] resp.data:', JSON.stringify(resp.data));
        return resp.data;
      } catch (err) {
        const status = err.response?.status;
        const body = err.response?.data;

        // ← Premium gate errors expected hain — error log mat karo
        if (body?.requiresPremium || body?.limitReached) {
          return {
            success: false,
            requiresPremium: body?.requiresPremium || false,
            limitReached: body?.limitReached || false,
            upgradeToUltra: body?.upgradeToUltra || false,
            error: body?.error,
          };
        }

        // Real errors ke liye log karo
        console.error('[sendRequest] Error:', status, JSON.stringify(body));
        return {
          success: false,
          error: body?.error || err.message,
        };
      }
    },
    [token],
  );

  // ── Accept ────────────────────────────────────────────────────────────
  const acceptRequest = useCallback(async (requestId, createdAt) => {
    try {
      const resp = await api.current.post('/requests/accept', {
        requestId,
        createdAt,
      });
      if (resp.data.success) {
        setReceived(prev => prev.filter(r => r.requestId !== requestId));
      }
      return resp.data;
    } catch (err) {
      console.error(
        '[useRequests] acceptRequest:',
        err.response?.data || err.message,
      );
      return { success: false };
    }
  }, []);

  // ── Reject ────────────────────────────────────────────────────────────
  const rejectRequest = useCallback(async (requestId, createdAt) => {
    try {
      const resp = await api.current.post('/requests/reject', {
        requestId,
        createdAt,
      });
      if (resp.data.success) {
        setReceived(prev => prev.filter(r => r.requestId !== requestId));
      }
      return resp.data;
    } catch (err) {
      console.error(
        '[useRequests] rejectRequest:',
        err.response?.data || err.message,
      );
      return { success: false };
    }
  }, []);

  // ── Socket updates — inline (no separate socket instance needed) ──────
  // ConversationScreen ka socket already connected hai — events wahan handle hote hain
  // Yahan sirf optimistic state update karo

  const handleRequestAccepted = useCallback(({ requestId }) => {
    setSent(prev =>
      prev.map(r =>
        r.requestId === requestId ? { ...r, status: 'accepted' } : r,
      ),
    );
  }, []);

  const handleRequestRejected = useCallback(({ requestId }) => {
    setSent(prev =>
      prev.map(r =>
        r.requestId === requestId ? { ...r, status: 'rejected' } : r,
      ),
    );
  }, []);

  return {
    received,
    sent,
    loading,
    receivedCount: received.length,
    fetchReceived,
    fetchSent,
    sendRequest,
    acceptRequest,
    rejectRequest,
    handleRequestAccepted,
    handleRequestRejected,
  };
};
