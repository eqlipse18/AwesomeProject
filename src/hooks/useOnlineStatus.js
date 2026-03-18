import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
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

export const formatLastActive = (lastActiveAt, maxDays = 30) => {
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
};

export const isRecentlyActive = (lastActiveAt, days = 7) => {
  if (!lastActiveAt) return false;
  const diffDays = (new Date() - new Date(lastActiveAt)) / 86400000;
  return diffDays <= days;
};

export function useOnlineStatus({ token, userId }) {
  const [onlineMap, setOnlineMap] = useState({});
  const socket = useRef(null);
  const activityInterval = useRef(null);
  const backgroundTimer = useRef(null); // ✅ grace period timer
  const appState = useRef(AppState.currentState);
  const isConnected = useRef(true);

  const emitOnline = useCallback(() => {
    if (socket.current?.connected && userId) {
      console.log('[OnlineStatus] Emitting user_online');
      socket.current.emit('user_online', { userId });
    }
  }, [userId]);

  const emitOffline = useCallback(() => {
    if (socket.current?.connected && userId) {
      console.log('[OnlineStatus] Emitting user_offline');
      socket.current.emit('user_offline', { userId });
    }
  }, [userId]);

  const emitActivity = useCallback(() => {
    if (socket.current?.connected && userId && isConnected.current) {
      socket.current.emit('user_activity', { userId });
    }
  }, [userId]);

  useEffect(() => {
    if (!token || !userId) return;

    socket.current = getSocket(token);

    // ✅ Connect pe immediately online emit karo
    if (socket.current.connected) {
      emitOnline();
    } else {
      socket.current.on('connect', emitOnline);
    }

    // ✅ Online status changes sun
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

    // ════════════════════════════════════════
    // LEVEL 2 — AppState handler
    // ════════════════════════════════════════
    const appStateSub = AppState.addEventListener('change', nextState => {
      const prev = appState.current;
      appState.current = nextState;

      if (nextState === 'active') {
        // App foreground mein aayi
        console.log('[OnlineStatus] App active — going online');
        clearTimeout(backgroundTimer.current); // grace period cancel
        emitOnline();
        // Activity interval restart
        clearInterval(activityInterval.current);
        activityInterval.current = setInterval(emitActivity, 60000);
      } else if (nextState === 'background' || nextState === 'inactive') {
        // App background mein gayi
        // ✅ 10 min grace period — tab tak online dikhate hain
        console.log('[OnlineStatus] App background — 10min grace period');
        backgroundTimer.current = setTimeout(() => {
          console.log('[OnlineStatus] Grace period over — going offline');
          emitOffline();
          clearInterval(activityInterval.current);
        }, 10 * 60 * 1000); // 10 minutes
      }
    });

    // ════════════════════════════════════════
    // LEVEL 3 — NetInfo handler
    // ════════════════════════════════════════
    const netInfoUnsub = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;

      if (connected && !isConnected.current) {
        // Internet wapas aaya — online emit karo
        console.log('[OnlineStatus] Internet reconnected — going online');
        isConnected.current = true;
        emitOnline();
        // Activity interval restart
        clearInterval(activityInterval.current);
        activityInterval.current = setInterval(emitActivity, 60000);
      } else if (!connected && isConnected.current) {
        // Internet chala gaya — offline emit karo
        console.log('[OnlineStatus] Internet lost — going offline');
        isConnected.current = false;
        emitOffline();
        clearInterval(activityInterval.current);
      }
    });

    return () => {
      socket.current?.off('connect', emitOnline);
      socket.current?.off('online_status_changed');
      clearInterval(activityInterval.current);
      clearTimeout(backgroundTimer.current);
      appStateSub.remove();
      netInfoUnsub();
    };
  }, [token, userId, emitOnline, emitOffline, emitActivity]);

  const getStatus = useCallback(
    (targetUserId, profileData = {}) => {
      const socketStatus = onlineMap[targetUserId];
      if (socketStatus !== undefined) {
        return {
          isOnline: socketStatus.isOnline,
          lastActiveAt: socketStatus.lastActiveAt || profileData.lastActiveAt,
        };
      }
      return {
        isOnline: profileData.isOnline ?? false,
        lastActiveAt: profileData.lastActiveAt ?? null,
      };
    },
    [onlineMap],
  );

  return { getStatus, onlineMap };
}
