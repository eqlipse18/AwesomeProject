/**
 * Premium System Hooks for React Native
 *
 * - useSubscription: Get subscription status
 * - useLikes: Get sent/received likes
 * - useMatchRequests: Get pending SUPERLIKE requests
 * - usePremiumFeatures: Feature availability based on subscription
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://192.168.100.154:9000';

const createApiClient = token => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
};

// ════════════════════════════════════════════════════════════════════════════
// 1. useSubscription - Get subscription status
// ════════════════════════════════════════════════════════════════════════════

export function useSubscription({ token }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  const fetchSubscription = useCallback(async () => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.current.get('/subscription-status');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch subscription');
      }

      setSubscription(response.data.subscription);
      return response.data.subscription;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[useSubscription] Error:', errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchSubscription();
    }
  }, [token, fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    isPremium: subscription?.isPremium || false,
    subscriptionType: subscription?.type || null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 2. useCreateSubscription - Create/upgrade subscription
// ════════════════════════════════════════════════════════════════════════════

export function useCreateSubscription({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  const subscribe = useCallback(async planType => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return null;
    }

    if (!['Plus', 'Ultra'].includes(planType)) {
      setError('Invalid plan type');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.current.post('/subscribe', {
        planType,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create subscription');
      }

      return {
        success: true,
        subscription: response.data.subscription,
        message: response.data.message,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[useCreateSubscription] Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    subscribe,
    loading,
    error,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. useLikes - Get sent and received likes
// ════════════════════════════════════════════════════════════════════════════

export function useLikes({ token }) {
  const [sentLikes, setSentLikes] = useState([]);
  const [receivedLikes, setReceivedLikes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) apiClient.current = createApiClient(token);
  }, [token]);

  const fetchSentLikes = useCallback(async () => {
    if (!apiClient.current) return;
    try {
      const response = await apiClient.current.get('/likes/sent');
      if (response.data.success) setSentLikes(response.data.likes || []);
      return response.data.likes;
    } catch (err) {
      console.error('[useLikes/sent]', err.message);
      return [];
    }
  }, []);

  const fetchReceivedLikes = useCallback(async () => {
    if (!apiClient.current) return;
    try {
      const response = await apiClient.current.get('/likes/received');
      if (response.data.success) {
        setReceivedLikes(response.data.likes || []);
        setIsBlurred(response.data.blurred || false);
      }
      return response.data;
    } catch (err) {
      console.error('[useLikes/received]', err.message);
      return { likes: [], blurred: true };
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!apiClient.current) return;
    try {
      const response = await apiClient.current.get('/likes/stats');
      if (response.data.success) setStats(response.data.stats);
      return response.data.stats;
    } catch (err) {
      console.error('[useLikes/stats]', err.message);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchSentLikes(), fetchReceivedLikes(), fetchStats()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchSentLikes, fetchReceivedLikes, fetchStats]);

  useEffect(() => {
    if (token) fetchAll();
  }, [token, fetchAll]);

  return {
    sentLikes,
    receivedLikes,
    stats,
    loading,
    error,
    isBlurred,
    refetchSent: fetchSentLikes,
    refetchReceived: fetchReceivedLikes,
    refetchStats: fetchStats,
    refetch: fetchAll,
    sentCount: sentLikes.length,
    receivedCount: receivedLikes.length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. useMatchRequests - Get and manage SUPERLIKE requests
// ════════════════════════════════════════════════════════════════════════════

export function useMatchRequests({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  const fetchPendingRequests = useCallback(async () => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.current.get('/match-requests/pending');

      if (!response.data.success) {
        throw new Error(
          response.data.error || 'Failed to fetch match requests',
        );
      }

      setRequests(response.data.requests || []);
      return response.data.requests;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[useMatchRequests] Error:', errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptRequest = useCallback(async requestId => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return null;
    }

    try {
      setError(null);

      const response = await apiClient.current.post('/match-request/accept', {
        requestId,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to accept request');
      }

      // Remove from pending list
      setRequests(prev => prev.filter(r => r.requestId !== requestId));

      return {
        success: true,
        matchId: response.data.matchId,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[acceptRequest] Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }, []);

  const rejectRequest = useCallback(async requestId => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return null;
    }

    try {
      setError(null);

      const response = await apiClient.current.post('/match-request/reject', {
        requestId,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to reject request');
      }

      // Remove from pending list (will auto-delete after 24h)
      setRequests(prev => prev.filter(r => r.requestId !== requestId));

      return {
        success: true,
        message: response.data.message,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[rejectRequest] Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchPendingRequests();
    }
  }, [token, fetchPendingRequests]);

  return {
    requests,
    loading,
    error,
    refetch: fetchPendingRequests,
    acceptRequest,
    rejectRequest,
    pendingCount: requests.length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. usePremiumFeatures - Check if feature is available
// ════════════════════════════════════════════════════════════════════════════

export function usePremiumFeatures({ subscription, usage }) {
  const [features, setFeatures] = useState({
    canSuperlike: false,
    canRewind: false,
    canSendMessageRequest: false,
    canViewReceivedLikes: false,
  });

  useEffect(() => {
    if (!subscription?.isPremium) {
      setFeatures({
        canSuperlike: false,
        canRewind: false,
        canSendMessageRequest: false,
        canViewReceivedLikes: false,
      });
      return;
    }

    // Premium user - check daily limits
    const canSuperlike =
      subscription.type === 'Plus' ? usage?.superlikes?.remaining > 0 : true; // Ultra: unlimited
    const canRewind =
      subscription.type === 'Plus' ? usage?.rewinds?.remaining > 0 : true; // Ultra: unlimited

    setFeatures({
      canSuperlike,
      canRewind,
      canSendMessageRequest: true,
      canViewReceivedLikes: true,
    });
  }, [subscription, usage]);

  return features;
}

// ════════════════════════════════════════════════════════════════════════════
// 6. useSuperlike - Send SUPERLIKE with all checks
// ════════════════════════════════════════════════════════════════════════════

export function useSuperlike({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  const superlike = useCallback(async likedId => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.current.post('/superlike', {
        likedId,
      });

      if (!response.data.success) {
        // Check if it's a premium or limit error
        if (response.data.requiresPremium) {
          return {
            success: false,
            requiresPremium: true,
            error: response.data.error,
          };
        }

        if (response.data.limitReached) {
          return {
            success: false,
            limitReached: true,
            error: response.data.error,
          };
        }

        throw new Error(response.data.error || 'Failed to send SUPERLIKE');
      }

      return {
        success: true,
        match: response.data.match,
        matchId: response.data.matchId,
        requestId: response.data.requestId,
        usage: response.data.usage,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[useSuperlike] Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    superlike,
    loading,
    error,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 7. useRewind - Rewind with limit check
// ════════════════════════════════════════════════════════════════════════════

export function useRewind({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiClient = useRef(null);

  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  const rewind = useCallback(async () => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.current.post('/rewind');

      if (!response.data.success) {
        if (response.data.requiresPremium) {
          return {
            success: false,
            requiresPremium: true,
            error: response.data.error,
          };
        }

        if (response.data.limitReached) {
          return {
            success: false,
            limitReached: true,
            error: response.data.error,
          };
        }

        throw new Error(response.data.error || 'Failed to rewind');
      }

      return {
        success: true,
        usage: response.data.usage,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[useRewind] Error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rewind,
    loading,
    error,
  };
}

export default {
  useSubscription,
  useCreateSubscription,
  useLikes,
  useMatchRequests,
  usePremiumFeatures,
  useSuperlike,
  useRewind,
};
