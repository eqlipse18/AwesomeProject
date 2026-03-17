import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Config from 'react-native-config';

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const createApiClient = token =>
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

export function useDailyFeed({ token }) {
  const [profiles, setProfiles] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) apiClient.current = createApiClient(token);
  }, [token]);

  const fetchDailyFeed = useCallback(async () => {
    if (!apiClient.current) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await apiClient.current.get('/daily-feed');
      if (!resp.data.success) throw new Error(resp.data.error);
      setProfiles(resp.data.profiles || []);
      setUnseenCount(resp.data.unseenCount || 0);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchDailyFeed();
  }, [token, fetchDailyFeed]);

  const markSeen = useCallback(async seenUserId => {
    if (!apiClient.current || !seenUserId) return;
    try {
      const resp = await apiClient.current.post('/daily-feed/seen', {
        seenUserId,
      });
      if (resp.data.success) setUnseenCount(resp.data.unseenCount);
    } catch (err) {
      console.error('[useDailyFeed] markSeen error:', err.message);
    }
  }, []);

  return {
    profiles,
    unseenCount,
    loading,
    error,
    refetch: fetchDailyFeed,
    markSeen,
  };
}
