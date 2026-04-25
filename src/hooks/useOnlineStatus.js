import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import Config from 'react-native-config';
import { getSocket } from '../../utils/socket';
const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

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

export function useOnlineStatus({ token, userId, watchUserIds = [] }) {
  const [onlineMap, setOnlineMap] = useState({});
  const socket = useRef(null);
  const activityInterval = useRef(null);
  const backgroundTimer = useRef(null);
  const appState = useRef(AppState.currentState);
  const isConnected = useRef(true);

  // ✅ Keep watchUserIds in a ref so fetchInitialStatus always has latest value
  const watchUserIdsRef = useRef(watchUserIds);
  useEffect(() => {
    watchUserIdsRef.current = watchUserIds;
  }, [watchUserIds]);

  const emitOnline = useCallback(() => {
    if (socket.current?.connected && userId) {
      socket.current.emit('user_online', { userId });
    }
  }, [userId]);

  const emitOffline = useCallback(() => {
    if (socket.current?.connected && userId) {
      socket.current.emit('user_offline', { userId });
    }
  }, [userId]);

  const emitActivity = useCallback(() => {
    if (socket.current?.connected && userId && isConnected.current) {
      socket.current.emit('user_activity', { userId });
    }
  }, [userId]);

  // ✅ Defined outside useEffect — accessible in cleanup
  const fetchInitialStatus = useCallback(() => {
    watchUserIdsRef.current.forEach(targetId => {
      socket.current?.emit('get_user_status', { targetUserId: targetId });
    });
  }, []);

  useEffect(() => {
    if (!socket.current?.connected || !watchUserIdsRef.current.length) return;
    // Jab bhi watchUserIds change ho (matches load hone pe) fresh status fetch karo
    watchUserIdsRef.current.forEach(targetId => {
      socket.current?.emit('get_user_status', { targetUserId: targetId });
    });
  }, [watchUserIds]);

  // ✅ Defined outside useEffect — accessible in cleanup
  const handleStatusResponse = useCallback(
    ({ userId: uid, isOnline, lastActiveAt }) => {
      setOnlineMap(prev => ({
        ...prev,
        [uid]: { isOnline, lastActiveAt },
      }));
    },
    [],
  );

  const handleOnlineStatusChanged = useCallback(
    ({ userId: changedId, isOnline, lastActiveAt }) => {
      setOnlineMap(prev => ({
        ...prev,
        [changedId]: {
          isOnline,
          lastActiveAt: lastActiveAt || prev[changedId]?.lastActiveAt,
        },
      }));
    },
    [],
  );

  useEffect(() => {
    if (!token || !userId) return;

    socket.current = getSocket(token);

    const onConnect = () => {
      emitOnline();
      fetchInitialStatus();
    };

    if (socket.current.connected) {
      emitOnline();
      fetchInitialStatus();
    } else {
      socket.current.on('connect', onConnect);
    }

    socket.current.on('user_status_response', handleStatusResponse);
    socket.current.on('online_status_changed', handleOnlineStatusChanged);

    // Activity ping every 60s
    activityInterval.current = setInterval(emitActivity, 60000);

    // AppState — background grace period
    const appStateSub = AppState.addEventListener('change', nextState => {
      appState.current = nextState;
      if (nextState === 'active') {
        clearTimeout(backgroundTimer.current);
        emitOnline();
        fetchInitialStatus();
        clearInterval(activityInterval.current);
        activityInterval.current = setInterval(emitActivity, 60000);
      } else if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimer.current = setTimeout(() => {
          emitOffline();
          clearInterval(activityInterval.current);
        }, 10 * 60 * 1000);
      }
    });

    // NetInfo
    const netInfoUnsub = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      if (connected && !isConnected.current) {
        isConnected.current = true;
        emitOnline();
        fetchInitialStatus();
        clearInterval(activityInterval.current);
        activityInterval.current = setInterval(emitActivity, 60000);
      } else if (!connected && isConnected.current) {
        isConnected.current = false;
        emitOffline();
        clearInterval(activityInterval.current);
      }
    });

    return () => {
      // ✅ All handlers defined outside — no scope issue
      socket.current?.off('connect', onConnect);
      socket.current?.off('user_status_response', handleStatusResponse);
      socket.current?.off('online_status_changed', handleOnlineStatusChanged);
      clearInterval(activityInterval.current);
      clearTimeout(backgroundTimer.current);
      appStateSub.remove();
      netInfoUnsub();
    };
  }, [
    token,
    userId,
    emitOnline,
    emitOffline,
    emitActivity,
    fetchInitialStatus,
    handleStatusResponse,
    handleOnlineStatusChanged,
  ]);

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
