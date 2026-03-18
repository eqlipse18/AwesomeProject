/**
 * useOnlineStatus
 * - Emits user_online on mount
 * - Pings user_activity every 60s
 * - Listens for online_status_changed events
 * - Returns getStatus(userId) helper
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import Config from 'react-native-config';

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

let socketInstance = null;

const getSocket = token => {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socketInstance;
};

// ── Format last active time ──
export const formatLastActive = (lastActiveAt, maxDays = 30) => {
  //  maxDays 3 → 30 — zyada range
  if (!lastActiveAt) return 'Not active recently';

  const now = new Date();
  const last = new Date(lastActiveAt);
  const diffMs = now - last;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 2) return 'Just now';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays <= maxDays) return `Active ${diffDays}d ago`;
  return 'Not active recently';
  // null ki jagah string return — hamesha kuch dikhega
};

// ── Is user recently active (within 7 days) ──
export const isRecentlyActive = (lastActiveAt, days = 7) => {
  if (!lastActiveAt) return false;
  const diffDays = (new Date() - new Date(lastActiveAt)) / 86400000;
  return diffDays <= days;
};

export function useOnlineStatus({ token, userId }) {
  // Map of userId → { isOnline, lastActiveAt }
  const [onlineMap, setOnlineMap] = useState({});
  const socket = useRef(null);
  const activityInterval = useRef(null);
  const appState = useRef(AppState.currentState);

  const emitOnline = useCallback(() => {
    if (socket.current?.connected && userId) {
      socket.current.emit('user_online', { userId });
    }
  }, [userId]);

  const emitActivity = useCallback(() => {
    if (socket.current?.connected && userId) {
      socket.current.emit('user_activity', { userId });
    }
  }, [userId]);

  useEffect(() => {
    if (!token || !userId) return;

    socket.current = getSocket(token);

    // ✅ Emit online when connected
    if (socket.current.connected) {
      emitOnline();
    } else {
      socket.current.on('connect', emitOnline);
    }

    // ✅ Listen for status changes
    socket.current.on(
      'online_status_changed',
      ({ userId: changedId, isOnline, lastActiveAt }) => {
        setOnlineMap(prev => ({
          ...prev,
          [changedId]: {
            isOnline,
            lastActiveAt: lastActiveAt || prev[changedId]?.lastActiveAt,
          },
        }));
      },
    );

    // ✅ Activity ping every 60s
    activityInterval.current = setInterval(emitActivity, 60000);

    // ✅ AppState — foreground/background handle
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // App foreground mein aayi — online emit karo
        emitOnline();
      }
      appState.current = nextState;
    });

    return () => {
      socket.current.off('connect', emitOnline);
      socket.current.off('online_status_changed');
      clearInterval(activityInterval.current);
      appStateSub.remove();
    };
  }, [token, userId, emitOnline, emitActivity]);

  // ✅ Helper — kisi bhi userId ka status lo
  const getStatus = useCallback(
    (targetUserId, profileData = {}) => {
      const socketStatus = onlineMap[targetUserId];

      // Socket se real-time status mila
      if (socketStatus !== undefined) {
        return {
          isOnline: socketStatus.isOnline,
          lastActiveAt: socketStatus.lastActiveAt || profileData.lastActiveAt,
        };
      }

      // Fallback — profile data se
      return {
        isOnline: profileData.isOnline ?? false,
        lastActiveAt: profileData.lastActiveAt ?? null,
      };
    },
    [onlineMap],
  );

  return { getStatus, onlineMap };
}
