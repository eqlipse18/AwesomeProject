/**
 * useSwipeStack Hook - FINAL OPTIMIZED VERSION
 *
 * Features:
 * - Load 20 cards initially
 * - Silent background load at card 12 (10 more cards)
 * - Repeat every 10 cards
 * - ZERO visible loading during swipes
 * - Smart pagination
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

/**
 * Custom Hook for Swipeable Stack
 * Smart pagination: 20 initial, then 10 more at card 12, repeats every 10
 */
export function useSwipeStack({ token, filters = {} }) {
  // State management
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Match notifications
  const [matchData, setMatchData] = useState(null);
  const [showMatchNotification, setShowMatchNotification] = useState(false);

  // Track state
  const loadedUserIds = useRef(new Set());
  const apiClient = useRef(null);
  const isLoadingMore = useRef(false);
  const currentIndex = useRef(0);

  useEffect(() => {
    if (token) {
      apiClient.current = createApiClient(token);
    }
  }, [token]);

  /**
   * Fetch feed from backend
   * @param {string} cursor - Pagination cursor (null for initial load)
   * @param {boolean} isInitial - Is this the initial 20-card load?
   */
  const fetchFeed = useCallback(
    async (cursor = null, isInitial = false) => {
      if (!apiClient.current) {
        setError('Not authenticated');
        return;
      }

      try {
        // Only show loading on initial fetch
        if (isInitial) {
          setLoading(true);
        }

        setError(null);

        const limit = isInitial ? 20 : 10; // 20 for initial, 10 for pagination

        const params = {
          limit,
          ...filters,
          ...(cursor && { cursor }),
        };

        console.log('[useSwipeStack] Fetching', limit, 'cards...', {
          isInitial,
          cursor,
        });

        const response = await apiClient.current.get('/feed', { params });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to fetch feed');
        }

        const newUsers = response.data.users || [];

        // Filter out duplicates
        const uniqueUsers = newUsers.filter(
          user => !loadedUserIds.current.has(user.userId),
        );

        // Track new user IDs
        uniqueUsers.forEach(user => loadedUserIds.current.add(user.userId));

        // Update feed
        setFeed(prev => {
          const updated = !cursor ? uniqueUsers : [...prev, ...uniqueUsers];
          console.log(
            '[useSwipeStack] Feed updated. Total cards:',
            updated.length,
          );
          return updated;
        });

        // Store next cursor for pagination
        setNextCursor(response.data.nextCursor || null);

        // Mark initial load complete
        if (isInitial) {
          setIsInitialLoading(false);
        }

        return {
          success: true,
          count: uniqueUsers.length,
        };
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || err.message || 'Unknown error';
        setError(errorMsg);
        console.error('[useSwipeStack] Fetch error:', errorMsg);
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
   * Initial load - 20 cards with loading indicator
   */
  useEffect(() => {
    if (token && feed.length === 0) {
      fetchFeed(null, true); // isInitial = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * Silent background load when reaching card 12, 22, 32, etc.
   */
  const checkAndLoadMore = useCallback(
    index => {
      currentIndex.current = index;

      // Check if we need to load more (at card 12, 22, 32, etc.)
      const shouldLoadMore =
        (index === 12 || (index - 2) % 10 === 0) && // Card 12, then every 10 after
        !isLoadingMore.current && // Not already loading
        nextCursor; // Has more cursor

      if (shouldLoadMore) {
        console.log('[useSwipeStack] 📦 Silent loading at card', index + 1);
        isLoadingMore.current = true;

        // Load in background (no loading indicator)
        fetchFeed(nextCursor, false).finally(() => {
          isLoadingMore.current = false;
        });
      }
    },
    [nextCursor, fetchFeed],
  );

  /**
   * Refetch feed (reset)
   */
  const refetchFeed = useCallback(async () => {
    loadedUserIds.current.clear();
    setFeed([]);
    setNextCursor(null);
    setIsInitialLoading(true);
    currentIndex.current = 0;
    return fetchFeed(null, true);
  }, [fetchFeed]);

  /**
   * Handle swipe - check if need to load more
   */
  const handleSwipe = useCallback(
    async (likedId, type) => {
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

        // After swipe, check if we need to load more (for next index)
        checkAndLoadMore(currentIndex.current + 1);

        // Match detected
        if (response.data.match) {
          setMatchData({
            matchId: response.data.matchId,
            likedId: likedId,
            type,
          });
          setShowMatchNotification(true);

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
    },
    [checkAndLoadMore],
  );

  /**
   * Dismiss match notification
   */
  const dismissMatch = useCallback(() => {
    setShowMatchNotification(false);
    setMatchData(null);
  }, []);

  /**
   * Update filters and refetch
   */
  const updateFilters = useCallback(
    newFilters => {
      return refetchFeed();
    },
    [refetchFeed],
  );

  return {
    // Data
    feed,
    loading, // Only true during initial load
    error,
    isInitialLoading, // Better for UI check
    hasMore: !!nextCursor,

    // Actions
    fetchFeed,
    refetchFeed,
    handleSwipe,
    updateFilters,
    checkAndLoadMore,

    // Match notifications
    matchData,
    showMatchNotification,
    dismissMatch,

    // Utils
    feedLength: feed.length,
    isInitialized: feed.length > 0,
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
