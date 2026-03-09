/**
 * useSwipeStack Hook - Frontend Integration
 *
 * Manages:
 * - Fetching feed from backend
 * - Sending swipes (like/superlike/pass)
 * - Detecting matches
 * - Pagination and caching
 * - Error handling
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Configure your API base URL here
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://192.168.100.154:9000';

// Create axios instance with auth header
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

/**
 * Custom Hook for Swipeable Stack with Backend Integration
 *
 * Usage:
 * const swipeStack = useSwipeStack({
 *   token: userToken,
 *   filters: { minAge: 18, maxAge: 35, gender: 'Women', hometown: 'Kathmandu' }
 * });
 *
 * // In component:
 * swipeStack.handleSwipe(userId, 'like')  // or 'superlike' or 'pass'
 * swipeStack.refetchFeed()                // refresh feed
 * swipeStack.loadMore()                   // pagination
 */
export function useSwipeStack({ token, filters = {} }) {
  // State management
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  // Match notifications
  const [matchData, setMatchData] = useState(null);
  const [showMatchNotification, setShowMatchNotification] = useState(false);

  // Track loaded users to prevent duplicates
  const loadedUserIds = useRef(new Set());
  const apiClient = useRef(null);

  // Initialize API client when token changes
  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  /**
   * Fetch feed from backend
   */
  const fetchFeed = useCallback(
    async (cursor = null) => {
      if (!apiClient.current) {
        setError('Not authenticated');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = {
          limit: 10,
          ...filters,
          ...(cursor && { cursor }),
        };

        const response = await apiClient.current.get('/feed', { params });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to fetch feed');
        }

        const newUsers = response.data.users || [];

        // Only add users we haven't loaded yet
        const uniqueUsers = newUsers.filter(
          user => !loadedUserIds.current.has(user.userId),
        );

        // Track new user IDs
        uniqueUsers.forEach(user => loadedUserIds.current.add(user.userId));

        // Update feed
        setFeed(prev => {
          // If no cursor (first load), replace entire feed
          if (!cursor) {
            return uniqueUsers;
          }
          // Otherwise, append to existing feed
          return [...prev, ...uniqueUsers];
        });

        // Store next cursor for pagination
        setNextCursor(response.data.nextCursor || null);

        return {
          success: true,
          count: uniqueUsers.length,
        };
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || err.message || 'Unknown error';
        setError(errorMsg);
        console.error('[useSwipeStack] Feed fetch error:', errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  /**
   * Initial feed load on mount
   */
  useEffect(() => {
    if (token && feed.length === 0) {
      fetchFeed();
    }
    // Don't include fetchFeed in deps to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * Refetch feed (reset pagination)
   */
  const refetchFeed = useCallback(async () => {
    loadedUserIds.current.clear();
    setFeed([]);
    setNextCursor(null);
    return fetchFeed();
  }, [fetchFeed]);

  /**
   * Load more users (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) {
      return { success: false, error: 'No more users or already loading' };
    }
    return fetchFeed(nextCursor);
  }, [nextCursor, loading, fetchFeed]);

  /**
   * Handle a swipe action
   * Sends to backend and detects matches
   */
  const handleSwipe = useCallback(async (likedId, type) => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    if (!['like', 'superlike', 'pass'].includes(type)) {
      setError('Invalid swipe type');
      return {
        success: false,
        error: 'Invalid swipe type',
      };
    }

    try {
      setError(null);

      const response = await apiClient.current.post('/swipe', {
        likedId,
        type,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to process swipe');
      }

      // Check if match detected
      if (response.data.match) {
        setMatchData({
          matchId: response.data.matchId,
          likedId: likedId, // ← Store the user we liked!
          type, // The type of swipe that created the match
        });
        setShowMatchNotification(true);

        // Auto-hide notification after 4 seconds
        setTimeout(() => {
          setShowMatchNotification(false);
        }, 4000);
      }

      return {
        success: true,
        match: response.data.match,
        matchId: response.data.matchId,
        likedId: likedId,
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[useSwipeStack] Swipe error:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }, []);

  /**
   * Dismiss match notification
   */
  const dismissMatch = useCallback(() => {
    setShowMatchNotification(false);
    setMatchData(null);
  }, []);

  /**
   * Update filter and refetch
   */
  const updateFilters = useCallback(
    newFilters => {
      // Filters will be used on next fetch
      return refetchFeed();
    },
    [refetchFeed],
  );

  return {
    // Data
    feed,
    loading,
    error,
    hasMore: !!nextCursor,

    // Actions
    fetchFeed,
    refetchFeed,
    loadMore,
    handleSwipe,
    updateFilters,

    // Match notifications
    matchData,
    showMatchNotification,
    dismissMatch,

    // Utils
    feedLength: feed.length,
    isInitialized: feed.length > 0 || loading,
  };
}

/**
 * Hook for fetching and managing matches
 */
export function useMatches({ token }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiClient = useRef(null);

  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  const fetchMatches = useCallback(async () => {
    if (!apiClient.current) {
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.current.get('/matches');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch matches');
      }

      setMatches(response.data.matches || []);
      return { success: true, count: response.data.matches?.length || 0 };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('[useMatches] Error:', errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMatches();
    }
  }, [token, fetchMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
    count: matches.length,
  };
}
