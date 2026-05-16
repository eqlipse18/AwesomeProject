import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import axios from 'axios';
import Config from 'react-native-config';

const API = Config.API_BASE_URL || 'http://192.168.100.154:9000';

// ── Global in-memory cache — avoids re-fetching same user ─────────────────
const statusCache = new Map(); // userId → { iLiked, hasLikedMe, isMatched, matchId }

export const useLikeStatus = ({ token, targetUserId, socketRef }) => {
  const [status, setStatus] = useState(
    statusCache.get(targetUserId) || {
      iLiked: false,
      hasLikedMe: false,
      isMatched: false,
      matchId: null,
      loading: true,
    },
  );

  // ── Fetch from backend ──────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!token || !targetUserId) return;
    try {
      const resp = await axios.get(`${API}/check-status/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.data.success) {
        const s = {
          iLiked: resp.data.iLiked,
          hasLikedMe: resp.data.hasLikedMe,
          isMatched: resp.data.isMatched,
          matchId: resp.data.matchId,
          loading: false,
        };
        statusCache.set(targetUserId, s);
        setStatus(s);
      }
    } catch (e) {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [token, targetUserId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Listen to local events (same device swipes) ────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('like_update', event => {
      if (event.toUserId !== targetUserId) return;

      setStatus(prev => {
        const updated = {
          ...prev,
          iLiked: true,
          isMatched: event.isMatch,
          matchId: event.matchId || prev.matchId,
          loading: false,
        };
        statusCache.set(targetUserId, updated);
        return updated;
      });
    });
    return () => sub.remove();
  }, [targetUserId]);

  // ── Listen to socket (other user liked/matched us) ─────────────────────
  useEffect(() => {
    if (!socketRef?.current) return;

    const handleNewMatch = data => {
      // Check if this match involves our targetUser
      if (!data.matchId) return;
      fetchStatus(); // Re-fetch to get accurate state
    };

    const handleLikedByUser = data => {
      if (data.fromUserId !== targetUserId) return;
      setStatus(prev => {
        const updated = {
          ...prev,
          hasLikedMe: true,
          loading: false,
        };
        statusCache.set(targetUserId, updated);
        return updated;
      });
    };

    socketRef.current.on(`new_match_${targetUserId}`, handleNewMatch);
    socketRef.current.on('liked_by_user', handleLikedByUser);

    return () => {
      socketRef.current?.off(`new_match_${targetUserId}`, handleNewMatch);
      socketRef.current?.off('liked_by_user', handleLikedByUser);
    };
  }, [socketRef, targetUserId, fetchStatus]);

  // ── Computed UI state ───────────────────────────────────────────────────
  const uiState = (() => {
    if (status.isMatched) return 'chat'; // Both liked → Chat
    if (status.hasLikedMe) return 'like_back'; // They liked me → Like Back
    if (status.iLiked) return 'liked'; // I liked → Liked (disabled)
    return 'like'; // No likes → Like
  })();

  return { status, uiState, refetch: fetchStatus };
};

// ── Emit helper — call this everywhere a like/swipe happens ───────────────
export const emitLikeUpdate = ({
  toUserId,
  isMatch = false,
  matchId = null,
}) => {
  DeviceEventEmitter.emit('like_update', { toUserId, isMatch, matchId });

  // Also invalidate cache
  const cached = statusCache.get(toUserId);
  if (cached) {
    statusCache.set(toUserId, {
      ...cached,
      iLiked: true,
      isMatched: isMatch,
      matchId: matchId || cached.matchId,
    });
  }
};
